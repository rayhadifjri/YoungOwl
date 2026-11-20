# Young Owl — REST API Specification

Status: **Draft v0.1**. Base URL: `/api/v1`. JSON in and out. A generated OpenAPI 3.1 document
will be served at `/api/v1/docs` once implemented (from the Zod schemas in `packages/shared`).

## Conventions

- **Auth:** session cookie `yo_session` (`httpOnly`, `Secure`, `SameSite=Strict`). State-changing
  requests also need header `X-CSRF-Token` matching the `yo_csrf` cookie (double-submit).
- **Validation:** every body, query and param is parsed with Zod. Invalid input → `400`.
- **Errors:** `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
  Codes: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `403 OUT_OF_SCOPE`,
  `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL`.
- **Pagination:** `?page=1&pageSize=20` → `{ data: [...], meta: { page, pageSize, total } }`.
- **Rate limits (default):** 100 req/min per user; login 5/min per IP; job creation 10/min per user.
- **Logging:** structured JSON (pino), request id in `X-Request-Id`. Every write is audited.
- **Permission** column = permission key required (checked by RBAC middleware).

## Auth

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` → sets session + CSRF cookies, returns user |
| POST | `/auth/logout` | authenticated | Destroys session |
| GET | `/auth/me` | authenticated | Current user, role, permissions |
| POST | `/auth/change-password` | authenticated | `{ currentPassword, newPassword }` |

## Users & roles

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/users` | `user:read` | List users |
| POST | `/users` | `user:create` | Create user `{ email, username, displayName, roleId, password }` |
| GET | `/users/:id` | `user:read` | Get user |
| PATCH | `/users/:id` | `user:update` | Update role / active flag / name |
| DELETE | `/users/:id` | `user:delete` | Deactivate (soft) |
| GET | `/roles` | `role:read` | Roles with permissions |

## Laboratories & lab sessions

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/labs` | `lab:read` | List labs (filter `difficulty`) |
| POST | `/labs` | `lab:manage` | Create lab |
| GET | `/labs/:id` | `lab:read` | Lab with targets |
| PATCH | `/labs/:id` | `lab:manage` | Update |
| POST | `/labs/:id/sessions` | `lab:use` | Start a lab session (time-boxed) |
| GET | `/lab-sessions` | `lab:use` | My sessions |
| POST | `/lab-sessions/:id/stop` | `lab:use` | Stop session |
| POST | `/labs/:id/reset` | `lab:manage` | Recreate target containers |

## Targets

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/targets` | `target:read` | List (filter `labId`, `status`, `difficulty`) |
| POST | `/targets` | `target:manage` | Create (hostname must be inside lab scope) |
| GET | `/targets/:id` | `target:read` | Detail |
| PATCH | `/targets/:id` | `target:manage` | Update |
| DELETE | `/targets/:id` | `target:manage` | Delete |

## Assessments, jobs & findings

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/assessments` | `assessment:read` | History (own; all for ADMIN/INSTRUCTOR) |
| POST | `/assessments` | `assessment:create` | `{ title, targetId, description? }` |
| GET | `/assessments/:id` | `assessment:read` | Detail with scans and findings |
| PATCH | `/assessments/:id` | `assessment:update` | Status, title, description |
| GET | `/tool-profiles` | `job:create` | Allowlisted tool profiles available for a target |
| POST | `/assessments/:id/jobs` | `job:create` | `{ toolProfile }` → `202 { scanResultId }` |
| GET | `/jobs/:id` | `assessment:read` | Status + parsed result |
| GET | `/jobs/:id/stream` | `assessment:read` | Server-Sent Events: `progress`, `line`, `done` |
| POST | `/jobs/:id/cancel` | `job:create` | Cancel queued/running job |
| GET | `/assessments/:id/vulnerabilities` | `assessment:read` | Findings |
| POST | `/assessments/:id/vulnerabilities` | `finding:write` | Add manual finding (CVSS vector validated) |
| PATCH | `/vulnerabilities/:id` | `finding:write` | Update status/severity/remediation |

## Reports

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/reports` | `report:read` | List |
| POST | `/assessments/:id/reports` | `report:create` | Generate `{ format: PDF\|MARKDOWN\|JSON }` |
| GET | `/reports/:id/download` | `report:read` | File download |

## Learning center

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/learning/modules` | `learn:read` | Modules with my progress |
| GET | `/learning/modules/:slug` | `learn:read` | Module + lessons |
| GET | `/learning/lessons/:id` | `learn:read` | Lesson content |
| POST | `/learning/lessons/:id/complete` | `learn:read` | Mark complete |
| GET | `/learning/quizzes/:id` | `learn:read` | Quiz (answers stripped) |
| POST | `/learning/quizzes/:id/submit` | `learn:read` | `{ answers: number[] }` → score |
| GET | `/learning/progress` | `learn:read` | Overall progress by level |

## Dashboard, audit, monitoring

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/dashboard/summary` | authenticated | Totals, vuln stats by severity, recent activity, progress, security score |
| GET | `/audit-logs` | `audit:read` | Filter by actor, action, date |
| GET | `/system/health` | public | Liveness (`{ status: "ok" }`) |
| GET | `/system/status` | `system:read` | DB, Redis, worker heartbeat, queue depth, target statuses |

## Example: create a job

```http
POST /api/v1/assessments/clx123/jobs
Cookie: yo_session=...; yo_csrf=abc
X-CSRF-Token: abc
Content-Type: application/json

{ "toolProfile": "nmap.service-scan" }
```

```json
202 Accepted
{ "scanResultId": "clx999", "status": "QUEUED", "streamUrl": "/api/v1/jobs/clx999/stream" }
```

Rejected if the profile is unknown (`400`), the target is out of the lab scope or the lab session is
inactive (`403 OUT_OF_SCOPE`), or the profile is intrusive and the target does not allow it (`403`).
