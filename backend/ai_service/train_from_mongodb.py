
import json
import joblib
import pandas as pd
import numpy as np
import argparse
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def load_data(path):
    with open(path, 'r') as f:
        data = json.load(f)
    return pd.DataFrame(data['X']), np.array(data['y'])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--train-path', required=True)
    parser.add_argument('--val-path', required=True)
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--preprocessor-path', required=True)
    parser.add_argument('--model-version', required=True)
    args = parser.parse_args()

    print(f"Loading training data from {args.train_path}")
    X_train, y_train = load_data(args.train_path)
    print(f"Training data shape: {X_train.shape}")

    print(f"Loading validation data from {args.val_path}")
    X_val, y_val = load_data(args.val_path)
    print(f"Validation data shape: {X_val.shape}")

    # Drop datetime columns that can't be used as features
    datetime_cols = ['week_start', 'week_end', 'year_week']
    X_train = X_train.drop(columns=[c for c in datetime_cols if c in X_train.columns])
    X_val = X_val.drop(columns=[c for c in datetime_cols if c in X_val.columns])

    # Identify categorical and numerical columns
    categorical_cols = ['sr_type', 'season']
    numerical_cols = [c for c in X_train.columns if c not in categorical_cols]

    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
        ],
        remainder='drop'
    )

    # Model
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss',
        n_jobs=-1
    )

    # Pipeline
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating on validation set...")
    y_pred = pipeline.predict(X_val)
    y_pred_proba = pipeline.predict_proba(X_val)[:, 1]

    metrics = {
        'accuracy': float(accuracy_score(y_val, y_pred)),
        'precision': float(precision_score(y_val, y_pred, zero_division=0)),
        'recall': float(recall_score(y_val, y_pred, zero_division=0)),
        'f1': float(f1_score(y_val, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_val, y_pred_proba)),
    }

    print(f"Validation metrics: {metrics}")

    # Save model and preprocessor
    joblib.dump(pipeline, args.model_path)
    joblib.dump(preprocessor, args.preprocessor_path)
    print(f"Model saved to {args.model_path}")
    print(f"Preprocessor saved to {args.preprocessor_path}")

    # Save metrics
    metrics_path = args.model_path.replace('_model.pkl', '_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)

if __name__ == '__main__':
    main()
