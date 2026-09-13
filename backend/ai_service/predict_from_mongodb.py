
import json
import joblib
import base64
import io
import pandas as pd
import numpy as np
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-path', required=True)
    args = parser.parse_args()

    with open(args.input_path, 'r') as f:
        data = json.load(f)

    X = pd.DataFrame(data['X'])
    model_bytes = base64.b64decode(data['modelBase64'])
    preprocessor_bytes = base64.b64decode(data['preprocessorBase64'])

    model = joblib.load(io.BytesIO(model_bytes))
    preprocessor = joblib.load(io.BytesIO(preprocessor_bytes))

    # Drop datetime columns that were not used during training
    datetime_cols = ['week_start', 'week_end', 'year_week']
    X = X.drop(columns=[c for c in datetime_cols if c in X.columns])

    X_processed = preprocessor.transform(X)
    
    # Use the classifier directly on preprocessed features (avoid double transformation)
    classifier = model.named_steps['classifier']
    probabilities = classifier.predict_proba(X_processed)[:, 1]

    predictions = []
    for i, prob in enumerate(probabilities):
        risk_score = float(prob * 100.0)
        predicted_class = 1 if prob >= 0.38 else 0
        predictions.append({
            'probability': float(prob),
            'risk_score': risk_score,
            'predicted_class': predicted_class,
        })

    result = {'predictions': predictions}
    print(json.dumps(result))

if __name__ == '__main__':
    main()
