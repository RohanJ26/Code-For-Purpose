"""
Advanced AI utilities for analysis, prompting, and response processing
"""
import json
from typing import Dict, Any, List
import pandas as pd


class PromptBuilder:
    """Builder for constructing optimized prompts for Gemini"""
    
    @staticmethod
    def build_analysis_prompt(
        dataset_summary: Dict[str, Any],
        analysis_type: str = "comprehensive",
        focus_areas: List[str] = None,
    ) -> str:
        """Build prompt for dataset analysis"""
        
        prompt = f"""You are an expert business analyst. Analyze this dataset and provide {analysis_type} insights.

DATASET SUMMARY:
{json.dumps(dataset_summary, indent=2, default=str)}

ANALYSIS REQUIREMENTS:
1. Identify key patterns and trends
2. Detect anomalies or outliers
3. Highlight important correlations
4. Provide actionable business recommendations
5. Summarize in clear, executive-friendly language

"""
        
        if focus_areas:
            prompt += f"\nFOCUS AREAS: {', '.join(focus_areas)}\n"
        
        prompt += """
OUTPUT FORMAT:
Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence executive summary",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "trends": ["trend 1", "trend 2"],
  "anomalies": ["anomaly 1"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "confidence": 0.85
}
"""
        return prompt
    
    @staticmethod
    def build_comparison_prompt(
        stats1: Dict[str, Any],
        stats2: Dict[str, Any],
        dataset1_name: str = "Dataset 1",
        dataset2_name: str = "Dataset 2",
    ) -> str:
        """Build prompt for comparing datasets"""
        
        prompt = f"""Compare these two datasets and provide detailed insights.

{dataset1_name} STATISTICS:
{json.dumps(stats1, indent=2, default=str)}

{dataset2_name} STATISTICS:
{json.dumps(stats2, indent=2, default=str)}

COMPARISON ANALYSIS:
1. What are the key differences?
2. What are the similarities?
3. Which dataset shows better performance on key metrics?
4. What does this comparison tell us about the business?
5. What actions should be taken based on this comparison?

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "summary": "comparison summary",
  "key_differences": ["difference 1", "difference 2"],
  "similarities": ["similarity 1"],
  "performance_winner": "{dataset1_name} or {dataset2_name}",
  "reasoning": "why one dataset performs better",
  "business_insights": ["insight 1", "insight 2"],
  "recommended_actions": ["action 1", "action 2"]
}
"""
        return prompt
    
    @staticmethod
    def build_why_analysis_prompt(metric: str, context: Dict[str, Any]) -> str:
        """Build prompt for 'Why' analysis - understanding the root cause"""
        
        prompt = f"""You are a root cause analysis expert. Analyze WHY this metric has this value.

METRIC: {metric}
CONTEXT:
{json.dumps(context, indent=2, default=str)}

ROOT CAUSE ANALYSIS:
1. What are the primary drivers of this metric?
2. What factors contribute to its current value?
3. What are the underlying causes?
4. How can we influence this metric?
5. What are the secondary effects?

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "metric": "{metric}",
  "current_value": "value from context",
  "primary_drivers": ["driver 1", "driver 2", "driver 3"],
  "root_causes": ["cause 1", "cause 2"],
  "contributing_factors": ["factor 1", "factor 2"],
  "influence_strategies": ["strategy 1", "strategy 2"],
  "secondary_effects": ["effect 1", "effect 2"]
}
"""
        return prompt
    
    @staticmethod
    def build_kpi_prompt(
        dataset_summary: Dict[str, Any],
        kpi_definitions: List[Dict[str, str]] = None,
    ) -> str:
        """Build prompt for KPI analysis"""
        
        prompt = f"""Analyze Key Performance Indicators (KPIs) for this dataset.

DATASET:
{json.dumps(dataset_summary, indent=2, default=str)}

"""
        
        if kpi_definitions:
            prompt += f"REQUESTED KPIs:\n{json.dumps(kpi_definitions, indent=2, default=str)}\n"
        
        prompt += """
KPI ANALYSIS REQUIREMENTS:
1. Calculate or estimate key metrics
2. Provide trend analysis (up/down/stable)
3. Compare to typical industry benchmarks if possible
4. Identify leading indicators
5. Provide actionable insights

OUTPUT FORMAT:
Return ONLY valid JSON array:
[
  {
    "name": "KPI Name",
    "value": 123.45,
    "unit": "dollars/percentage/count",
    "trend": "up/down/stable",
    "trend_percentage": 5.2,
    "benchmark": "industry average",
    "status": "good/warning/critical",
    "insight": "explanation of what this means"
  }
]
"""
        return prompt


class ResponseParser:
    """Parse and validate AI responses"""
    
    @staticmethod
    def parse_json_response(text: str) -> Dict[str, Any]:
        """Extract and parse JSON from AI response"""
        try:
            # Try direct JSON parse first
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from text
            start_idx = text.find('{')
            end_idx = text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                try:
                    json_str = text[start_idx:end_idx]
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass
            
            # Return structured fallback
            return {
                "response": text,
                "error": "Could not parse JSON",
            }
    
    @staticmethod
    def validate_analysis_response(response: Dict[str, Any]) -> bool:
        """Validate analysis response has required fields"""
        required_fields = ["summary", "key_insights", "recommendations"]
        return all(field in response for field in required_fields)


class DataAnalyzer:
    """Utility class for statistical analysis of datasets"""
    
    @staticmethod
    def get_dataset_summary(df: pd.DataFrame, sample_size: int = 5) -> Dict[str, Any]:
        """Generate a summary of the dataset for analysis"""
        
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        summary = {
            "shape": {
                "rows": len(df),
                "columns": len(df.columns),
            },
            "columns": {
                "numeric": numeric_cols,
                "categorical": categorical_cols,
            },
            "missing_data": {
                col: int(df[col].isnull().sum()) for col in df.columns
            },
            "numeric_stats": {},
            "categorical_stats": {},
        }
        
        # Numeric statistics
        for col in numeric_cols[:10]:  # Limit to first 10
            stats = df[col].describe().to_dict()
            summary["numeric_stats"][col] = stats
        
        # Categorical statistics
        for col in categorical_cols[:5]:  # Limit to first 5
            summary["categorical_stats"][col] = {
                "unique_values": int(df[col].nunique()),
                "top_values": df[col].value_counts().head(3).to_dict(),
            }
        
        # Sample rows
        summary["sample_rows"] = df.head(sample_size).to_dict('records')
        
        return summary
    
    @staticmethod
    def detect_outliers(df: pd.DataFrame, columns: List[str] = None) -> Dict[str, List[int]]:
        """Detect outliers in numeric columns using IQR method"""
        
        outliers = {}
        numeric_df = df.select_dtypes(include=['number'])
        cols_to_check = columns or numeric_df.columns.tolist()
        
        for col in cols_to_check:
            if col not in numeric_df.columns:
                continue
            
            Q1 = numeric_df[col].quantile(0.25)
            Q3 = numeric_df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outlier_indices = numeric_df[
                (numeric_df[col] < lower_bound) | (numeric_df[col] > upper_bound)
            ].index.tolist()
            
            if outlier_indices:
                outliers[col] = outlier_indices
        
        return outliers
    
    @staticmethod
    def calculate_correlations(
        df: pd.DataFrame,
        threshold: float = 0.5,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Calculate correlations between numeric columns"""
        
        numeric_df = df.select_dtypes(include=['number'])
        
        correlations = numeric_df.corr()
        
        # Find strong correlations
        strong_corrs = {}
        for col1 in correlations.columns:
            col_corrs = []
            for col2 in correlations.columns:
                if col1 != col2:
                    corr_value = correlations.loc[col1, col2]
                    if abs(corr_value) >= threshold:
                        col_corrs.append({
                            "column": col2,
                            "correlation": float(corr_value),
                            "strength": "strong" if abs(corr_value) > 0.7 else "moderate",
                        })
            
            if col_corrs:
                strong_corrs[col1] = col_corrs
        
        return strong_corrs
