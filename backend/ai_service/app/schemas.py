from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import date


class PredictionFilters(BaseModel):
    communityAreas: Optional[List[int]] = Field(default=None, description="Filter by community area IDs")
    srTypes: Optional[List[str]] = Field(default=None, description="Filter by service request types")


class PredictRequest(BaseModel):
    predictionWeek: str = Field(..., description="Prediction week start date in YYYY-MM-DD format")
    modelVersion: str = Field(default="baseline-spatial-v1", description="Model version to use")
    filters: Optional[PredictionFilters] = Field(default=None, description="Optional filters")

    @field_validator('predictionWeek')
    @classmethod
    def validate_prediction_week(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("predictionWeek must be in YYYY-MM-DD format")
        return v


class PredictionResponseItem(BaseModel):
    communityArea: int
    weekStart: str
    srType: str
    ward: int
    probability: float = Field(ge=0.0, le=1.0)
    riskScore: float = Field(ge=0.0, le=100.0)
    predictedClass: int = Field(ge=0, le=1)


class PredictionMetadata(BaseModel):
    predictionCount: int
    threshold: float
    filtersApplied: Optional[Dict[str, Any]] = None


class PredictResponse(BaseModel):
    modelVersion: str
    predictionWeek: str
    predictions: List[PredictionResponseItem]
    metadata: PredictionMetadata


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    preprocessorLoaded: bool
    featureSourceAvailable: bool


class ModelInfoResponse(BaseModel):
    modelVersion: str
    modelType: str
    requiredFeatureCount: int
    predictionMode: str
    threshold: float
    supportedSrTypes: List[str]


class ErrorResponse(BaseModel):
    error: str
    message: str