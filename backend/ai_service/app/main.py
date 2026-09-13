from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.schemas import (
    PredictRequest, PredictResponse, HealthResponse, ModelInfoResponse, ErrorResponse
)
from app.model_service import initialize_model_service, get_model_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Prediction Service...")
    try:
        initialize_model_service()
        logger.info("AI Prediction Service started successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI service: {e}")
        raise
    yield
    # Shutdown
    logger.info("Shutting down AI Prediction Service...")


app = FastAPI(
    title="AI Prediction Service",
    description="Batch prediction service for civic complaint forecasting using XGBoost",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for backend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    service = get_model_service()
    health = service.is_healthy()

    all_healthy = all(health.values())
    return HealthResponse(
        status="healthy" if all_healthy else "unhealthy",
        modelLoaded=health["modelLoaded"],
        preprocessorLoaded=health["preprocessorLoaded"],
        featureSourceAvailable=health["featureSourceAvailable"]
    )


@app.get("/model/info", response_model=ModelInfoResponse, tags=["Model"])
async def model_info():
    """Get model metadata."""
    service = get_model_service()
    return service.get_model_info()


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict(request: PredictRequest):
    """
    Batch prediction for a given prediction week.

    Returns predictions for all valid community_area/sr_type combinations
    for the specified week, optionally filtered by community areas and SR types.
    """
    service = get_model_service()

    try:
        result = service.predict(request)
        return result
    except ValueError as e:
        logger.error(f"Validation error in prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        logger.error(f"Data not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction could not be completed")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail if isinstance(exc.detail, str) else "ERROR", "message": str(exc.detail)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)