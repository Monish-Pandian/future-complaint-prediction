# Backend System Architecture & Lifecycle Contract

This document provides a comprehensive technical overview of the backend architecture, data relationships, lifecycle state machines, and future AI service boundaries.

---

## 1. High-Level Backend Architecture

```mermaid
graph TD
    Client["Frontend / Mobile Clients"]
    
    subgraph Express_Security_Layer["Express Security & Middleware Layer"]
        Helmet["Helmet Security Headers"]
        CORS["CORS Policy Validation"]
        RateLimiter["Authentication Rate Limiter"]
        BodyLimits["Payload Limiter (1MB)"]
        NoSQLSanitizer["NoSQL Operator Injection Filter"]
        JWTAuth["JWT Authentication (Bearer Token)"]
        RBAC["Role-Based Access Control (ADMIN / OFFICER)"]
        Ownership["Ownership & IDOR Protection"]
        DeptIsolation["Department Boundary Isolation"]
    end
    
    subgraph Express_Application_Layer["Application & Domain Services"]
        AuthService["Auth Service (Bcrypt + JWT)"]
        PredictionService["Prediction Service & Trace"]
        AssignmentService["Assignment & Dispatch Engine"]
        VerificationService["Field Verification Service"]
        EvaluationService["Ground-Truth Evaluation"]
        FeedbackService["Iterative Retraining Feedback"]
        HeatmapService["Geospatial GeoJSON Engine"]
        AdminService["Admin Operational Analytics"]
        OfficerService["Officer Management & Workload"]
    end
    
    subgraph Database_Layer["MongoDB Database Engine"]
        M_User[("Users Collection")]
        M_Officer[("Officers Collection")]
        M_Cycle[("Prediction Cycles Collection")]
        M_Prediction[("Predictions Collection")]
        M_Assignment[("Assignments Collection")]
        M_Verification[("Verifications Collection")]
        M_Evaluation[("Evaluations Collection")]
        M_Feedback[("Feedback Collection")]
        M_History[("Historical 311 Complaints")]
    end

    Client --> Helmet --> CORS --> RateLimiter --> BodyLimits --> NoSQLSanitizer --> JWTAuth --> RBAC --> Ownership --> DeptIsolation
    DeptIsolation --> AuthService & PredictionService & AssignmentService & VerificationService & HeatmapService & AdminService & OfficerService
    
    AuthService --> M_User
    OfficerService --> M_Officer & M_User
    PredictionService --> M_Prediction & M_Cycle
    AssignmentService --> M_Assignment & M_Prediction & M_Officer
    VerificationService --> M_Verification & M_Assignment & M_Prediction & M_Officer
    VerificationService --> EvaluationService --> M_Evaluation
    EvaluationService --> FeedbackService --> M_Feedback
    HeatmapService --> M_Prediction
```

---

## 2. End-to-End Operational Lifecycle & 7-Node Traceability

The system maintains complete 7-node relational traceability from historical complaint ingestion to ground-truth feedback generation.

```mermaid
flowchart TD
    Node1["1. Historical Complaints\n(311 Municipal Records)"] --> Node2["2. Prediction Cycle\n(Active Cycle Window)"]
    Node2 --> Node3["3. Predicted Problem\n(Immutable Risk Forecast)"]
    Node3 --> Node4["4. Officer Assignment\n(Proximity & Workload Matching)"]
    Node4 --> Node5["5. Field Verification\n(Actual Ground-Truth Observation)"]
    Node5 --> Node6["6. Ground-Truth Evaluation\n(Forecast vs Observation Classification)"]
    Node6 --> Node7["7. Retraining Feedback Signal\n(READY_FOR_MODEL_UPDATE)"]
    Node7 -.->|"Future Retraining Cycle"| Node2
```

---

## 3. Assignment State Machine

```mermaid
stateDiagram-v2
    [*] --> AI_ASSIGNED: Auto-Dispatch Engine / Admin Assign
    AI_ASSIGNED --> ACCEPTED: Officer Accepts
    AI_ASSIGNED --> REJECTED: Officer Rejects
    ACCEPTED --> IN_PROGRESS: Officer Starts Field Task
    IN_PROGRESS --> VERIFICATION_SUBMITTED: Verification Form Submitted
    VERIFICATION_SUBMITTED --> COMPLETED: Evaluation & Feedback Generated
    COMPLETED --> [*]
    REJECTED --> [*]
```

### Transition Invariants
- `AI_ASSIGNED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `VERIFICATION_SUBMITTED` $\rightarrow$ `COMPLETED`
- Direct jumps from `COMPLETED` $\rightarrow$ `IN_PROGRESS` or `AI_ASSIGNED` $\rightarrow$ `COMPLETED` are rejected (`400 Bad Request`).

---

## 4. Verification Outcomes & Evaluation Classification

| Verification Outcome | Description | Resulting Evaluation | Resulting Feedback Type |
|---|---|---|---|
| `PROBLEM_CONFIRMED` | Field inspection confirms forecasted issue exists | `TRUE_POSITIVE` | `VERIFIED_OBSERVATION` |
| `PROBLEM_NOT_FOUND` | No issue observed at predicted location | `FALSE_POSITIVE` | `FALSE_POSITIVE_SIGNAL` |
| `DIFFERENT_PROBLEM` | Different issue observed than predicted | `FALSE_POSITIVE` | `DIFFERENT_PROBLEM_SIGNAL` |
| `DUPLICATE` | Issue is a duplicate of a previously resolved task | `UNDETERMINED` | `DUPLICATE_REPORT` |
| `UNABLE_TO_VERIFY` | Access blocked / insufficient verification evidence | `UNDETERMINED` | `DATA_QUALITY_ISSUE` |

---

## 5. Future AI Service Boundary (Contract Specification)

> [!IMPORTANT]
> **Future Boundary Specification**: The machine learning model integration (XGBoost / Random Forest / Spatial Forecasting Service) will communicate with the Express backend via REST API ingestion. The ML service will **never** connect directly to MongoDB.

```mermaid
sequenceDiagram
    autonumber
    participant AI as Future AI Service (Python / FastAPI)
    participant API as Express.js Backend API
    participant DB as MongoDB Database

    Note over AI,API: Batch Prediction Cycle Generation
    AI->>API: POST /api/v1/admin/predictions (Batch Forecast Payload)
    API->>API: Validate Schema, Probability Bounds (0-1), Risk Scores (0-100)
    API->>DB: Persist Predictions with predictionCycleId
    DB-->>API: Persisted Prediction IDs
    API-->>AI: 201 Created Confirmation

    Note over API,DB: Field Verification & Feedback Loop
    API->>DB: Record Field Observations & Generate Feedback Signals
    DB-->>API: Feedback Signals (READY_FOR_MODEL_UPDATE)

    Note over AI,API: Training Ingestion
    AI->>API: GET /api/v1/admin/predictions?verificationStatus=VERIFIED_TRUE
    API-->>AI: Ground-Truth Labeled Training Observations
```

### Ingestion Contract (Future AI Service $\rightarrow$ Express Backend)

```json
{
  "predictionCycleId": "CYCLE-2026-W34",
  "complaintType": "Pothole Wave",
  "department": "Streets & Sanitation",
  "communityArea": "Near North Side",
  "ward": "Ward 42",
  "location": {
    "type": "Point",
    "coordinates": [-87.6298, 41.8781]
  },
  "probability": 0.88,
  "riskScore": 85.0,
  "riskLevel": "HIGH",
  "confidence": 0.92,
  "historicalCount": 14,
  "recentCount": 8,
  "trend": "INCREASING",
  "predictionWindowStart": "2026-08-26T00:00:00.000Z",
  "predictionWindowEnd": "2026-09-02T00:00:00.000Z"
}
```
