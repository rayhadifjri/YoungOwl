# Young Owl — Implementation Roadmap

Status: **Draft v0.1**. Each phase ends with tests passing, docs updated, and a PR merged before the
next phase starts (spec §11).

## Phase 0 — Design (this PR)

- [x] Architecture, folder structure
- [x] Prisma schema (15 tables + joins)
- [x] API specification
- [x] Threat model
- [x] Roadmap and feature dependencies

## Phase 1 — Foundation

- pnpm + Turborepo monorepo, TypeScript strict, ESLint/Prettier, Vitest
- `docker-compose.yml` with postgres + redis (dev)
- `packages/database`: migrations + seed (admin, researcher, student, labs, targets, vulns, assessment history, learning modules)
- `apps/api`: Fastify skeleton, auth (login/logout/me), sessions, CSRF, RBAC middleware, rate limit, logging, `/system/health`
- `apps/web`: login page, app shell (sidebar, dark navy/cyan theme), dashboard reading `/dashboard/summary`
- README, `.env.example`
- **Done when:** `docker compose up` + `pnpm dev` → log in as seeded admin → dashboard shows seeded data; tests green.

## Phase 2 — Backend API

- Users, labs, targets, assessments, vulnerabilities, reports (Markdown/JSON), audit logs, learning progress endpoints
- OpenAPI spec at `/api/v1/openapi.json` (generated from the route registry)
- Web pages: Target Management, Assessment history/detail, Reporting list, Audit log (admin)
- **Done when:** every endpoint in `api-specification.md` (except jobs) works with role tests.

## Phase 3 — Young Owl as a target (lab mode)

User goal: attack the platform from their own Kali box. A second, intentionally vulnerable copy of
Young Owl (`VULN_MODE=true`, `docker-compose.lab.yml`) runs beside the normal one, isolated and
auto-resetting. Planted OWASP-class bugs (SQLi, IDOR, path traversal, command injection, debug leak,
stored XSS, auth failures) with capture-the-flag strings. See [lab-mode.md](lab-mode.md).

- **Done when:** the lab copy runs on the VPS, is reachable from Kali, each planted bug is
  exploitable, and the normal copy exposes none of them.

## Phase 3b — Lab worker & Kali integration (optional, spec Phase 4)

- Kali-based worker image, non-root, limited caps
- BullMQ queue, tool profiles (nmap, nikto, whatweb, gobuster), output parsers
- Isolated `lab_net` with OWASP Juice Shop + DVWA
- Job endpoints + SSE live terminal view in the UI
- **Done when:** a researcher runs `nmap.service-scan` on Juice Shop from the UI and sees live output and stored results; the worker cannot reach the internet.

## Phase 4 — Cybersecurity learning modules (spec Phase 3) ✅ built

- Learning Center UI, lessons, quizzes, progress by level
- Content: Reconnaissance, Vulnerability Assessment, Exploitation Lab guides (on the lab targets),
  Backdoor & Persistence (conceptual + detection), Evasion & Exit (detection engineering), Incident Response & Forensics
- **Done when:** a student can complete a lesson, its hands-on lab, and its quiz, and the dashboard progress updates.

## Phase 5 — Advanced

- PDF report export, CVSS calculator, vulnerability analytics charts
- Automated assessment (chained safe profiles)
- System monitoring page (worker heartbeat, queue, container health)
- Production deploy on the VPS: Nginx + Let's Encrypt, ufw, backups

## Why Kali integration comes before the learning modules

The spec lists modules (Phase 3) before Kali integration (Phase 4). We swap them because the
Reconnaissance and Exploitation modules need working labs and live scans to be "real workflows"
instead of static content (spec §11: "no static-only dummy data").

## Feature dependencies

```
Auth + RBAC ──► every API module
Database + seed ──► Dashboard, Targets, Assessments, Learning
Targets + Labs ──► Assessments ──► Jobs ──► Vulnerabilities ──► Reports (PDF)
Redis queue + Worker + lab_net ──► Jobs ──► Live terminal (SSE)
Learning modules ──► Quizzes ──► Progress ──► Dashboard progress widget
Audit logging ──► Admin audit page, System monitoring
```
