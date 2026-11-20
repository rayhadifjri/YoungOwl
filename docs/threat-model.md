# Young Owl — Threat Model

Status: **Draft v0.1**. Method: STRIDE per trust boundary. Covers the platform itself, not the
intentionally vulnerable targets (those are meant to be vulnerable, but must stay contained).

## Assets

1. User accounts and sessions (especially ADMIN).
2. The VPS host itself.
3. The Kali worker's ability to run security tools (powerful, abusable).
4. Assessment data, findings and reports.
5. Secrets: DB password, session secret, Redis password, TLS keys.

## Trust boundaries

| # | Boundary | Crossing |
|---|---|---|
| B1 | Internet → Nginx | All public traffic |
| B2 | web → api | Proxied API calls |
| B3 | api → Redis queue → worker | Job requests |
| B4 | worker → lab_net targets | Tool traffic into deliberately vulnerable systems |
| B5 | targets → anything else | A compromised target trying to escape |

## Threats and mitigations

| ID | STRIDE | Threat | Mitigation |
|---|---|---|---|
| T1 | Spoofing | Credential stuffing / brute force on login | argon2id hashes, login rate limit 5/min/IP, generic error messages, account lockout after repeated failures, audit `auth.login.failed` |
| T2 | Spoofing | Session theft | Random 256-bit session id stored hashed, `httpOnly`/`Secure`/`SameSite=Strict`, rotation on login, idle + absolute expiry |
| T3 | Tampering | CSRF on state-changing endpoints | SameSite=Strict + double-submit CSRF token |
| T4 | Tampering | SQL injection in the platform | Prisma parameterized queries only; no raw SQL with interpolation; Zod validation |
| T5 | Tampering | XSS in platform UI (e.g. scan output, lesson markdown) | React escaping; markdown rendered with sanitizer (rehype-sanitize); strict CSP; scan output rendered as text only |
| T6 | Elevation | **Command injection via job parameters** | Jobs carry only IDs + profile name; argv templates in code; `execFile` without shell; host/url taken from DB and re-validated against lab CIDR |
| T7 | Elevation | **Using the worker to attack the internet / third parties** | Worker only on `lab_net` (internal) + `core_net`; egress firewall; scope check in api AND worker; intrusive profiles only on flagged targets |
| T8 | Elevation | Container escape from worker or target | Non-root, `cap_drop: ALL` (+ minimal caps for nmap), read-only FS, no Docker socket, seccomp default, resource limits, keep Docker/kernel patched |
| T9 | Elevation | Compromised target pivots to Postgres/Redis | Targets only on `lab_net`; `core_net` unreachable from it; Redis/DB passwords; no shared volumes |
| T10 | Elevation | Horizontal/vertical privilege escalation in API (IDOR) | RBAC middleware per route + ownership checks in services; tests for each role |
| T11 | Info disclosure | Vulnerable targets exposed on the public VPS | Targets publish **no** ports; only Nginx binds 80/443; firewall (ufw) allows 22/80/443 only |
| T12 | Info disclosure | Secrets leaked in repo or logs | `.env` not committed, `.env.example` only; log redaction for passwords/tokens/cookies |
| T13 | Repudiation | Actions can't be traced | Append-only `audit_logs` for logins, job creation, admin actions, with actor/IP |
| T14 | DoS | Job flooding / long-running scans | Per-user job rate limit, queue concurrency cap, per-profile timeout, CPU/mem/pids limits |
| T15 | DoS | API flooding | Nginx + API rate limits, request body size limit |
| T16 | Misuse | Learning modules turned into real attack tooling | Modules F & G are conceptual + detection-focused; no implants, evasion or covert exfil code shipped (spec §4F/§4G) |

## Residual risks / open questions

- A single VPS means a full host compromise exposes everything. Backups of Postgres to off-host storage
  are recommended.
- Running Kali tools needs some capabilities (`NET_RAW`); these are kept to the worker only.
- If the platform ever becomes multi-tenant (many students), per-user lab networks will be needed so
  students can't attack each other's sessions.
