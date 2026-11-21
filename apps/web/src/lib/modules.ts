/**
 * Guided training modules for the operator-facing sidebar (Reconnaissance … Evasion).
 *
 * These pages teach attacking the *separate*, intentionally vulnerable LAB copy of Young Owl
 * (`docker-compose.lab.yml`, VULN_MODE=true, published on LAB_PORT / :8080) from your own Kali
 * machine. They never target the control center you are reading this in.
 *
 * Per the project threat model, the Backdoor/Persistence and Evasion modules stay conceptual and
 * detection-focused: they explain how the techniques work and how a defender finds them, and
 * deliberately ship no working payloads.
 *
 * Content is trusted, authored here (not user input), and rendered with the dependency-free
 * `Markdown` component.
 */

export interface ModuleContent {
  /** URL segment, matches the sidebar href. */
  slug: string;
  title: string;
  summary: string;
  /** Beginner | Intermediate | Advanced | Conceptual */
  level?: string;
  body: string;
}

const reconnaissance = `
# Map before you attack

Reconnaissance is building a picture of the target before you touch anything sensitive: which
technology it runs, which endpoints exist, which accounts are valid, and what the server leaks for
free. Everything here runs against the **lab copy on \`:8080\`**, from your Kali box.

## 1. Fingerprint the stack

Start passively. Headers and page markers already tell you a lot.

\`\`\`
whatweb http://<vps-ip>:8080
curl -sI http://<vps-ip>:8080/
\`\`\`

You are looking for the framework, the title (\`Young Owl\`), cookie names, and any uncommon headers.

## 2. Read what the server volunteers

A careless deployment points you straight at its own soft spots.

- \`GET /robots.txt\` — disallow entries are a map of paths someone wanted hidden.
- Follow the hint it gives. One endpoint answers **without authentication** and dumps configuration
  and environment detail it never should.

That debug endpoint is a textbook **security misconfiguration (OWASP A05)**. It holds the first
flag, **\`FLAG_DEBUG\`** (format \`YO{...}\`). Finding it is the whole exercise — the breadcrumb is in
\`robots.txt\`.

## 3. Enumerate valid users

The login form on the lab copy is deliberately talkative. Submit a known-bad email, then a
plausible one, and compare:

- different wording for *"no such user"* versus *"wrong password"* leaks which emails exist;
- there is no real rate limit, so the lab does not stop repeated guesses.

Build a short list of valid accounts now; you will use it in **Exploitation Lab** and
**Vulnerability Assessment**.

## 4. Record it

Good recon ends as notes, not memory. Capture the stack, the live endpoints, the valid accounts and
\`FLAG_DEBUG\` in an **Assessment** here in the control center so the later phases have something to
build on.

> Defender's view: every step above is noisy. A real target would rate-limit the login, return one
> generic auth error, remove \`robots.txt\` hints, and never expose a debug route. When you run the
> secure copy (VULN_MODE off) you will see exactly those mitigations in place.
`;

const vulnerabilities = `
# Know every weakness, then confirm it

Vulnerability assessment is the bridge between recon and exploitation: you take the map you built,
decide which classes of bug are plausible, and confirm each one with the lightest possible probe —
before you try to exploit it. The lab copy on \`:8080\` has seven weaknesses planted on purpose.

## The planted weaknesses

| # | Class (OWASP) | Where to look | Level | Flag |
| - | ------------- | ------------- | ----- | ---- |
| 1 | SQL injection (A03) | \`/api/v1/targets/search?q=\` and **Lab tools → Target search** | Beginner | \`FLAG_SQLI\` |
| 2 | Broken access control / IDOR (A01) | \`/api/v1/assessments/:id/export\` | Beginner | \`FLAG_IDOR\` |
| 3 | Path traversal (A01) | \`/api/v1/files?name=\` | Intermediate | \`FLAG_TRAVERSAL\` |
| 4 | OS command injection (A03) | \`/api/v1/tools/lookup\` and **Lab tools → Host lookup** | Advanced | \`FLAG_RCE\` |
| 5 | Security misconfiguration (A05) | \`/api/v1/system/debug\` (no auth) | Beginner | \`FLAG_DEBUG\` |
| 6 | Stored XSS (A03) | finding **Description** rendered as raw HTML | Intermediate | prove script runs |
| 7 | Identification & auth failures (A07) | login: enumeration, no rate limit, weak \`intern\` | Beginner | log in as \`intern\` |

## How to confirm without exploiting

The goal of this phase is a **yes/no** on each row, cheaply:

1. **SQLi** — send a single quote in \`q=\`. A 500 or a changed result set is your tell.
2. **IDOR** — note your own assessment id, then request a neighbouring id on the export route.
3. **Path traversal** — ask for a boring file by name, then try to step one directory up.
4. **Command injection** — append a harmless separator to a hostname and watch the timing/output.
5. **Misconfiguration** — hit the debug route unauthenticated; if it answers, it is confirmed.
6. **Stored XSS** — save a finding whose description contains an HTML tag; see if it renders.
7. **Auth** — confirm the enumeration and missing rate limit you found in recon.

Confirm each, write it up as a finding with a severity, then move to **Exploitation Lab** to prove
impact and capture the flags.

> The exact payloads are left to you — that is the exercise. The automated reference in
> \`apps/api/test/vuln-lab.test.ts\` exercises every one of these if you get stuck.
`;

const exploitation = `
# Prove impact, capture the flags

Exploitation turns a confirmed weakness into demonstrated impact. Work the lab copy on \`:8080\` from
Kali, one class at a time, and record each flag in an Assessment as you go. Start easy and climb.

## 1. SQL injection — \`FLAG_SQLI\` · Beginner

The target search is built by string-concatenation. Break out of the intended query through
\`/api/v1/targets/search?q=\` (or **Lab tools → Target search**) and read a row you were never meant
to see. The flag lives in a flags table — a \`UNION\`-style read is the classic route.

## 2. Broken access control / IDOR — \`FLAG_IDOR\` · Beginner

\`GET /api/v1/assessments/:id/export\` trusts the id in the URL and never checks ownership. Export
your own assessment, then walk the id to a **private** one that belongs to another account. The flag
is in that private assessment.

## 3. Path traversal — \`FLAG_TRAVERSAL\` · Intermediate

\`/api/v1/files?name=\` strips \`../\` **once**, so a naive payload fails. Think about what survives a
single non-recursive strip (hint: \`....//\` collapses to \`../\`). Walk out of the intended directory
to the planted flag file.

## 4. OS command injection — \`FLAG_RCE\` · Advanced

\`POST /api/v1/tools/lookup\` (and **Lab tools → Host lookup**) passes your input into a shell. Chain
a second command onto a valid hostname with a shell separator, then read the flag from the host's
environment or filesystem. This is the highest-impact bug on the board — treat it with respect.

## 5. Stored XSS — prove script execution · Intermediate

A finding's **Description** is rendered as raw HTML on the assessment page. Store a payload that
runs when the page loads (an \`<img onerror>\` is harder to filter than a bare \`<script>\`). Success
is proving your code executed in the victim's session — pop something only you could have planted.

## 6. Auth failures — log in as \`intern\` · Beginner

From recon you have valid emails, no rate limit, and a weak password on the \`intern\` account. Put
them together and log in. The point is to feel how a single weak credential plus a talkative login
undoes the whole access model.

> Keep it in the lab. The copy is isolated with no outbound network, a read-only filesystem and an
> in-RAM database that a restart wipes — so command injection and file reads cannot pivot out or do
> lasting harm. Only ever run this against systems you own or are permitted to test.
`;

const persistence = `
# Backdoor & persistence — the defender's view

**This module is conceptual and detection-focused by design. It ships no working payloads.** The
point is to understand how an attacker keeps access after the first break-in, so you can find and
remove it — not to hand you a webshell.

## What "persistence" means

Exploitation gets you in once. Persistence is everything an attacker does so they do not have to
exploit the bug again: a foothold that survives a password reset, a patch, or a reboot.

## Where it commonly hides

- **Web layer** — a planted script in an upload or writable web directory (a "webshell"); a rogue
  admin account; an extra API token.
- **OS layer** — a cron job or systemd timer; an added key in \`~/.ssh/authorized_keys\`; a modified
  service or startup file; a malicious package or container image.

## Why the Young Owl lab resists all of this

The lab copy is built so persistence cannot take hold — and seeing *why* is the lesson:

- **Read-only root filesystem** — nothing can be written where a webshell would live.
- **In-RAM (\`tmpfs\`) database, auto-reset** — any change an attacker makes is wiped on restart.
- **No outbound network** — a backdoor cannot phone home or pull a second stage.
- **Dropped Linux capabilities + \`no-new-privileges\`** — no privilege escalation to the host.

## How a defender finds persistence

1. **File integrity** — compare the running system against a known-good manifest; flag new or
   changed files in web roots and system paths.
2. **Account review** — diff users, admin roles and API tokens against what *should* exist.
3. **Scheduled-task review** — list every cron entry, systemd timer and startup unit and account
   for each one.
4. **Key review** — audit \`authorized_keys\` on every account for keys nobody recognises.
5. **Log review** — look for the login or request that created the artefact, not just the artefact.

> Detection beats cleanup. If you only delete the webshell and miss the cron job that rewrites it,
> you still own the incident — the attacker still owns the box.
`;

const evasion = `
# Evasion & detection — engineering for the defender

**This module is conceptual and detection-focused by design. It ships no working evasion
techniques.** You study how attackers try to stay unseen so you can build detections that see them
anyway.

## What attackers try (at a high level)

- **Blend in** — use tools already on the box ("living off the land") instead of dropping new
  binaries that stand out.
- **Obfuscate** — encode or stage payloads so a single signature does not match.
- **Go slow** — spread actions over time to stay under rate- and volume-based alerts.
- **Hide the exit** — tunnel stolen data inside traffic that looks normal (DNS, HTTPS) rather than
  an obvious upload.
- **Cover tracks** — clear or tamper with logs after the fact.

## What beats each of those

Detection engineering answers evasion with layers that are hard to defeat at once:

| Attacker move | Defender control |
| ------------- | ---------------- |
| Living off the land | Baseline normal process/command behaviour; alert on anomalies, not just known-bad |
| Obfuscated payload | Detect on *behaviour* (what it does) rather than static signatures |
| Low-and-slow | Correlate across time and across hosts, not single events |
| Covert exfiltration | **Egress monitoring** — watch and restrict what leaves the network |
| Log tampering | Ship logs off-box to **append-only / immutable** storage in real time |

## The lab as a worked example

The Young Owl lab is a live illustration of the strongest control above: its firewall
(\`infrastructure/lab/firewall.sh\`) **drops all new outbound connections** from the lab network. No
matter how clever the exfiltration channel is, there is nowhere for the data to go. That is egress
control doing exactly its job.

> The defender's edge is the aggregate. Any single signal can be evaded; a well-instrumented
> environment that correlates logins, process behaviour and egress together is far harder to slip
> past unseen.
`;

export const MODULES: Record<string, ModuleContent> = {
  reconnaissance: {
    slug: 'reconnaissance',
    title: 'Reconnaissance',
    summary:
      'Fingerprint the lab, read what it leaks, and enumerate valid accounts before you attack.',
    level: 'Beginner',
    body: reconnaissance.trim(),
  },
  vulnerabilities: {
    slug: 'vulnerabilities',
    title: 'Vulnerability Assessment',
    summary: 'The seven planted weaknesses and how to confirm each one with a light probe.',
    level: 'Beginner → Advanced',
    body: vulnerabilities.trim(),
  },
  exploitation: {
    slug: 'exploitation',
    title: 'Exploitation Lab',
    summary:
      'Guided exercises that turn each confirmed weakness into impact — and capture the flags.',
    level: 'Beginner → Advanced',
    body: exploitation.trim(),
  },
  persistence: {
    slug: 'persistence',
    title: 'Backdoor & Persistence',
    summary:
      'How backdoors and persistence work, why the lab resists them, and how a defender finds them.',
    level: 'Conceptual',
    body: persistence.trim(),
  },
  evasion: {
    slug: 'evasion',
    title: 'Evasion & Detection',
    summary: 'Defence-evasion patterns from the defender side, and the detections that beat them.',
    level: 'Conceptual',
    body: evasion.trim(),
  },
};
