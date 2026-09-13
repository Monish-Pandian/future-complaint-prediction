# Resource Ownership & Data Access Rules

This document specifies the ownership rules, CRUD permissions, and data integrity guarantees for all entities in the system.

---

## 1. Prediction (`Prediction`)

- **Purpose**: Represents an AI-generated civic complaint forecast.
- **Read Permissions**:
  - `ADMIN`: Global read access across all departments, community areas, and wards.
  - `OFFICER`: Read access strictly restricted to predictions assigned to the authenticated officer.
- **Create Permissions**:
  - `ADMIN`: Allowed (or system batch prediction cycles).
  - `OFFICER`: Forbidden (`403 Forbidden`).
- **Update Permissions**:
  - Forecast parameters (`probability`, `riskScore`, `confidence`, `predictionDate`, `predictionWindow`, `department`, `communityArea`, `ward`, `predictionCycleId`) are **IMMUTABLE**.
  - Operational verification status (`verificationStatus`, `assignedOfficer`) is updated automatically via the Assignment & Verification workflow.
- **Delete Permissions**:
  - Forbidden in normal operation to maintain research traceability.

---

## 2. Assignment (`Assignment`)

- **Purpose**: Links a predicted problem to an assigned municipal officer.
- **Read Permissions**:
  - `ADMIN`: Global read access to all municipal assignments.
  - `OFFICER`: Restricted strictly to assignments matching the authenticated officer (`officerId === req.user._id` or `officerId === req.user.officerId`).
- **Create Permissions**:
  - Generated automatically via the AI / Heuristic Dispatch Service or Admin auto-assign trigger.
  - `OFFICER`: Cannot create arbitrary assignments.
- **Update Permissions**:
  - `OFFICER`: Allowed to transition assignment state:
    - `AI_ASSIGNED` $\rightarrow$ `ACCEPTED`
    - `ACCEPTED` $\rightarrow$ `IN_PROGRESS`
    - `AI_ASSIGNED` $\rightarrow$ `REJECTED`
    - In-progress assignments are completed automatically upon field verification submission.
  - Invalid state jumps (e.g. `COMPLETED` $\rightarrow$ `IN_PROGRESS`) return `400 Bad Request`.
- **Delete Permissions**:
  - Not permitted. Rejection moves status to `REJECTED` rather than deleting records.

---

## 3. Field Verification (`Verification`)

- **Purpose**: Records an officer's actual ground-truth field observation (distinguishing prediction from observation).
- **Read Permissions**:
  - `ADMIN`: Global read access to all field verification records.
  - `OFFICER`: Read access strictly restricted to verifications submitted by the authenticated officer.
- **Create Permissions**:
  - `OFFICER`: Can submit verification only for a prediction assigned to them.
  - Duplicate verification submissions for the same assignment return `409 Conflict`.
- **Update Permissions**:
  - `OFFICER`: Can update `notes` and `evidenceUrl` on their own verification. Ground-truth outcome and server timestamps remain immutable.
- **Delete Permissions**:
  - Not permitted. Field verification observations represent permanent empirical data.

---

## 4. Ground-Truth Evaluation (`Evaluation`)

- **Purpose**: Compares AI forecast vs actual field verification outcome (`TRUE_POSITIVE`, `FALSE_POSITIVE`, `UNDETERMINED`).
- **Read Permissions**:
  - `ADMIN`: Global read access through prediction trace graphs.
  - `OFFICER`: Indirectly visible via officer dashboard performance metrics.
- **Create / Update / Delete**:
  - Fully system-generated during the verification submission transaction. Direct user creation/mutation is forbidden.

---

## 5. Iterative Feedback Signal (`Feedback`)

- **Purpose**: Encapsulates verified ground-truth training data (`READY_FOR_MODEL_UPDATE`) for future model retraining cycles.
- **Read Permissions**:
  - `ADMIN`: Global oversight via prediction lifecycle trace.
- **Create / Update / Delete**:
  - System-managed by verification service. Direct manual mutation is blocked to maintain ML training pipeline integrity.

---

## 6. Officer Profile (`Officer`)

- **Purpose**: Represents municipal field inspector profile, location, department, and active workload.
- **Read Permissions**:
  - `ADMIN`: Global read access to all officer profiles and workloads.
  - `OFFICER`: Read access to own profile via dashboard.
- **Create / Update Permissions**:
  - `ADMIN`: Can create officers, update skills, phone, location, and availability.
  - `OFFICER`: Cannot modify role, department, active state, or workload.
- **Delete Permissions**:
  - `ADMIN`: Executes **Soft Deactivation** (`active: false`, `availability: OFF_DUTY`) to preserve historical assignment and verification integrity. Hard deletion is prevented.
