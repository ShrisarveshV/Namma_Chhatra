import pickle
import pandas as pd
import json
from datetime import datetime
import os
import random

# Determine the path to the model relative to the backend directory
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dropout_demo_model.pkl")

# Load model globally on module import
model = None
try:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print(f"[SUCCESS] Prediction model loaded successfully from {MODEL_PATH}")
    else:
        print(f"[WARNING] Model file not found at {MODEL_PATH}. Predictions will be stubbed.")
except Exception as e:
    print(f"[ERROR] Error loading model: {e}")


def evaluate_student(student, attendance_pct: float) -> dict:
    """
    Evaluates dropout risk for a student.
    Expects student object (or dictionary) with:
    - commute_distance_km
    - income_bracket
    - grade_drop_pct
    - and the computed attendance_pct
    """
    # Extract values or assign defaults
    try:
        dist = float(student.commute_distance_km) if getattr(student, "commute_distance_km", None) is not None else 5.0
    except:
        dist = 5.0
        
    try:
        drop_pct = float(student.grade_drop_pct) if getattr(student, "grade_drop_pct", None) is not None else 0.0
    except:
        drop_pct = 0.0
        
    income = getattr(student, "income_bracket", "Medium")
    if not income:
        income = "Medium"

    # We need to map income bracket to whatever the model expects.
    # The XGBoost model likely expects specific numeric features or one-hot encoded features.
    # If it's a scikit-learn pipeline, it might handle strings.
    # We will assume a DataFrame format if it's xgboost.
    
    # We will create a DataFrame matching expected features.
    # To be safe and since we don't have the exact training script, we'll try to build the 4 features
    # typically used in this context.
    df = pd.DataFrame([{
        "attendance_pct": attendance_pct,
        "commute_distance_km": dist,
        "grade_drop_pct": drop_pct,
        "income_bracket": income
    }])

    # Try predicting
    risk_score = 0.0
    try:
        if model:
            # Predict probability of dropout (class 1)
            # Depending on the model, it might be a pipeline that accepts strings, or we might need to encode.
            # We'll try raw DataFrame first.
            proba = model.predict_proba(df)[0]
            # Assuming class 1 is dropout
            if len(proba) > 1:
                risk_score = float(proba[1]) * 100
            else:
                risk_score = float(proba[0]) * 100
        else:
            # Fallback mock logic if model fails to load
            risk_score = (100 - attendance_pct) * 0.6 + (drop_pct * 0.4) + (dist * 0.1)
            if income == "Low":
                risk_score += 10.0
    except Exception as e:
        print(f"[WARNING] Prediction error: {e}. Falling back to rule-based.")
        # Fallback rule-based
        risk_score = (100 - attendance_pct) * 0.6 + (drop_pct * 0.4) + (dist * 0.1)
        if income == "Low":
            risk_score += 10.0

    # Cap score
    risk_score = max(0.0, min(100.0, risk_score))

    # Determine risk level
    if risk_score >= 70.0:
        risk_level = "High"
    elif risk_score >= 40.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Generate comprehensive reasons based on ALL evaluated factors
    reasons = []

    # 1. Attendance check
    if attendance_pct < 75.0:
        reasons.append(f"Critical attendance level ({attendance_pct:.1f}% — threshold: 75%)")
    elif attendance_pct < 85.0:
        reasons.append(f"Below-average attendance ({attendance_pct:.1f}% — threshold: 85%)")

    # 2. Grade drop check
    if drop_pct > 5.0:
        reasons.append(f"Significant academic decline (+{drop_pct:.1f}% grade drop)")
    elif drop_pct > 3.0:
        reasons.append(f"Moderate academic decline (+{drop_pct:.1f}% grade drop)")

    # 3. Commute distance check
    if dist > 15.0:
        reasons.append(f"Very long commute burden ({dist:.1f} km)")
    elif dist > 8.0:
        reasons.append(f"Long commute burden ({dist:.1f} km)")

    # 4. Income bracket check — handle string labels, numeric strings, and ints
    income_str = str(income).strip().lower()
    if income_str in ("low", "1", "1.0"):
        reasons.append("High economic vulnerability (Low income bracket)")
    elif income_str in ("medium", "2", "2.0"):
        reasons.append("Moderate economic background (Medium income bracket)")

    # 5. If no risk factors triggered, note the positive indicators
    if not reasons:
        positive = []
        if attendance_pct >= 85.0:
            positive.append(f"Good attendance ({attendance_pct:.1f}%)")
        if drop_pct <= 3.0:
            positive.append("Stable academic performance")
        if dist <= 8.0:
            positive.append("Short commute distance")
        reasons.append("Consistent performance: " + "; ".join(positive) if positive else "No significant risk factors detected")


    return {
        "dropout_risk_score": round(risk_score, 1),
        "dropout_risk_level": risk_level,
        "risk_reasons": json.dumps(reasons),
        "last_evaluated_at": datetime.utcnow()
    }
