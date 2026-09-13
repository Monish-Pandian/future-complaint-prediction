
import json
import joblib
import numpy as np
import argparse
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--data-path', required=True)
    args = parser.parse_args()

    with open(args.data_path, 'r') as f:
        data = json.load(f)

    X = pd.DataFrame(data['X'])
    y = np.array(data['y'])

    # Drop datetime columns that can't be used as features
    datetime_cols = ['week_start', 'week_end', 'year_week']
    X = X.drop(columns=[c for c in datetime_cols if c in X.columns])

    pipeline = joblib.load(args.model_path)
    y_pred = pipeline.predict(X)
    y_pred_proba = pipeline.predict_proba(X)[:, 1]

    metrics = {
        'accuracy': float(accuracy_score(y, y_pred)),
        'precision': float(precision_score(y, y_pred, zero_division=0)),
        'recall': float(recall_score(y, y_pred, zero_division=0)),
        'f1': float(f1_score(y, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y, y_pred_proba)),
    }

    print(json.dumps(metrics))

if __name__ == '__main__':
    main()
