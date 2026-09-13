# Role Authorization Matrix

This document specifies the role-based access control (RBAC) permissions across all API endpoints in the system.

---

## Roles Overview

1. **`ADMIN` (Citywide Administrator)**:
   - Global operational oversight across all municipal departments.
   - Access to citywide dashboards, global heatmaps, officer CRUD, AI dispatch triggering, and all prediction/verification data.
2. **`OFFICER` (Field Department Officer)**:
   - Access strictly restricted to personal operational assignments, own submitted verifications, own performance dashboard, and department-scoped heatmap.

---

## Endpoint Permission Matrix

| Endpoint | Method | Purpose | Admin | Officer | Unauthenticated |
|---|---|---|:---:|:---:|:---:|
| `/api/v1/health` | `GET` | Service & DB Health Check | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/api/v1/auth/register` | `POST` | Register Officer Account | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/api/v1/auth/login` | `POST` | User Authentication & JWT | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/api/v1/auth/me` | `GET` | Current User Profile | ✅ Allowed | ✅ Allowed | ❌ 401 |
| `/api/v1/auth/logout` | `POST` | Invalidate User Session | ✅ Allowed | ✅ Allowed | ❌ 401 |
| **Admin Operations** | | | | | |
| `/api/v1/admin/dashboard` | `GET` | Global Municipal Metrics | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/heatmap` | `GET` | Citywide GeoJSON Heatmap | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/verification-monitoring` | `GET` | Verification Overview | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/predictions` | `GET` | List All Predictions | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/predictions` | `POST` | Create Predicted Problem | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/predictions/:id` | `GET` | Full 7-Node Lifecycle Trace | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/assignments` | `GET` | List All Assignments | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/assignments/:id` | `GET` | Single Assignment Details | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/assignments/auto-assign/:id` | `POST` | Trigger AI Dispatch Engine | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/verifications` | `GET` | List All Verifications | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/verifications/:id` | `GET` | Single Verification Record | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers` | `GET` | List All Officers | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers` | `POST` | Create Officer & User Login | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers/:id` | `GET` | Officer Profile & Summary | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers/:id/workload` | `GET` | Officer Workload Metrics | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers/:id` | `PATCH` | Update Officer Profile | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers/:id/status` | `PATCH` | Update Availability & Active | ✅ Allowed | ❌ 403 | ❌ 401 |
| `/api/v1/admin/officers/:id` | `DELETE` | Soft Deactivate Officer | ✅ Allowed | ❌ 403 | ❌ 401 |
| **Officer Operations** | | | | | |
| `/api/v1/officer/dashboard` | `GET` | Officer Personal Dashboard | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/predictions` | `GET` | Assigned Predicted Tasks | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/predictions/:id` | `GET` | Single Assigned Prediction | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments` | `GET` | Officer's Own Assignments | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments/:id` | `GET` | Single Assignment by ID | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments/:id/accept` | `PATCH` | Accept Assigned Task | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments/:id/start` | `PATCH` | Start Field Verification | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments/:id/reject` | `PATCH` | Reject Assigned Task | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/assignments/:id/status` | `PATCH` | Update Assignment State | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/verifications` | `GET` | List Own Verifications | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/verifications/:id` | `GET` | Single Own Verification | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/verifications` | `POST` | Submit Field Observation | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/verifications/:id` | `PATCH` | Update Verification Notes | ✅ Allowed | ✅ Allowed (Own) | ❌ 401 |
| `/api/v1/officer/heatmap` | `GET` | Department-Scoped Heatmap | ✅ Allowed | ✅ Allowed (Dept) | ❌ 401 |
| `/api/v1/heatmap/nearby` | `GET` | Proximity Heatmap Query | ✅ Allowed | ✅ Allowed | ❌ 401 |

---

## Critical Access Invariants

1. **Default Deny**: Any request lacking a valid JWT Bearer token is rejected (`401 Unauthorized`).
2. **Role Boundaries**: Officers attempting access to `/api/v1/admin/*` are rejected (`403 Forbidden`).
3. **Ownership Isolation**: Officers attempting access to another officer's private resources (`/officer/assignments/:id`, `/officer/verifications/:id`) are rejected (`403 Forbidden`).
4. **Department Boundaries**: Officers attempting access to other departments' operational data via query parameters (e.g. `?department=Police`) are rejected (`403 Forbidden`).
