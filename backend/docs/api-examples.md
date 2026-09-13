# API Usage Examples (cURL & Request Payloads)

This document provides concrete cURL commands, request headers, and expected response payloads for key operations in the system.

---

## 1. System Health Check

```bash
curl -X GET http://localhost:5000/api/v1/health
```

### Response (200 OK)
```json
{
  "success": true,
  "service": "civic-forecasting-api",
  "status": "healthy"
}
```

---

## 2. Authentication Flow

### 2.1 Register New Officer
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Officer Jordan Reed",
    "email": "jordan.reed@civic.gov",
    "password": "SecurePassword123!",
    "department": "Streets & Sanitation"
  }'
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6a8ed15ebdd2e2b8996112bf",
      "name": "Officer Jordan Reed",
      "email": "jordan.reed@civic.gov",
      "role": "OFFICER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.2 Login User
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jordan.reed@civic.gov",
    "password": "SecurePassword123!"
  }'
```

---

## 3. Admin Operational Flows

### 3.1 Get Global Municipal Dashboard
```bash
curl -X GET http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### 3.2 List Predictions with Filtering & Pagination
```bash
curl -X GET "http://localhost:5000/api/v1/admin/predictions?page=1&limit=10&riskLevel=HIGH&department=Streets%20%26%20Sanitation" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### 3.3 Get Prediction Full 7-Node Trace Graph
```bash
curl -X GET http://localhost:5000/api/v1/admin/predictions/PRED-83921 \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "prediction": {
      "predictionId": "PRED-83921",
      "complaintType": "Pothole Wave",
      "probability": 0.88,
      "riskScore": 85.0,
      "riskLevel": "HIGH",
      "verificationStatus": "VERIFIED_TRUE"
    },
    "predictionCycle": {
      "cycleId": "CYCLE-2026-W34",
      "cycleNumber": 104
    },
    "assignedOfficer": {
      "officerId": "OFF-101",
      "name": "Officer Jordan Reed"
    },
    "assignment": {
      "assignmentId": "ASGN-9021",
      "status": "COMPLETED"
    },
    "verification": {
      "verificationId": "VERIF-4019",
      "outcome": "PROBLEM_CONFIRMED",
      "severity": "HIGH",
      "notes": "Severe roadway degradation confirmed."
    },
    "evaluation": {
      "evaluationId": "EVAL-201",
      "classification": "TRUE_POSITIVE"
    },
    "feedback": {
      "feedbackId": "FDBK-881",
      "feedbackType": "VERIFIED_OBSERVATION",
      "feedbackStatus": "READY_FOR_MODEL_UPDATE"
    }
  }
}
```

### 3.4 Soft Deactivate Officer
```bash
curl -X DELETE http://localhost:5000/api/v1/admin/officers/OFF-101 \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## 4. Officer Operational Flows

### 4.1 Officer Personal Dashboard
```bash
curl -X GET http://localhost:5000/api/v1/officer/dashboard \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

### 4.2 Officer List Own Assignments
```bash
curl -X GET http://localhost:5000/api/v1/officer/assignments \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

### 4.3 Officer Accepts Assignment
```bash
curl -X PATCH http://localhost:5000/api/v1/officer/assignments/ASGN-9021/accept \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

### 4.4 Officer Starts Field Verification Task
```bash
curl -X PATCH http://localhost:5000/api/v1/officer/assignments/ASGN-9021/start \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

### 4.5 Officer Submits Field Verification Observation
```bash
curl -X POST http://localhost:5000/api/v1/officer/verifications \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "predictionId": "PRED-83921",
    "outcome": "PROBLEM_CONFIRMED",
    "severity": "HIGH",
    "notes": "Field inspection confirmed severe roadway pothole cluster.",
    "evidenceUrl": "https://evidence.civic.gov/img/pothole-01.jpg",
    "latitude": 41.8781,
    "longitude": -87.6298
  }'
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "verification": {
      "verificationId": "VERIF-4019",
      "predictionId": "6a8ed15ebdd2e2b8996112bf",
      "assignmentId": "6a8ed15ebdd2e2b8996112c0",
      "officerId": "6a8ed15ebdd2e2b8996112c1",
      "outcome": "PROBLEM_CONFIRMED",
      "severity": "HIGH",
      "notes": "Field inspection confirmed severe roadway pothole cluster.",
      "evidenceUrl": "https://evidence.civic.gov/img/pothole-01.jpg",
      "gpsAvailable": true,
      "verifiedAt": "2026-08-26T17:28:00.000Z"
    }
  }
}
```

### 4.6 Department-Scoped GeoJSON Heatmap
```bash
curl -X GET http://localhost:5000/api/v1/officer/heatmap \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

---

## 5. Geospatial Nearby Query

```bash
curl -X GET "http://localhost:5000/api/v1/heatmap/nearby?latitude=41.8781&longitude=-87.6298&radiusKm=3.5" \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```
