"""
Enhanced AI Service - Advanced analysis with Gemini
Includes Why Engine, Comparisons, Summarization, and Intelligence
"""
import json
from typing import Optional, List, Dict, Any
import google.generativeai as genai
import pandas as pd
from api.services.ai_utils import PromptBuilder, ResponseParser, DataAnalyzer


class EnhancedAIService:
    """Enhanced AI service with advanced features"""
    
    def __init__(self, api_key: str):
        """Initialize enhanced AI service"""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8096,
            },
        )
        self.analyzer = DataAnalyzer()
    
    async def comprehensive_analysis(
        self,
        dataset: pd.DataFrame,
        focus_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Perform comprehensive analysis of dataset"""
        
        try:
            # Get dataset summary
            summary = self.analyzer.get_dataset_summary(dataset)
            
            # Build prompt
            prompt = PromptBuilder.build_analysis_prompt(
                summary,
                analysis_type="comprehensive",
                focus_areas=focus_areas,
            )
            
            # Get AI response
            response = self.model.generate_content(prompt)
            
            # Parse response
            analysis = ResponseParser.parse_json_response(response.text)
            
            # Add additional insights
            analysis["outliers"] = self.analyzer.detect_outliers(dataset)
            analysis["correlations"] = self.analyzer.calculate_correlations(dataset)
            
            return analysis
        except Exception as e:
            print(f"[v0] Comprehensive analysis error: {str(e)}")
            raise
    
    async def why_engine(
        self,
        dataset: pd.DataFrame,
        metric: str,
        value: Any,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Why Engine - Understand why a metric has a certain value
        Root cause analysis and driver identification
        """
        
        try:
            analysis_context = context or {}
            analysis_context["metric_name"] = metric
            analysis_context["metric_value"] = value
            analysis_context["dataset_shape"] = dataset.shape
            
            prompt = PromptBuilder.build_why_analysis_prompt(metric, analysis_context)
            
            response = self.model.generate_content(prompt)
            
            result = ResponseParser.parse_json_response(response.text)
            
            return result
        except Exception as e:
            print(f"[v0] Why engine error: {str(e)}")
            raise
    
    async def dataset_comparison(
        self,
        dataset1: pd.DataFrame,
        dataset2: pd.DataFrame,
        name1: str = "Dataset 1",
        name2: str = "Dataset 2",
    ) -> Dict[str, Any]:
        """Compare two datasets with detailed insights"""
        
        try:
            # Get summaries
            summary1 = self.analyzer.get_dataset_summary(dataset1)
            summary2 = self.analyzer.get_dataset_summary(dataset2)
            
            # Build comparison prompt
            prompt = PromptBuilder.build_comparison_prompt(
                summary1,
                summary2,
                dataset1_name=name1,
                dataset2_name=name2,
            )
            
            response = self.model.generate_content(prompt)
            
            comparison = ResponseParser.parse_json_response(response.text)
            
            return comparison
        except Exception as e:
            print(f"[v0] Comparison error: {str(e)}")
            raise
    
    async def summary_generation(
        self,
        dataset: pd.DataFrame,
        length: str = "medium",
    ) -> Dict[str, Any]:
        """Generate business-friendly summary of dataset"""
        
        try:
            summary = self.analyzer.get_dataset_summary(dataset)
            
            prompt = f"""You are a business intelligence expert. 
            Create a {length} summary of this dataset for a business audience.
            
            DATASET:
            {json.dumps(summary, indent=2, default=str)}
            
            Write a clear, actionable summary that:
            1. Explains what the data shows
            2. Highlights key business implications
            3. Suggests next steps
            
            Format as JSON: {{"summary": "...", "key_points": [...], "next_steps": [...]}}
            """
            
            response = self.model.generate_content(prompt)
            
            result = ResponseParser.parse_json_response(response.text)
            
            return result
        except Exception as e:
            print(f"[v0] Summary error: {str(e)}")
            raise
    
    async def suggest_questions(
        self,
        dataset: pd.DataFrame,
        num_questions: int = 5,
    ) -> List[str]:
        """Suggest insightful questions about the dataset"""
        
        try:
            summary = self.analyzer.get_dataset_summary(dataset)
            
            prompt = f"""You are a data analyst. 
            Suggest {num_questions} insightful questions that a business analyst 
            would ask about this dataset.
            
            DATASET:
            {json.dumps(summary, indent=2, default=str)}
            
            Questions should be:
            - Specific and actionable
            - Relevant to business decision-making
            - Varied in scope (operational, strategic, etc)
            
            Return ONLY JSON: {{"questions": ["Q1", "Q2", ...]}}
            """
            
            response = self.model.generate_content(prompt)
            
            result = ResponseParser.parse_json_response(response.text)
            
            return result.get("questions", [])
        except Exception as e:
            print(f"[v0] Question suggestion error: {str(e)}")
            return []
