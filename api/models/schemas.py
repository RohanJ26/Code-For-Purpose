"""
Pydantic models and schemas for API requests/responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ============================================================================
# CHAT MODELS
# ============================================================================
class ChatMessage(BaseModel):
    """Single message in conversation"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message")
    dataset_id: Optional[str] = Field(None, description="ID of dataset to analyze")
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None, description="Previous messages in conversation"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional context (dataset info, etc)"
    )
    generate_follow_ups: Optional[bool] = Field(
        default=False, description="If true, include 2-3 follow-up question suggestions in the response"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str
    success: bool
    error: Optional[str] = None
    follow_up_questions: Optional[List[str]] = None


# ============================================================================
# DATASET MODELS
# ============================================================================
class ColumnInfo(BaseModel):
    """Information about a dataset column"""
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample_values: List[Any]


class DatasetInfo(BaseModel):
    """Metadata about a dataset"""
    dataset_id: str
    filename: str
    rows: int
    columns: int
    column_info: List[ColumnInfo]
    size_bytes: int
    created_at: str


class AnalysisRequest(BaseModel):
    """Request for dataset analysis"""
    dataset_id: str
    analysis_type: str = Field(
        default="comprehensive",
        description="Type: comprehensive, statistical, trend, anomaly",
    )
    focus_areas: Optional[List[str]] = Field(
        default=None, description="Specific columns to focus on"
    )


class AnalysisResponse(BaseModel):
    """Response from dataset analysis"""
    analysis: Dict[str, Any]
    dataset_id: str
    success: bool
    error: Optional[str] = None


# ============================================================================
# COMPARISON MODELS
# ============================================================================
class ComparisonRequest(BaseModel):
    """Request to compare two datasets"""
    dataset_id_1: str
    dataset_id_2: str
    metrics: Optional[List[str]] = Field(
        default=None, description="Specific metrics to compare"
    )


class ComparisonResponse(BaseModel):
    """Response from dataset comparison"""
    comparison: Dict[str, Any]
    dataset_id_1: str
    dataset_id_2: str
    success: bool
    error: Optional[str] = None


# ============================================================================
# KPI MODELS
# ============================================================================
class KPIDef(BaseModel):
    """Key Performance Indicator definition"""
    name: str
    formula: Optional[str] = None
    column: Optional[str] = None
    aggregation: str = "sum"  # sum, avg, count, etc.


class KPIRequest(BaseModel):
    """Request for KPI analysis"""
    dataset_id: str
    kpi_definitions: Optional[List[KPIDef]] = None


class KPIMetric(BaseModel):
    """Single KPI metric"""
    name: str
    value: float
    trend: Optional[str] = None  # "up", "down", "stable"
    description: str


class KPIResponse(BaseModel):
    """Response from KPI analysis"""
    kpis: List[KPIMetric]
    dataset_id: str
    success: bool
    error: Optional[str] = None


# ============================================================================
# VOICE MODELS
# ============================================================================
class VoiceRequest(BaseModel):
    """Request for voice synthesis"""
    text: str
    voice: str = "default"


class VoiceResponse(BaseModel):
    """Response from voice endpoints"""
    audio: str  # Base64 encoded audio
    success: bool
    error: Optional[str] = None
