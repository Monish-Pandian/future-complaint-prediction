
# Security Policy & Access-Control Architecture

This document describes the security model, access-control policies, and defensive mechanisms implemented in the Express.js REST API backend for **"Proactive Civic Complaint Forecasting with Resource-Constrained Verification and Feedback"**.

---

## 1. Authentication Architecture

### 1.1 Password Storage & Security
- Passwords are never stored or logged in plaintext.
- All credentials are hashed using `bcryptjs` with salt work factor of 10.
- Password hashes (`passwordHash`) are excluded by default in Mongoose queries (`select: false`) and are never exposed in API responses or logs.

### 1.2 JSON Web Tokens (JWT)
- Authenticated identities are signed using HMAC-SHA256 (`HS256`) with a cryptographically secure `JWT_SECRET` loaded from environment variables.
- Token expiration is enforced (`7d` default, configurable via `JWT_EXPIRES_IN`).
- All incoming Bearer tokens are validated for cryptographic signature, expiration, and payload integrity.
- Inactive / deactivated accounts (`isActive: false`) are rejected immediately with `403 Forbidden`.

### 1.3 Public Registration vs Admin Provisioning
- The public registration endpoint (`/api/v1/auth/register`) only provisions standard `OFFICER` accounts.
- Direct registration with `role: "ADMIN"` is strictly blocked (`403 Forbidden`).
- Admin accounts must be created via secure internal system provisioning or administrative seeding.

---

## 2. Authorization & Role-Based Access Control (RBAC)

### 2.1 Default-Deny Access Policy
- All operational routes require explicit authentication (`authenticate` middleware) and role-level authorization (`authorize` middleware).
- Default route posture is **DENY**.

| Role | Operational Scope | Allowed Endpoints |
|---|---|---|
| **ADMIN** | Citywide municipal management | `/api/v1/admin/*`, global dashboards, all departments, officer CRUD, AI dispatch |
| **OFFICER** | Departmental field tasks & verification | `/api/v1/officer/*`, own dashboard, own assignments, own verifications, own department heatmap |

### 2.2 Role Escalation Defense
- Client-supplied role overrides in request bodies (e.g. `role: "ADMIN"`, `isAdmin: true`) or modified token payloads are rejected.
- Role and identity are resolved strictly from the verified JWT payload and confirmed against the active database user record.

---

## 3. Resource Ownership & IDOR Protection

### 3.1 Authenticated Identity Resolution
- Officer identity is determined exclusively from `req.user._id` (or `req.user.officerId` verified in the database session).
- Client parameters in `req.body.officerId`, `req.query.officerId`, or `req.params.officerId` are never trusted to determine identity.

### 3.2 Insecure Direct Object Reference (IDOR) Mitigation
- **Assignments**: Officer A cannot view, accept, start, or reject assignments belonging to Officer B (`403 Forbidden` / `404 Not Found`).
- **Verifications**: Officer A cannot view or modify verification observations submitted by Officer B.
- **Predictions**: Officer can only retrieve predicted problems assigned to their specific officer profile.

---

## 4. Department Data Boundary Isolation

- Officer department is resolved directly from the authenticated user's database record (`req.user.department`).
- Query parameter manipulation (e.g., `GET /api/v1/officer/heatmap?department=Police` from a `Streets & Sanitation` officer) is intercepted by `departmentAccess` middleware and rejected (`403 Forbidden`).

---

## 5. Forecast Immutability & Mass Assignment Protection

### 5.1 AI Forecast Invariants
- AI prediction values (`probability`, `riskScore`, `confidence`, `predictionDate`, `predictionWindow`, `department`, `communityArea`, `ward`, `predictionCycleId`) are immutable.
- Operational verification observations record ground-truth field data without altering or overwriting original forecast outputs.

### 5.2 Mass Assignment & Field Filtering
- All update and create operations filter request bodies against strict allowlists.
- Sensitive internal fields (`_id`, `passwordHash`, `role`, `createdAt`, `currentWorkload`) cannot be modified through generic update APIs.

---

## 6. Verification Integrity & Duplicate Defense

- Officers may only submit verification for predicted problems explicitly assigned to them.
- Duplicate verification submissions for the same assignment are rejected with `409 Conflict`.
- Verification timestamps (`verifiedAt`) are generated exclusively by the server clock, ignoring any client-forged timestamps.

---

## 7. NoSQL Injection & Query Defense

- **Operator Injection Protection**: Central middleware (`sanitizeNoSql`) inspects request query, body, and params, rejecting any payload containing MongoDB operator keys (starting with `$` or containing `.`).
- **Regex Denial of Service (ReDoS)**: All user-supplied search strings are sanitized via `escapeRegex()` and capped at 100 characters.
- **Sort Allowlists**: Sorting parameters are checked against explicit allowlists to prevent arbitrary database introspection.
- **Pagination Bounds**: Pages and limits are bounded (`page >= 1`, `1 <= limit <= 100`).

---

## 8. Operational Security & Information Disclosure

- **Rate Limiting**: Brute-force protection on `/auth/login` and `/auth/register` (max 20 attempts per 15 minutes).
- **Security Headers**: Managed via `helmet` (HSTS, CSP, X-Content-Type-Options, Referrer-Policy).
- **CORS Protection**: Restricted to authorized origins (`CLIENT_URL` / localhost development origins).
- **Sensitive Logging**: Credentials, tokens, and database connection strings are excluded from logs.
- **Error Obfuscation**: Production error responses suppress stack traces and database internals, returning clean standardized JSON.

---

## 9. Security Reporting & Vulnerability Disclosure

If you discover a potential security vulnerability in this project, please report it privately to the project maintainers. Do not disclose vulnerabilities in public issue trackers.
