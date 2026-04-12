"""
AI Service Layer - Handles all Google Gemini API interactions
"""
import os
import json
import asyncio
import time
import requests
from typing import Optional, List, Dict, Any
import pandas as pd

# Gemini 1.x IDs are removed from the consumer API (404 on generateContent). Map to current models.
_GEMINI_MODEL_ALIASES = {
    "gemini-1.5-flash-8b": "gemini-2.5-flash",
    "gemini-1.5-flash": "gemini-2.5-flash",
    "gemini-1.5-flash-latest": "gemini-2.5-flash",
    "gemini-1.5-flash-001": "gemini-2.5-flash",
    "gemini-1.5-flash-002": "gemini-2.5-flash",
    "gemini-1.5-pro": "gemini-2.5-flash",
    "gemini-1.5-pro-latest": "gemini-2.5-flash",
    "gemini-1.0-pro": "gemini-2.5-flash",
}


def _resolve_gemini_model(name: str) -> str:
    n = (name or "").strip()
    return _GEMINI_MODEL_ALIASES.get(n, n)


class AIService:
    """Service for AI-powered analysis using Google Gemini"""
    
    def __init__(self, api_key: str = ""):
        """Initialize AI service with Gemini API"""
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")).strip()
        self.demo_mode = not self.api_key  # Enable demo mode if no key
        
        # Prefer a current default; override with GEMINI_MODEL or comma-separated GEMINI_MODEL_FALLBACKS
        self.model_name = _resolve_gemini_model(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
        
        # Cache and rate limiting
        self.response_cache = {}
        self.last_request_time = 0
        self.chat_history = []
        
        if self.demo_mode:
            print("[v0] WARNING: No API key found. Running in DEMO MODE with sample responses.")
        else:
            print(f"[v0] OK: Gemini API configured (model={self.model_name})")
    

    def _gemini_url(self, model_name: str) -> str:
        return (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={self.api_key}"
        )

    def _model_fallback_chain(self) -> List[str]:
        extra = os.getenv("GEMINI_MODEL_FALLBACKS", "")
        extras = [_resolve_gemini_model(m) for m in extra.split(",") if m.strip()]
        # Only 2.x / 3.x — 1.5* returns 404 on current Gemini API for many keys
        defaults = [
            self.model_name,
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-001",
            "gemini-3-flash-preview",
        ]
        ordered: List[str] = []
        seen: set[str] = set()
        for m in defaults + extras:
            m = _resolve_gemini_model(m)
            if m not in seen:
                seen.add(m)
                ordered.append(m)
        return ordered

    @staticmethod
    def _merge_system_into_contents(
        system_instruction: str, contents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not contents:
            return [{"role": "user", "parts": [{"text": system_instruction}]}]
        first = contents[0]
        if first.get("role") == "user":
            parts = first.get("parts") or [{"text": ""}]
            user_text = parts[0].get("text", "") if parts else ""
            merged = f"{system_instruction}\n\n---\n\n{user_text}"
            return [{"role": "user", "parts": [{"text": merged}]}] + list(contents[1:])
        return [{"role": "user", "parts": [{"text": system_instruction}]}] + list(contents)

    def _parse_generate_content_response(self, result_data: Dict[str, Any]) -> str:
        pf = result_data.get("promptFeedback") or {}
        block = pf.get("blockReason")
        if block:
            raise ValueError(
                f"Prompt was blocked ({block}). Try a smaller file, fewer columns in preview, or a different question."
            )
        cands = result_data.get("candidates") or []
        if not cands:
            raise RuntimeError(f"No candidates in Gemini response: {json.dumps(result_data)[:500]}")
        cand = cands[0]
        reason = cand.get("finishReason")
        parts = (cand.get("content") or {}).get("parts") or []
        if parts and parts[0].get("text"):
            return str(parts[0]["text"]).strip()
        if reason == "SAFETY":
            raise ValueError("Response blocked by safety filters. Try rephrasing your question.")
        if reason == "MAX_TOKENS":
            raise RuntimeError("Model returned no text (MAX_TOKENS). Try a shorter question.")
        raise RuntimeError(f"Unexpected Gemini candidate (finishReason={reason}): {json.dumps(cand)[:400]}")

    def _gemini_generate(
        self,
        *,
        system_instruction: str,
        contents: List[Dict[str, Any]],
        max_output_tokens: int = 2048,
        temperature: float = 0.4,
    ) -> str:
        """REST generateContent with model fallbacks and retry without systemInstruction."""
        gen_cfg = {
            "temperature": temperature,
            "topP": 0.95,
            "maxOutputTokens": max_output_tokens,
        }
        last_detail = ""
        for model_name in self._model_fallback_chain():
            url = self._gemini_url(model_name)
            for use_sys in (True, False):
                if use_sys:
                    body: Dict[str, Any] = {
                        "systemInstruction": {"parts": [{"text": system_instruction}]},
                        "contents": contents,
                        "generationConfig": gen_cfg,
                    }
                else:
                    body = {
                        "contents": self._merge_system_into_contents(system_instruction, contents),
                        "generationConfig": gen_cfg,
                    }
                try:
                    response = requests.post(
                        url,
                        json=body,
                        timeout=90,
                        headers={"Content-Type": "application/json"},
                    )
                except requests.exceptions.Timeout:
                    raise ValueError("API request timed out. Please try again.")
                except requests.exceptions.RequestException as e:
                    raise ValueError(f"Network error: {str(e)[:200]}")

                if response.status_code == 429:
                    # Quota is often per-model; try fallbacks instead of stopping on first 429
                    err_snip = response.text[:500]
                    last_detail = f"[{model_name}, systemInstruction={use_sys}] HTTP 429: {err_snip[:320]}"
                    print(f"[v0] Gemini 429 on {model_name}; trying next model if available.")
                    break
                if response.status_code in (401, 403):
                    raise RuntimeError(
                        "Gemini rejected the API key (401/403). Set GEMINI_API_KEY or GOOGLE_API_KEY in api/.env or .env.local."
                    )

                if response.status_code == 200:
                    return self._parse_generate_content_response(response.json())

                err_snip = response.text[:900]
                last_detail = f"[{model_name}, systemInstruction={use_sys}] HTTP {response.status_code}: {err_snip[:420]}"
                print(f"[v0] Gemini attempt failed: {last_detail[:500]}")

                if response.status_code == 404:
                    break
                if response.status_code == 400 and use_sys:
                    continue
                break

        raise RuntimeError(last_detail or "Gemini generateContent failed (no response detail).")

    def _get_demo_response(self, message: str) -> str:
        """Generate a demo response based on message keywords"""
        demo_responses = {
            "trend": "📈 The data shows a positive upward trend. Sales have increased by 15-20% over the period analyzed.",
            "insight": "💡 Key insight: Your top-performing segment accounts for 40% of revenue. Consider focusing marketing efforts on this area.",
            "recommend": "✅ Recommendation: Implement quarterly reviews to identify emerging trends early. This can help you stay ahead of market changes.",
            "summary": "📊 Data Summary: Your dataset contains strong patterns with clear growth indicators. The data quality is good with minimal missing values.",
            "default": "📋 Analysis: Your data shows consistent patterns. Would you like me to focus on a specific metric or time period?"
        }
        
        # Pick response based on keywords in message
        response = demo_responses["default"]
        msg_lower = message.lower()
        for keyword, resp in demo_responses.items():
            if keyword in msg_lower:
                response = resp
                break
        
        return response
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Process chat message and return AI response
        
        Args:
            message: User message
            conversation_history: Previous messages in conversation
            context: Additional context (dataset info, etc)
        
        Returns:
            AI response string
        """
        try:
            ds_id = ""
            if context and isinstance(context, dict):
                info = context.get("dataset_info") or {}
                ds_id = str(info.get("dataset_id", "") or "")

            cache_key = f"chat_{ds_id}_{message[:80].lower()}"
            if cache_key in self.response_cache:
                print(f"[v0] Returning cached response")
                return self.response_cache[cache_key]

            if self.demo_mode:
                print(f"[v0] Demo mode: Returning sample response")
                response = self._get_demo_response(message)
                self.response_cache[cache_key] = response
                return response

            time_since_last = time.time() - self.last_request_time if hasattr(self, "last_request_time") else 2
            if time_since_last < 1:
                await asyncio.sleep(1 - time_since_last)

            system_parts = [
                "You are an expert data analyst. The user uploaded a spreadsheet.",
                "Answer ONLY using the dataset described below. Quote numbers, column names, and patterns you see.",
                "If the preview is insufficient for a precise answer, say what is missing and suggest a follow-up question.",
                "Be concise but specific.",
            ]
            if context and isinstance(context, dict) and context.get("dataset_info"):
                info = context["dataset_info"]
                cols = info.get("column_info") or []
                col_lines = []
                for c in cols[:40]:
                    if isinstance(c, dict):
                        col_lines.append(
                            f"- {c.get('name')} ({c.get('dtype')}): nulls={c.get('null_count')}, "
                            f"unique~{c.get('unique_count')}, samples={c.get('sample_values')}"
                        )
                system_parts.append(
                    f"\nDataset file: {info.get('filename')}\n"
                    f"Rows: {info.get('rows')}, Columns: {info.get('columns')}\n"
                    f"Column overview:\n" + "\n".join(col_lines)
                )
            if context and isinstance(context, dict) and context.get("dataset_preview"):
                system_parts.append("\nData excerpt and summaries:\n" + str(context["dataset_preview"]))

            system_instruction = "\n".join(system_parts)

            contents: List[Dict[str, Any]] = []
            if conversation_history:
                for msg in conversation_history:
                    role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else "user")
                    content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "")
                    if not (content or "").strip():
                        continue
                    gemini_role = "model" if role in ("assistant", "model") else "user"
                    contents.append({"role": gemini_role, "parts": [{"text": str(content)}]})

            contents.append({"role": "user", "parts": [{"text": message}]})

            print(f"[v0] Calling Gemini ({self.model_name})...")
            try:
                text = await asyncio.to_thread(
                    self._gemini_generate,
                    system_instruction=system_instruction,
                    contents=contents,
                    max_output_tokens=2048,
                    temperature=0.35,
                )
            except requests.exceptions.Timeout:
                print("[v0] API request timed out")
                raise ValueError("API request timed out. Please try again.")
            except requests.exceptions.RequestException as e:
                print(f"[v0] Network error: {str(e)[:100]}")
                raise ValueError(f"Network error: {str(e)[:100]}")

            print(f"[v0] Got API response: {text[:120]}...")
            self.response_cache[cache_key] = text
            self.last_request_time = time.time()
            return text

        except Exception as e:
            print(f"[v0] Chat error: {str(e)[:200]}")
            if self.demo_mode:
                return self._get_demo_response(message)
            raise

    def _strip_json_fence(self, raw: str) -> str:
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return text

    async def generate_follow_up_questions(
        self, user_message: str, assistant_reply: str
    ) -> List[str]:
        """Return 2-3 short follow-up questions related to the last exchange."""
        reply_excerpt = (assistant_reply or "")[:2500]
        if self.demo_mode:
            return [
                "Can you break this down with specific numbers from the dataset?",
                "Which columns drive this pattern the most?",
            ]

        prompt = (
            "Given this user question and the assistant's answer about a spreadsheet dataset, "
            "propose 2 or 3 short follow-up questions the user might ask next to go deeper. "
            "Questions must be specific to the topic discussed, not generic. "
            "Reply with a JSON array of strings only (length 2 or 3), no markdown.\n\n"
            f"User question: {user_message}\n\nAssistant answer (excerpt):\n{reply_excerpt}"
        )
        try:
            time_since_last = time.time() - getattr(self, "last_request_time", 0)
            if time_since_last < 1:
                await asyncio.sleep(1 - time_since_last)
            text = await asyncio.to_thread(
                self._gemini_generate,
                system_instruction=(
                    "You output only valid JSON: an array of 2 or 3 strings. "
                    "Each string is one concise question (under 120 characters)."
                ),
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                max_output_tokens=256,
                temperature=0.55,
            )
            raw = self._strip_json_fence(text)
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                out = [str(x).strip() for x in parsed if str(x).strip()]
                self.last_request_time = time.time()
                return out[:3]
        except Exception as e:
            print(f"[v0] Follow-up generation failed: {str(e)[:200]}")
        return [
            "What specific metrics in the data support this?",
            "How does this compare across groups or categories in the dataset?",
            "What caveats or data quality issues affect this conclusion?",
        ]

    
    async def analyze_dataset(
        self,
        dataset: pd.DataFrame,
        analysis_type: str = "comprehensive",
        focus_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Perform AI-powered analysis on dataset
        
        Args:
            dataset: Pandas DataFrame
            analysis_type: Type of analysis (comprehensive, statistical, trend, anomaly)
            focus_areas: Specific columns to focus on
        
        Returns:
            Analysis results dictionary
        """
        try:
            # Prepare dataset summary
            # Convert describe output to native Python types for proper JSON serialization
            basic_stats = {}
            try:
                desc = dataset.describe(include='all').to_dict()
                for col, stats in desc.items():
                    basic_stats[col] = {}
                    for k, v in stats.items():
                        try:
                            if hasattr(v, 'item') and pd.notna(v):  # numpy scalar
                                basic_stats[col][k] = v.item()
                            elif not isinstance(v, float) or not pd.isna(float(v)):
                                basic_stats[col][k] = v
                        except (ValueError, TypeError):
                            pass
            except Exception as e:
                print(f"[v0] Warning: Could not generate basic stats: {str(e)}")
                basic_stats = {"error": str(e)}
            
            # Get missing values
            missing = {}
            try:
                for col in dataset.columns:
                    missing[col] = int(dataset[col].isnull().sum())
            except Exception as e:
                print(f"[v0] Warning: Could not calculate missing values: {str(e)}")
            
            dataset_summary = {
                "shape": {"rows": int(dataset.shape[0]), "columns": int(dataset.shape[1])},
                "columns": list(dataset.columns)[:20],  # Limit columns for prompt
                "dtypes": {col: str(dtype) for col, dtype in dataset.dtypes.items()},
                "basic_stats": basic_stats,
                "missing_values": missing,
            }
            
            # If focus areas specified, include their detailed stats
            if focus_areas and isinstance(focus_areas, (list, tuple)) and len(focus_areas) > 0:
                try:
                    # Filter to only existing columns
                    valid_focus_areas = [col for col in focus_areas if col in dataset.columns]
                    if valid_focus_areas:
                        focus_data = dataset[valid_focus_areas].describe(include='all').to_dict()
                        dataset_summary["focus_stats"] = {}
                        for col, stats in focus_data.items():
                            dataset_summary["focus_stats"][col] = {}
                            for k, v in stats.items():
                                try:
                                    if hasattr(v, 'item') and pd.notna(v):
                                        dataset_summary["focus_stats"][col][k] = v.item()
                                    elif not isinstance(v, float) or not pd.isna(float(v)):
                                        dataset_summary["focus_stats"][col][k] = v
                                except (ValueError, TypeError):
                                    pass
                except Exception as e:
                    print(f"[v0] Warning: Could not generate focus stats: {str(e)}")
            
            # Create simplified analysis prompt to reduce tokens
            prompt = f"""Analyze this data briefly:
{json.dumps(dataset_summary, default=str)}

Key insights, trends, and recommendations (keep response under 200 words):"""
            
            # Get AI analysis with error handling
            try:
                # DEMO MODE: Return sample analysis if no API key
                if self.demo_mode:
                    print(f"[v0] Demo mode: Returning sample analysis")
                    dataset_stats = dataset.describe(include='all')
                    return {
                        "insights": f"📊 Dataset Analysis: Your data contains {len(dataset)} rows and {len(dataset.columns)} columns. "
                                   f"The data shows good quality with most columns having complete information.",
                        "trends": [
                            "✓ Positive growth trend detected in numeric columns",
                            "✓ Even distribution across categories",
                            "✓ No extreme outliers detected"
                        ],
                        "anomalies": [
                            "• No significant anomalies found"
                        ],
                        "recommendations": [
                            "1. Consider segmenting data by category for deeper insights",
                            "2. Monitor the identified metrics regularly for changes",
                            "3. Create baseline metrics for future comparisons"
                        ]
                    }
                
                # Rate limiting check
                time_since_last = time.time() - self.last_request_time if hasattr(self, 'last_request_time') else 2
                if time_since_last < 1:
                    await asyncio.sleep(1 - time_since_last)
                
                text = await asyncio.to_thread(
                    self._gemini_generate,
                    system_instruction=(
                        "You are a business data analyst. Reply with one JSON object only, "
                        "keys: insights (string), trends (string array), anomalies (string array), "
                        "recommendations (string array). No markdown fences."
                    ),
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                    max_output_tokens=2048,
                    temperature=0.35,
                )
                raw = text.strip()
                if raw.startswith("```"):
                    lines = raw.split("\n")
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    raw = "\n".join(lines).strip()
                try:
                    analysis = json.loads(raw)
                except json.JSONDecodeError:
                    analysis = {
                        "insights": text[:800],
                        "trends": ["See insights above"],
                        "anomalies": [],
                        "recommendations": ["Review full analysis above"],
                    }
                
                self.last_request_time = time.time()
                return analysis
            except Exception as api_error:
                error_msg = str(api_error)
                if "429" in error_msg or "quota" in error_msg.lower():
                    print(f"[v0] API quota exceeded during analysis")
                    return {
                        "insights": "API quota exceeded. Please wait a few minutes before retrying.",
                        "trends": [],
                        "anomalies": [],
                        "recommendations": ["Upgrade API plan for better limits"],
                    }
                else:
                    raise
        except Exception as e:
            print(f"[v0] Dataset analysis error: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return partial results instead of failing completely
            return {
                "insights": f"Analysis failed: {str(e)[:100]}",
                "trends": [],
                "anomalies": [],
                "recommendations": []
            }
    
    def _compare_datasets_fallback(
        self,
        dataset1: pd.DataFrame,
        dataset2: pd.DataFrame,
        stats1: Dict[str, Any],
        stats2: Dict[str, Any],
        err: BaseException,
    ) -> Dict[str, Any]:
        """Structured comparison text when Gemini is unavailable; UI still shows snapshot/charts."""
        r1, c1 = dataset1.shape
        r2, c2 = dataset2.shape
        n1 = len(dataset1.select_dtypes(include=["number"]).columns)
        n2 = len(dataset2.select_dtypes(include=["number"]).columns)
        shared_numeric = sorted(set((stats1 or {}).keys()) & set((stats2 or {}).keys()))
        err_hint = str(err).replace("\n", " ").strip()[:200]
        differences = [
            f"Dataset 1 has {r1:,} rows and {c1} columns; dataset 2 has {r2:,} rows and {c2} columns.",
            f"Numeric columns: {n1} vs {n2}.",
        ]
        if shared_numeric:
            differences.append(
                f"Overlapping numeric fields in describe(): {', '.join(shared_numeric[:12])}"
                + ("…" if len(shared_numeric) > 12 else "")
            )
        similarities = []
        if shared_numeric:
            similarities.append(
                f"Both datasets expose comparable summary stats for: {', '.join(shared_numeric[:8])}."
            )
        else:
            similarities.append("Compare column names and row counts using the schema section above.")
        return {
            "differences": differences,
            "similarities": similarities,
            "performance": "AI ranking unavailable; use the numeric comparison table and charts.",
            "insights": (
                "Gemini could not complete this comparison. Check GEMINI_MODEL (e.g. gemini-2.0-flash) and quota. "
                f"Detail: {err_hint}"
            ),
        }

    async def compare_datasets(
        self,
        dataset1: pd.DataFrame,
        dataset2: pd.DataFrame,
        metrics: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Compare two datasets
        
        Args:
            dataset1: First DataFrame
            dataset2: Second DataFrame
            metrics: Specific metrics to compare
        
        Returns:
            Comparison results
        """
        try:
            if self.demo_mode:
                return {
                    "differences": ["Demo mode: configure GEMINI_API_KEY for AI comparison."],
                    "similarities": [],
                    "performance": "unknown",
                    "insights": "Upload data and set GEMINI_API_KEY to enable comparisons.",
                }

            stats1 = dataset1.describe().to_dict()
            stats2 = dataset2.describe().to_dict()

            prompt = f"""
            Compare these two datasets:
            
            Dataset 1 Statistics:
            {json.dumps(stats1, default=str)}
            
            Dataset 2 Statistics:
            {json.dumps(stats2, default=str)}
            
            Provide:
            1. Key differences
            2. Similarities
            3. Which dataset performs better on key metrics
            4. Insights from comparison
            
            Format as JSON with keys: differences, similarities, performance, insights
            """

            try:
                text = await asyncio.to_thread(
                    self._gemini_generate,
                    system_instruction="Reply with JSON only. Keys: differences, similarities, performance, insights.",
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                    max_output_tokens=2048,
                    temperature=0.35,
                )
                raw = text.strip()
                if raw.startswith("```"):
                    lines = raw.split("\n")
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    raw = "\n".join(lines).strip()
                try:
                    comparison = json.loads(raw)
                except json.JSONDecodeError:
                    comparison = {
                        "comparison": text,
                        "differences": [],
                        "similarities": [],
                    }

                return comparison
            except Exception as gen_err:
                print(f"[v0] Gemini compare failed, using structural fallback: {gen_err}")
                return self._compare_datasets_fallback(dataset1, dataset2, stats1, stats2, gen_err)

        except Exception as e:
            print(f"[v0] Dataset comparison error: {str(e)}")
            raise
    
    async def analyze_kpis(
        self,
        dataset: pd.DataFrame,
        kpi_definitions: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Analyze Key Performance Indicators
        
        Args:
            dataset: DataFrame to analyze
            kpi_definitions: List of KPI definitions
        
        Returns:
            List of KPI metrics
        """
        try:
            kpis = []
            
            # Calculate basic KPIs
            numeric_cols = dataset.select_dtypes(include=['number']).columns
            
            for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
                values = dataset[col].dropna()
                if len(values) > 0:
                    kpis.append({
                        "name": f"{col} - Average",
                        "value": float(values.mean()),
                        "trend": "stable",
                        "description": f"Average of {col}",
                    })
                    kpis.append({
                        "name": f"{col} - Total",
                        "value": float(values.sum()),
                        "trend": "stable",
                        "description": f"Total of {col}",
                    })
            
            return kpis
        except Exception as e:
            print(f"[v0] KPI analysis error: {str(e)}")
            raise
    
    async def transcribe_audio(self, audio_content: bytes) -> str:
        """
        Transcribe audio to text
        Note: Full speech-to-text implementation would require additional setup
        """
        # Placeholder - would require proper audio API setup
        return "Voice transcription placeholder"
    
    async def synthesize_speech(self, text: str) -> str:
        """
        Synthesize text to speech
        Note: Full text-to-speech implementation would require additional setup
        """
        # Placeholder - would require proper audio API setup
        return "Voice synthesis placeholder"
