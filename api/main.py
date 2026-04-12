"""
FastAPI Application - AI Business Analyst API
Clean architecture with service layer, models, and routes
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

# Load env: root .env.local first, then api/.env wins (so backend key in api/.env is not overridden by stale .env.local)
_api_dir = Path(__file__).resolve().parent
_repo_root = _api_dir.parent
if (_repo_root / ".env.local").exists():
    load_dotenv(_repo_root / ".env.local")
load_dotenv(_api_dir / ".env", override=True)
import json

from services.ai_service import AIService
from services.data_service import DataService
from models.schemas import (
    ChatRequest,
    ChatResponse,
    AnalysisRequest,
    AnalysisResponse,
    DatasetInfo,
    ComparisonRequest,
    ComparisonResponse,
    KPIRequest,
    KPIResponse,
    VoiceRequest,
    VoiceResponse,
)

# Global service instances
ai_service = None
data_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for FastAPI app initialization and cleanup
    """
    global ai_service, data_service
    
    # Startup
    print("[v0] Initializing AI and Data services...")
    ai_service = AIService(api_key=(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip())
    data_service = DataService()
    print("[v0] Services initialized successfully")
    
    yield
    
    # Shutdown
    print("[v0] Shutting down services...")


# Initialize FastAPI app
app = FastAPI(
    title="Business Analyst API",
    description="AI-powered business data analysis and insights",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    # Wildcard + credentials=True is invalid per CORS spec and breaks cross-origin fetch from Next dev.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HEALTH CHECK
# ============================================================================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "ai_service": ai_service is not None,
            "data_service": data_service is not None,
        },
    }


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for conversational analysis
    Supports multi-turn conversations with context
    """
    if not ai_service:
        raise HTTPException(status_code=500, detail="AI service not initialized")
    
    try:
        # Include dataset context if dataset_id is provided
        context = request.context or {}
        if request.dataset_id and data_service:
            dataset_info = data_service.get_dataset_info(request.dataset_id)
            if dataset_info:
                context["dataset_info"] = dataset_info
                print(f"[v0] Including dataset context for {request.dataset_id}")
            preview = data_service.build_llm_dataset_context(request.dataset_id)
            if preview:
                context["dataset_preview"] = preview
                print(f"[v0] Included dataset preview for LLM ({len(preview)} chars)")
        
        # Get response from AI service
        response = await ai_service.chat(
            message=request.message,
            conversation_history=request.conversation_history,
            context=context if context else None,
        )

        follow_ups: Optional[List[str]] = None
        if request.generate_follow_ups:
            follow_ups = await ai_service.generate_follow_up_questions(
                request.message, response
            )
        
        return ChatResponse(
            response=response,
            success=True,
            follow_up_questions=follow_ups,
        )
    except Exception as e:
        error_str = str(e)
        print(f"[v0] Chat error: {error_str}")
        import traceback
        traceback.print_exc()
        
        # Only treat real quota / rate-limit errors as 429 (avoid substring "429" inside numbers like 1429)
        el = error_str.lower()
        is_quota = (
            "quota exceeded" in el
            or "exceeded your quota" in el
            or "resource exhausted" in el
            or "resource_exhausted" in el
            or "rate limit" in el
            or "too many requests" in el
            or "http 429" in el
            or "generativelanguage.googleapis.com" in el and " 429" in error_str
        )
        if is_quota:
            raise HTTPException(
                status_code=429,
                detail="API quota exceeded. Free tier limits reached. Please wait a few minutes or upgrade your API plan."
            )
        raise HTTPException(status_code=500, detail=error_str[:800])


# ============================================================================
# DATA ANALYSIS ENDPOINTS
# ============================================================================
@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload and parse a CSV/Excel dataset
    Returns dataset metadata and basic statistics
    """
    if not data_service:
        raise HTTPException(status_code=500, detail="Data service not initialized")
    
    try:
        # Read file content
        content = await file.read()
        
        print(f"[v0] Received file: {file.filename}, size: {len(content)} bytes")
        
        # Parse dataset
        dataset_id, info = await data_service.upload_dataset(
            filename=file.filename,
            content=content,
        )
        
        print(f"[v0] Successfully processed dataset: {dataset_id}")
        
        return {
            "dataset_id": dataset_id,
            "info": info,
            "success": True,
        }
    except Exception as e:
        print(f"[v0] Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/analyze-dataset", response_model=AnalysisResponse)
async def analyze_dataset(request: AnalysisRequest):
    """
    Perform AI-powered analysis on uploaded dataset
    Includes statistics, trends, and insights
    """
    if not ai_service or not data_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:
        # Get dataset
        dataset = data_service.get_dataset(request.dataset_id)
        if dataset is None:
            raise ValueError("Dataset not found")
        
        # Perform analysis
        analysis = await ai_service.analyze_dataset(
            dataset=dataset,
            analysis_type=request.analysis_type,
            focus_areas=request.focus_areas,
        )
        
        return AnalysisResponse(
            analysis=analysis,
            dataset_id=request.dataset_id,
            success=True,
        )
    except Exception as e:
        print(f"[v0] Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dataset-info/{dataset_id}", response_model=DatasetInfo)
async def get_dataset_info(dataset_id: str):
    """Get metadata and statistics about a dataset"""
    if not data_service:
        raise HTTPException(status_code=500, detail="Data service not initialized")
    
    try:
        info = data_service.get_dataset_info(dataset_id)
        if not info:
            raise ValueError("Dataset not found")
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/dataset-numeric-summary/{dataset_id}")
async def get_dataset_numeric_summary(dataset_id: str):
    """Statistical describe() block for numeric columns (reporting)."""
    if not data_service:
        raise HTTPException(status_code=500, detail="Data service not initialized")
    if not data_service.has_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    summary = data_service.build_numeric_describe_block(dataset_id)
    return {"summary": summary}


@app.get("/dataset-charts/{dataset_id}")
async def get_dataset_charts(dataset_id: str):
    """Aggregated series for dashboard charts (Recharts-friendly JSON)."""
    if not data_service:
        raise HTTPException(status_code=500, detail="Data service not initialized")
    if not data_service.has_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    payload = data_service.build_chart_payload(dataset_id)
    return payload if payload is not None else {}


# ============================================================================
# COMPARISON ENDPOINTS
# ============================================================================
@app.post("/compare-datasets", response_model=ComparisonResponse)
async def compare_datasets(request: ComparisonRequest):
    """
    Compare two datasets and generate insights
    """
    if not ai_service or not data_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:
        dataset1 = data_service.get_dataset(request.dataset_id_1)
        dataset2 = data_service.get_dataset(request.dataset_id_2)

        if dataset1 is None or dataset2 is None:
            raise ValueError("One or both datasets not found")
        
        comparison = await ai_service.compare_datasets(
            dataset1=dataset1,
            dataset2=dataset2,
            metrics=request.metrics,
        )
        snapshot = data_service.build_comparison_snapshot(
            request.dataset_id_1, request.dataset_id_2
        )
        if snapshot:
            comparison = {**comparison, "snapshot": snapshot}
        
        return ComparisonResponse(
            comparison=comparison,
            dataset_id_1=request.dataset_id_1,
            dataset_id_2=request.dataset_id_2,
            success=True,
        )
    except Exception as e:
        print(f"[v0] Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# KPI ENDPOINTS
# ============================================================================
@app.post("/kpi-analysis", response_model=KPIResponse)
async def analyze_kpis(request: KPIRequest):
    """
    Analyze Key Performance Indicators and create dashboard data
    """
    if not ai_service or not data_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:
        dataset = data_service.get_dataset(request.dataset_id)
        if dataset is None:
            raise ValueError("Dataset not found")
        
        kpis = await ai_service.analyze_kpis(
            dataset=dataset,
            kpi_definitions=request.kpi_definitions,
        )
        
        return KPIResponse(
            kpis=kpis,
            dataset_id=request.dataset_id,
            success=True,
        )
    except Exception as e:
        print(f"[v0] KPI error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# VOICE ENDPOINTS
# ============================================================================
@app.post("/voice-transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """
    Transcribe voice input to text
    Uses Google Cloud Speech-to-Text or similar
    """
    if not ai_service:
        raise HTTPException(status_code=500, detail="AI service not initialized")
    
    try:
        content = await file.read()
        text = await ai_service.transcribe_audio(content)
        return {"text": text, "success": True}
    except Exception as e:
        print(f"[v0] Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice-synthesis")
async def synthesize_voice(request: VoiceRequest):
    """
    Convert text to speech
    """
    if not ai_service:
        raise HTTPException(status_code=500, detail="AI service not initialized")
    
    try:
        audio = await ai_service.synthesize_speech(request.text)
        return {"audio": audio, "success": True}
    except Exception as e:
        print(f"[v0] Synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ERROR HANDLERS
# ============================================================================
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(status_code=400, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
