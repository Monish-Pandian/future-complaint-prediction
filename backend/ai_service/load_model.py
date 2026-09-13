
import json
import joblib
import base64
import argparse
import io

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--preprocessor-path', required=True)
    args = parser.parse_args()

    model = joblib.load(args.model_path)
    preprocessor = joblib.load(args.preprocessor_path)

    model_buffer = io.BytesIO()
    joblib.dump(model, model_buffer)
    model_b64 = base64.b64encode(model_buffer.getvalue()).decode('utf-8')

    preprocessor_buffer = io.BytesIO()
    joblib.dump(preprocessor, preprocessor_buffer)
    preprocessor_b64 = base64.b64encode(preprocessor_buffer.getvalue()).decode('utf-8')

    result = {
        'modelBase64': model_b64,
        'preprocessorBase64': preprocessor_b64
    }
    print(json.dumps(result))

if __name__ == '__main__':
    main()
