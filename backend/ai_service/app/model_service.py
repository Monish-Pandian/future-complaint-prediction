import os
import joblib
import pandas as pd
import numpy as np
from typing import Tuple, List, Optional
import logging

from app.schemas import PredictRequest, PredictResponse, PredictionResponseItem, PredictionMetadata, ModelInfoResponse

logger = logging.getLogger(__name__)

# Model version from environment (set to active model version from ModelTrainingRun)
MODEL_VERSION = os.getenv("MODEL_VERSION", "xgb-test-v1")

# Exact 36 features in the exact order from training
# NOTE: The preprocessor's ColumnTransformer (trained in train_from_mongodb.py) drops
# datetime columns ['week_start', 'week_end', 'year_week'] via remainder='drop'.
# The primary MongoDB path (predict_from_mongodb.py) explicitly drops these 3 columns
# before preprocessing (33 features → 45 transformed).
# This FastAPI path passes all 36 features; the preprocessor drops the 3 datetime
# columns, resulting in the same 45 transformed features. Both paths are compatible.
VALID_FEATURES = [
    'community_area', 'week_start', 'week_end', 'year', 'week_of_year', 'year_week',
    'sr_type', 'complaints_last_1_week', 'complaints_last_2_week', 'complaints_last_4_week',
    'complaints_last_8_week', 'complaints_last_12_week', 'rolling_mean_4_weeks',
    'rolling_max_4_weeks', 'rolling_std_4_weeks', 'rolling_mean_8_weeks',
    'rolling_max_8_weeks', 'rolling_std_8_weeks', 'rolling_mean_12_weeks',
    'rolling_max_12_weeks', 'rolling_std_12_weeks', 'month', 'quarter', 'season',
    'same_week_previous_year_count', 'same_month_previous_year_count',
    'previous_year_same_community_count', 'previous_year_same_complaint_count',
    'ward', 'total_complaints_all_types_last_1_week', 'total_complaints_all_types_last_4_weeks',
    'total_complaints_all_types_last_8_weeks', 'total_complaints_all_types_last_12_weeks',
    'distinct_complaint_types_last_4_weeks', 'distinct_complaint_types_last_8_weeks',
    'distinct_complaint_types_last_12_weeks'
]

# Columns that must NEVER be passed to the model (leakage/target columns)
FORBIDDEN_COLUMNS = [
    'complaint_count',
    'future_complaint',
    'future_complaint_count',
    'actual_future_complaint',
    'actual_future_complaint_count',
    'dataset_period'
]

# Model threshold from validation (optimized for F1)
MODEL_THRESHOLD = 0.38

# Supported SR types from training data
SUPPORTED_SR_TYPES = [
    "Abandoned Vehicle Complaint",
    "Blue Recycling Cart",
    "Building Violation",
    "Garbage Cart Maintenance",
    "Graffiti Removal Request",
    "Pothole in Street Complaint",
    "Rodent Baiting/Rat Complaint",
    "Street Light Out Complaint",
    "Traffic Signal Out Complaint",
    "Tree Debris Clean-Up Request"
]

class ModelService:
    """
    FastAPI Model Service - FALLBACK PREDICTION PATH
    
    NOTE: This service is a FALLBACK for the primary MongoDB-backed prediction path.
    The primary production prediction path uses:
    - MongoPredictionService (Node.js) → FeatureEngineeringService → MongoDB HistoricalComplaints
    - python predict_from_mongodb.py → xgb-test-v1 model
    
    This FastAPI service uses static final_research_dataset.csv for features
    and is only invoked when the primary MongoDB path fails (see aiService.js:342-346).
    
    Both paths use the same model artifacts (xgb-test-v1) and threshold (0.38).
    """
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.feature_df = None
        self._load_artifacts()

    def _load_artifacts(self):
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'models', 'xgboost_model.pkl')
        preprocessor_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'models', 'preprocessor.pkl')
        feature_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'final_research_dataset.csv')

        # Load model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        self.model = joblib.load(model_path)
        logger.info("XGBoost model loaded successfully")

        # Load preprocessor
        if not os.path.exists(preprocessor_path):
            raise FileNotFoundError(f"Preprocessor file not found: {preprocessor_path}")
        self.preprocessor = joblib.load(preprocessor_path)
        logger.info("Preprocessor loaded successfully")

        # Load engineered feature dataset
        if not os.path.exists(feature_path):
            raise FileNotFoundError(f"Feature dataset not found: {feature_path}")
        self.feature_df = pd.read_csv(feature_path)
        logger.info(f"Feature dataset loaded: {len(self.feature_df)} rows")

        # Validate all required features exist
        missing_features = [f for f in VALID_FEATURES if f not in self.feature_df.columns]
        if missing_features:
            raise ValueError(f"Feature dataset missing required model features: {missing_features}")
        logger.info("All 36 required features present in dataset")

        # Validate no forbidden columns would be accidentally used
        forbidden_present = [c for c in FORBIDDEN_COLUMNS if c in self.feature_df.columns]
        if forbidden_present:
            logger.warning(f"Dataset contains forbidden columns (will be excluded): {forbidden_present}")

    def is_healthy(self) -> dict:
        return {
            "modelLoaded": self.model is not None,
            "preprocessorLoaded": self.preprocessor is not None,
            "featureSourceAvailable": self.feature_df is not None and len(self.feature_df) > 0
        }

    def get_model_info(self) -> ModelInfoResponse:
        return ModelInfoResponse(
            modelVersion=MODEL_VERSION,
            modelType="XGBClassifier",
            requiredFeatureCount=len(VALID_FEATURES),
            predictionMode="batch",
            threshold=MODEL_THRESHOLD,
            supportedSrTypes=SUPPORTED_SR_TYPES
        )

    def _filter_features(self, request: PredictRequest) -> pd.DataFrame:
        """Filter feature dataset for the requested prediction week and optional filters."""
        # Validate prediction week format and extract
        pred_week = pd.Timestamp(request.predictionWeek)
        pred_week_start = pred_week.normalize()
        pred_week_end = pred_week_start + pd.Timedelta(days=6)

        # Filter by week_start
        df = self.feature_df.copy()
        df['week_start_dt'] = pd.to_datetime(df['week_start'])
        mask = (df['week_start_dt'] >= pred_week_start) & (df['week_start_dt'] <= pred_week_end)
        df = df[mask].copy()

        if len(df) == 0:
            return pd.DataFrame()

        # Apply optional filters
        if request.filters:
            if request.filters.communityAreas:
                df = df[df['community_area'].isin(request.filters.communityAreas)]
            if request.filters.srTypes:
                df = df[df['sr_type'].isin(request.filters.srTypes)]

        return df

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Select exactly the 36 valid features in the correct order."""
        # Select only valid features
        X = df[VALID_FEATURES].copy()

        # Handle missing values consistent with training pipeline
        # Numerical features: fill with 0 (or could use median from training, but 0 is safe for lag features)
        numerical_features = [
            'community_area', 'year', 'week_of_year', 'complaints_last_1_week',
            'complaints_last_2_week', 'complaints_last_4_week', 'complaints_last_8_week',
            'complaints_last_12_week', 'rolling_mean_4_weeks', 'rolling_max_4_weeks',
            'rolling_std_4_weeks', 'rolling_mean_8_weeks', 'rolling_max_8_weeks',
            'rolling_std_8_weeks', 'rolling_mean_12_weeks', 'rolling_max_12_weeks',
            'rolling_std_12_weeks', 'month', 'quarter', 'ward',
            'total_complaints_all_types_last_1_week', 'total_complaints_all_types_last_4_weeks',
            'total_complaints_all_types_last_8_weeks', 'total_complaints_all_types_last_12_weeks',
            'distinct_complaint_types_last_4_weeks', 'distinct_complaint_types_last_8_weeks',
            'distinct_complaint_types_last_12_weeks', 'same_week_previous_year_count',
            'same_month_previous_year_count', 'previous_year_same_community_count',
            'previous_year_same_complaint_count'
        ]

        categorical_features = ['sr_type', 'season']
        datetime_features = ['week_start', 'week_end', 'year_week']

        # Fill missing numerical with 0
        for col in numerical_features:
            if col in X.columns:
                X[col] = X[col].fillna(0)

        # Fill missing categorical with mode
        for col in categorical_features:
            if col in X.columns and X[col].isna().any():
                mode_val = X[col].mode()
                if len(mode_val) > 0:
                    X[col] = X[col].fillna(mode_val[0])
                else:
                    X[col] = X[col].fillna("Unknown")

        # Datetime features as strings
        for col in datetime_features:
            if col in X.columns:
                X[col] = X[col].astype(str).fillna("")

        # Ensure column order matches training
        X = X[VALID_FEATURES]

        return X

    def predict(self, request: PredictRequest) -> PredictResponse:
        """Run batch prediction for the requested week."""
        # Filter features for prediction week
        feature_df = self._filter_features(request)

        if len(feature_df) == 0:
            return PredictResponse(
                modelVersion=request.modelVersion,
                predictionWeek=request.predictionWeek,
                predictions=[],
                metadata=PredictionMetadata(
                    predictionCount=0,
                    threshold=MODEL_THRESHOLD,
                    filtersApplied={
                        "communityAreas": request.filters.communityAreas if request.filters else None,
                        "srTypes": request.filters.srTypes if request.filters else None
                    } if request.filters else None
                )
            )

        # Prepare features
        X = self._prepare_features(feature_df)

        # Transform using preprocessor
        X_processed = self.preprocessor.transform(X)

        # Predict probabilities
        probabilities = self.model.predict_proba(X_processed)[:, 1]

        # Build response
        predictions = []
        for i, (_, row) in enumerate(feature_df.iterrows()):
            prob = float(probabilities[i])
            risk_score = prob * 100.0
            predicted_class = 1 if prob >= MODEL_THRESHOLD else 0

            predictions.append(PredictionResponseItem(
                communityArea=int(row['community_area']),
                weekStart=str(row['week_start']),
                srType=str(row['sr_type']),
                ward=int(row['ward']),
                probability=prob,
                riskScore=risk_score,
                predictedClass=predicted_class
            ))

        # Sort by probability descending (highest risk first)
        predictions.sort(key=lambda p: p.probability, reverse=True)

        return PredictResponse(
            modelVersion=request.modelVersion,
            predictionWeek=request.predictionWeek,
            predictions=predictions,
            metadata=PredictionMetadata(
                predictionCount=len(predictions),
                threshold=MODEL_THRESHOLD,
                filtersApplied={
                    "communityAreas": request.filters.communityAreas if request.filters else None,
                    "srTypes": request.filters.srTypes if request.filters else None
                } if request.filters else None
            )
        )


# Global instance
_model_service: Optional[ModelService] = None


def get_model_service() -> ModelService:
    global _model_service
    if _model_service is None:
        _model_service = ModelService()
    return _model_service


def initialize_model_service() -> ModelService:
    global _model_service
    _model_service = ModelService()
    return _model_service