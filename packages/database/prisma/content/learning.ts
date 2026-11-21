/**
 * Learning Center content (Phase 4). Real lesson bodies and quiz questions.
 *
 * Teaching stance (spec §4 and threat model): offensive technique is taught only against the
 * project's own lab targets. Backdoor/persistence and evasion modules stay conceptual and
 * detection-focused — how the technique works and how a defender spots and removes it — never a
 * copy-paste weapon.
 */

export interface LessonContent {
  slug: string;
  title: string;
  estimatedMinutes: number;
  /** Optional lab slug this lesson sends the learner to practise in. */
  labSlug?: string;
  markdown: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ModuleContent {
  slug: string;
  title: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  description: string;
  lessons: LessonContent[];
  quiz: { title: string; passingScore: number; questions: QuizQuestion[] };
}

const L = (
  slug: string,
  title: string,
  estimatedMinutes: number,
  markdown: string,
): LessonContent => ({
  slug,
  title,
  estimatedMinutes,
  markdown: markdown.trim() + '\n',
});

export const LEARNING_MODULES: ModuleContent[] = [
  {
    slug: 'reconnaissance',
    title: 'Reconnaissance',
    category: 'C',
    difficulty: 'BEGINNER',
    description: 'Network discovery, port scanning, service and DNS enumeration, fingerprinting.',
    lessons: [
      L(
        'network-discovery',
        'Network discovery',
        10,
        `
# Network discovery

Reconnaissance is the first phase of a penetration test: you build a map of what exists before you
touch anything. **Passive** recon reads public sources without sending packets to the target;
**active** recon sends traffic and is noisier.

## Host discovery
On an authorized internal range, a ping sweep finds live hosts:

\`\`\`bash
nmap -sn 10.0.0.0/24        # -sn = no port scan, just "is it up?"
\`\`\`

\`-sn\` uses ICMP echo, a TCP ACK to 80, and ARP on the local segment. Many hosts block ICMP, so a
quiet range does not mean an empty one.

## Rules of engagement
Only scan hosts you own or are explicitly authorized to test. In Young Owl that means the lab
targets and nothing else. Record the scope (CIDR, time window) before you start.
`,
      ),
      L(
        'port-scanning-with-nmap',
        'Port scanning with Nmap',
        15,
        `
# Port scanning with Nmap

A port scan tells you which TCP/UDP services a host is listening on.

\`\`\`bash
nmap -sS -p- 10.0.0.5          # SYN scan, all 65535 TCP ports
nmap -sV -p 22,80,443 host    # probe versions on specific ports
\`\`\`

- **\`-sS\` (SYN / half-open):** sends SYN, reads SYN-ACK (open) or RST (closed), never completes
  the handshake. Needs raw-socket privileges.
- **\`-sT\` (connect):** full TCP handshake; works without privileges but is louder and logged.
- **\`-sU\`:** UDP, slow and unreliable because closed UDP ports often stay silent.

Scan speed (\`-T0\`..\`-T5\`) trades stealth for time. On the lab, \`-T4\` is fine.
`,
      ),
      L(
        'service-enumeration',
        'Service enumeration',
        15,
        `
# Service enumeration

Once a port is open, identify the service and version — that is what maps to known vulnerabilities.

\`\`\`bash
nmap -sV --script=banner host
whatweb http://target
\`\`\`

\`-sV\` sends probes and matches replies against Nmap's signature database. The **NSE** (Nmap
Scripting Engine) adds checks: \`--script=http-title,http-headers\`. Banner grabbing with \`nc host 80\`
then \`HEAD / HTTP/1.0\` shows the server header by hand.

A precise version (e.g. "OpenSSH 8.2p1") lets you look up CVEs; a vague one ("Apache") does not.
`,
      ),
      L(
        'dns-subdomain-enumeration',
        'DNS & subdomain enumeration',
        15,
        `
# DNS & subdomain enumeration

DNS reveals a surprising amount of attack surface.

\`\`\`bash
dig axfr @ns1.example.com example.com   # zone transfer (usually blocked)
dnsenum example.com
\`\`\`

- **Record types:** A/AAAA (hosts), MX (mail), TXT (SPF/verification), NS (name servers).
- **Zone transfer (AXFR):** a misconfigured server hands over every record at once — a classic
  finding.
- **Subdomain brute force / passive sources:** certificate transparency logs (crt.sh) list
  hostnames that were issued TLS certs, often exposing staging and admin hosts.
`,
      ),
      L(
        'technology-fingerprinting',
        'Technology fingerprinting',
        10,
        `
# Technology fingerprinting

Fingerprinting names the stack: web server, framework, CMS, language.

- Response headers (\`Server\`, \`X-Powered-By\`), cookie names (\`PHPSESSID\`, \`JSESSIONID\`).
- Error pages and default files (\`/robots.txt\`, \`/.git/\`, framework 404 pages).
- Tools: \`whatweb\`, \`wappalyzer\`, \`nmap -sV\`.

Why it matters: the stack decides which attacks are even possible. A finding of "Node.js /
Express" sends you toward prototype-pollution and dependency CVEs; "PHP / MySQL" toward classic
SQL injection. Note each detail in your assessment so the report is reproducible.
`,
      ),
    ],
    quiz: {
      title: 'Reconnaissance quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'What does `nmap -sn 10.0.0.0/24` do?',
          options: [
            'Scans all TCP ports on one host',
            'Discovers live hosts without scanning ports',
            'Performs a UDP scan',
            'Transfers a DNS zone',
          ],
          answerIndex: 1,
          explanation: '`-sn` disables the port scan and only checks which hosts are up.',
        },
        {
          id: 'q2',
          prompt: 'Why is a SYN scan (`-sS`) considered stealthier than a connect scan (`-sT`)?',
          options: [
            'It uses UDP instead of TCP',
            'It never completes the TCP handshake, so fewer apps log it',
            'It only scans port 443',
            'It encrypts the scan traffic',
          ],
          answerIndex: 1,
          explanation:
            'SYN scanning sends RST after the SYN-ACK, so the connection is never fully established.',
        },
        {
          id: 'q3',
          prompt: 'A successful DNS zone transfer (AXFR) usually indicates:',
          options: [
            'A strong security posture',
            'A misconfigured name server leaking all its records',
            'That the domain has no subdomains',
            'A firewall blocking port 53',
          ],
          answerIndex: 1,
          explanation: 'AXFR should be restricted; an open one dumps the whole zone to anyone.',
        },
      ],
    },
  },
  {
    slug: 'vulnerability-assessment',
    title: 'Vulnerability Assessment',
    category: 'D',
    difficulty: 'BEGINNER',
    description:
      'OWASP Top 10: SQLi, XSS, IDOR, CSRF, SSRF, auth flaws, misconfiguration, uploads.',
    lessons: [
      L(
        'sql-injection',
        'SQL injection',
        15,
        `
# SQL injection (OWASP A03)

SQL injection happens when user input is concatenated into a SQL query instead of being passed as a
parameter. The input changes the query's meaning.

Vulnerable (pseudocode):

\`\`\`js
db.query("SELECT * FROM users WHERE name LIKE '%" + q + "%'")
\`\`\`

Sending \`q = ' OR '1'='1\` turns the WHERE clause always-true. A \`UNION SELECT\` can read other
tables. **The fix is always parameterized queries / prepared statements**, which send data and code
separately:

\`\`\`js
db.query('SELECT * FROM users WHERE name LIKE $1', ['%' + q + '%'])
\`\`\`

Practise on the Young Owl lab (lab mode): the target-search endpoint is deliberately vulnerable.
`,
      ),
      L(
        'cross-site-scripting',
        'Cross-site scripting (XSS)',
        15,
        `
# Cross-site scripting (OWASP A03)

XSS runs attacker-controlled JavaScript in another user's browser.

- **Stored:** the payload is saved (a comment, a finding description) and runs for everyone who
  views it.
- **Reflected:** the payload is in the request (a query parameter) and reflected into the response.
- **DOM-based:** client-side JS writes untrusted data into the page.

Cause: untrusted data is inserted into HTML without encoding (e.g. \`innerHTML = input\`). Fixes:
output-encode for the context, prefer \`textContent\`, and add a Content-Security-Policy. The Young
Owl lab renders a finding's description as raw HTML on purpose — a stored-XSS exercise.
`,
      ),
      L(
        'idor',
        'IDOR & broken access control',
        10,
        `
# IDOR (OWASP A01)

Insecure Direct Object Reference: the app uses a user-supplied id to fetch a record but never checks
that the record belongs to the caller. Changing \`/invoices/1001\` to \`/invoices/1002\` returns
someone else's data.

Fix: every object lookup must be scoped to the authenticated user's permissions on the server. In
Young Owl's normal mode the API returns **404, not 403**, for assessments you do not own, so it does
not even confirm the record exists. Lab mode adds an \`/export\` route with the owner check removed so
you can practise.
`,
      ),
      L(
        'csrf',
        'CSRF',
        10,
        `
# Cross-site request forgery (CSRF)

CSRF makes a logged-in victim's browser send a state-changing request they did not intend, using
their session cookie. It works when the only thing authorizing a request is a cookie the browser
attaches automatically.

Defenses, layered:
- **SameSite cookies** (\`Strict\`/\`Lax\`) stop the cookie riding along on cross-site requests.
- **Anti-CSRF tokens** (double-submit or synchronizer): a value the attacker's page cannot read.
- Check \`Origin\`/\`Referer\` on sensitive endpoints.

Young Owl uses a \`SameSite=Strict\` session cookie plus a double-submit \`yo_csrf\` token.
`,
      ),
      L(
        'ssrf',
        'SSRF',
        10,
        `
# Server-side request forgery (OWASP A10)

In SSRF, the attacker makes the **server** send a request to a location of their choosing. If a
feature fetches a user-supplied URL, \`http://169.254.169.254/\` (cloud metadata) or internal-only
hosts become reachable through the server.

Fixes: allow-list the hosts/schemes the server may fetch, resolve and validate the IP (block private
ranges and link-local), and never let the fetch follow redirects into blocked ranges. This is why
Young Owl's lab network blocks outbound traffic — an SSRF or RCE there cannot pivot out.
`,
      ),
      L(
        'file-upload-vulnerabilities',
        'File upload vulnerabilities',
        10,
        `
# File upload vulnerabilities

Unrestricted uploads let an attacker place a file the server will later execute or serve. Uploading
\`shell.php\` to a directory served by PHP can give code execution.

Controls: validate type by content (magic bytes) not just extension, store uploads outside the web
root, generate random names, set a restrictive \`Content-Type\`, and never serve uploads from a path
that an interpreter runs. Cap size to blunt denial-of-service.
`,
      ),
    ],
    quiz: {
      title: 'Vulnerability Assessment quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'The single most reliable fix for SQL injection is:',
          options: [
            'Escaping quotes in the input',
            'A web application firewall',
            'Parameterized queries / prepared statements',
            'Hiding database error messages',
          ],
          answerIndex: 2,
          explanation:
            'Parameterization separates code from data so input can never change the query.',
        },
        {
          id: 'q2',
          prompt: 'Which XSS type is saved on the server and runs for every viewer?',
          options: ['Reflected', 'Stored', 'DOM-based', 'Blind SSRF'],
          answerIndex: 1,
          explanation:
            'Stored XSS persists in the data store and executes whenever the data is rendered.',
        },
        {
          id: 'q3',
          prompt: 'An IDOR vulnerability is best prevented by:',
          options: [
            'Using UUIDs instead of integer ids',
            'Server-side authorization checks on every object access',
            'Rate limiting the endpoint',
            'Returning 403 instead of 404',
          ],
          answerIndex: 1,
          explanation:
            'Unpredictable ids help a little, but only an ownership/permission check actually stops IDOR.',
        },
        {
          id: 'q4',
          prompt: 'SameSite=Strict cookies primarily defend against:',
          options: ['SQL injection', 'CSRF', 'XSS', 'Path traversal'],
          answerIndex: 1,
          explanation:
            'SameSite stops the session cookie from being sent on cross-site requests, blunting CSRF.',
        },
      ],
    },
  },
  {
    slug: 'exploitation-lab',
    title: 'Exploitation Laboratory',
    category: 'E',
    difficulty: 'INTERMEDIATE',
    description: 'Guided, isolated exercises against the Young Owl lab targets.',
    lessons: [
      L(
        'lab-rules',
        'Lab rules & setup',
        10,
        `
# Lab rules & setup

Everything in this module runs against **Young Owl in lab mode** (\`VULN_MODE=true\`) or the shipped
vulnerable targets — never anything else. The lab is isolated: dummy data, its own network, no route
to the internet, auto-reset. See [lab mode](/docs/lab-mode.md).

Set up from your Kali box:
1. Point your browser at the lab URL (default \`http://<vps>:8080\`).
2. Keep notes in the **normal** Young Owl copy: create an assessment, log findings as you go.
3. Capture the flag strings (\`YO{...}\`) as proof.
`,
      ),
      L(
        'sqli-on-the-dummy-database',
        'SQLi on the dummy database',
        20,
        `
# Exercise: SQL injection

**Target:** the lab target-search endpoint. **Goal:** read a row from a table the UI never shows.

1. Find the search box (Lab tools → Target search) and watch how input reaches the query.
2. Break out of the string with a quote and observe the database error — the lab echoes it, which
   leaks the query shape.
3. Use \`UNION SELECT\` with the right number/typed columns to read another table.
4. Record the flag and write the finding: severity, evidence (your payload), remediation
   (parameterized queries).

This mirrors the "SQL injection" lesson in Vulnerability Assessment — now you do it for real.
`,
      ),
      L(
        'xss-on-juice-shop',
        'Stored XSS in the lab',
        20,
        `
# Exercise: stored XSS

**Target:** a finding's description in lab mode, rendered as raw HTML.

1. Create an assessment and add a finding whose description contains a benign proof payload, e.g.
   \`<img src=x onerror="document.title='xss'">\`.
2. Open the assessment page and confirm the script runs (title changes) — proof without harm.
3. Explain the impact (session theft, actions as the victim) and the fix (output encoding + CSP) in
   your write-up.

Keep payloads non-destructive: the point is to demonstrate execution, not to damage the lab.
`,
      ),
      L(
        'authentication-bypass-in-the-lab',
        'Auth weaknesses in the lab',
        15,
        `
# Exercise: authentication weaknesses

Lab mode weakens login on purpose.

1. **User enumeration:** the error message differs for a known vs unknown email. Use it to confirm
   valid accounts.
2. **No rate limit:** the lab removes the brute-force cap. With a known account and a small
   wordlist, show how a weak password (the seeded \`intern\`) falls.
3. Write it up: the fix is a generic error message, rate limiting / lockout, and strong password
   policy. Compare with the normal copy, which keeps all three.
`,
      ),
      L(
        'idor-in-the-lab',
        'IDOR in the lab',
        15,
        `
# Exercise: IDOR

**Target:** the lab \`/assessments/:id/export\` route, which drops the owner check.

1. As a low-privilege user, note your own assessment ids.
2. Enumerate other ids and export one you do not own — the private admin assessment holds a flag.
3. Contrast with normal mode, where the same request returns 404. Write up the broken access control
   and the server-side authorization fix.
`,
      ),
    ],
    quiz: {
      title: 'Exploitation Laboratory quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'Why is it safe to run these exploits against the Young Owl lab copy?',
          options: [
            'The exploits are fake',
            'It is isolated: dummy data, no internet route, and it auto-resets',
            'Because the attacker is authenticated',
            'It runs on the attacker machine',
          ],
          answerIndex: 1,
          explanation:
            'Lab isolation (own network, no egress, reset) is what makes deliberate exploitation safe.',
        },
        {
          id: 'q2',
          prompt: 'In the stored-XSS exercise, a responsible proof payload should:',
          options: [
            'Delete the database',
            'Exfiltrate real user cookies',
            'Demonstrate execution harmlessly, e.g. change the page title',
            'Crash the server',
          ],
          answerIndex: 2,
          explanation:
            'Prove the vulnerability without causing damage; the lab holds only dummy data anyway.',
        },
        {
          id: 'q3',
          prompt: 'The IDOR exercise works in lab mode because:',
          options: [
            'The export route has had its owner check removed',
            'The database is encrypted',
            'The user is an admin',
            'There is no authentication',
          ],
          answerIndex: 0,
          explanation:
            'Normal mode returns 404 for assessments you do not own; lab mode drops that check.',
        },
      ],
    },
  },
  {
    slug: 'backdoor-persistence',
    title: 'Backdoor & Persistence (Detection)',
    category: 'F',
    difficulty: 'ADVANCED',
    description:
      'How backdoors and persistence work, and how a defender detects and removes them. Conceptual only.',
    lessons: [
      L(
        'what-a-backdoor-is',
        'What a backdoor is (concepts)',
        10,
        `
# What a backdoor is

> This module is **conceptual and detection-focused**. It explains how these techniques work so you
> can find and remove them. It contains no ready-to-run offensive payloads.

A backdoor is any mechanism that gives an attacker access to a system outside the normal
authentication path, after the initial compromise. It can be an added account, a modified binary, a
scheduled task, a web shell, or a service listening on an odd port.

Defenders care about two questions: *how would an attacker keep access here?* and *what trace would
that leave?* The rest of the module answers the second.
`,
      ),
      L(
        'reverse-vs-bind-shells',
        'Reverse vs bind shells (conceptual)',
        10,
        `
# Reverse vs bind shells (conceptual)

Two classic command-channel shapes:

- **Bind shell:** the victim listens on a port; the attacker connects in. Easy for a firewall to
  block inbound, so less common today.
- **Reverse shell:** the victim connects *out* to the attacker. It defeats inbound firewalls, which
  is why egress filtering matters.

**Detection angle (the point here):** a server process that opens an outbound connection to an
unusual host/port is suspicious. Baseline normal egress, then alert on a web or database process
spawning \`sh\`/\`bash\` with a socket. Young Owl's lab blocks egress precisely to neutralize this.
`,
      ),
      L(
        'persistence-mechanisms',
        'Persistence mechanisms: cron, systemd, startup',
        15,
        `
# Persistence mechanisms (and where to look)

Persistence survives a reboot. Common Linux footholds and the artifacts they leave:

| Mechanism | Where to inspect |
|---|---|
| Cron jobs | \`/etc/crontab\`, \`/etc/cron.*\`, \`crontab -l\` per user |
| systemd units | \`systemctl list-units\`, \`/etc/systemd/system/\`, \`~/.config/systemd\` |
| Shell rc files | \`~/.bashrc\`, \`~/.profile\`, \`/etc/profile.d\` |
| Added users / keys | \`/etc/passwd\`, \`~/.ssh/authorized_keys\` |

Hunt by **diffing against a known-good baseline** and by looking for recently modified files in these
locations. An unexpected unit that runs a script from \`/tmp\` is a red flag.
`,
      ),
      L(
        'c2-architecture-overview',
        'C2 architecture overview',
        10,
        `
# Command-and-control (C2) overview

C2 is how an attacker controls compromised hosts. Conceptually: an implant beacons out to a
controller on an interval, fetches tasks, and returns results. Modern C2 hides in normal-looking
traffic (HTTPS, DNS, cloud services).

**Detection angle:** look for beaconing — regular, similarly sized outbound connections to a rare
destination (low "jitter"). Network baselining, JA3/TLS fingerprints, and DNS volume anomalies are
the defender's tools. We study the pattern to write detections, not to build an implant.
`,
      ),
      L(
        'hunting-and-removing-persistence',
        'Hunting & removing unauthorized persistence',
        15,
        `
# Hunting & removing persistence

A practical defender workflow:

1. **Collect** the current state: scheduled tasks, services, startup files, users, listening
   sockets (\`ss -tlnp\`), authorized keys.
2. **Compare** against a baseline or a freshly imaged peer.
3. **Investigate** anything new: when was it created, by whom, what does it run?
4. **Remove** the mechanism *and* the access it granted (rotate creds, remove keys/accounts).
5. **Root-cause:** how did they get in? Persistence is a symptom.

Tie this to Incident Response: document every artifact as evidence before you delete it.
`,
      ),
    ],
    quiz: {
      title: 'Backdoor & Persistence quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'Why does a reverse shell defeat many firewalls?',
          options: [
            'It uses encryption',
            'The victim connects outbound, bypassing inbound filtering',
            'It runs as root',
            'It uses UDP',
          ],
          answerIndex: 1,
          explanation:
            'Inbound rules do not stop a connection the victim initiates outward; egress filtering does.',
        },
        {
          id: 'q2',
          prompt: 'Which is NOT a common Linux persistence location to inspect?',
          options: ['cron jobs', 'systemd units', '~/.ssh/authorized_keys', 'the CPU cache'],
          answerIndex: 3,
          explanation:
            'Persistence lives in schedulers, services, startup files and credentials — not volatile CPU cache.',
        },
        {
          id: 'q3',
          prompt: 'A good network indicator of C2 beaconing is:',
          options: [
            'High bandwidth file downloads',
            'Regular, similar-sized connections to a rare destination',
            'A single DNS lookup',
            'An expired TLS certificate',
          ],
          answerIndex: 1,
          explanation: 'Low-jitter periodic beacons to an uncommon host are a classic C2 pattern.',
        },
      ],
    },
  },
  {
    slug: 'evasion-detection',
    title: 'Evasion & Exit (Detection Engineering)',
    category: 'G',
    difficulty: 'ADVANCED',
    description:
      'Defense-evasion and exfiltration as threat patterns, studied from the defender side.',
    lessons: [
      L(
        'defense-evasion-concepts',
        'Defense evasion concepts',
        10,
        `
# Defense evasion concepts

> Detection-engineering module: we study evasion to **detect** it, not to perform it.

Evasion is how an attacker avoids controls and logging: disabling agents, clearing logs, renaming
tools, living off the land (using built-in binaries so nothing new appears on disk). Mapped to
MITRE ATT&CK, this is the **Defense Evasion** tactic.

The defender's response is layered telemetry: if one source is tampered with, others still see the
activity. That is why centralized, append-only logging matters.
`,
      ),
      L(
        'spotting-log-tampering',
        'Spotting log tampering',
        10,
        `
# Spotting log tampering

If logs can be edited on the host, they cannot be fully trusted. Indicators:

- Gaps: a quiet window with no events where there should be some.
- A cleared log (Linux: \`auth.log\` truncated; Windows: event ID 1102 "audit log cleared").
- Timestamps out of order, or a log file's mtime newer than its last entry.

Defenses: ship logs off-host in real time to a SIEM, make them append-only, and alert on the
"log cleared" events themselves. Absence of evidence becomes evidence.
`,
      ),
      L(
        'anti-forensics-indicators',
        'Anti-forensics indicators',
        10,
        `
# Anti-forensics indicators

Attackers try to destroy evidence. Watch for:

- **Timestomping:** file timestamps that do not match the filesystem's own metadata (compare MACB
  times; \`$STANDARD_INFORMATION\` vs \`$FILE_NAME\` on NTFS).
- **Secure deletion / wiping tools** present on the host.
- **History tampering:** \`HISTFILE\` unset, \`~/.bash_history\` emptied or linked to /dev/null.

Each of these is itself a detection opportunity — the act of hiding leaves its own trace.
`,
      ),
      L(
        'exfiltration-indicators',
        'Exfiltration indicators in traffic',
        10,
        `
# Exfiltration indicators

Data leaving the network has patterns you can alert on:

- Large outbound transfers to a new external host, especially off-hours.
- **DNS exfiltration:** long, high-entropy subdomain labels and abnormal query volume.
- Data going to cloud storage or paste sites that the org does not normally use.

Controls: egress filtering and allow-lists, DLP, and baselining normal outbound volume per host.
Young Owl's lab blocks egress entirely so exfil simply fails.
`,
      ),
      L(
        'writing-detection-rules',
        'Writing detection rules',
        15,
        `
# Writing detection rules

Turn a pattern into a repeatable alert.

- **Sigma** gives a vendor-neutral YAML rule you can convert to many SIEM queries.
- A good rule names the data source, the logic, the false-positive notes, and a severity.
- Test against both malicious and benign samples to measure false positives before you deploy.

Example logic (prose): *alert when a web-server process spawns a shell that opens an outbound
socket*. That single rule would catch the reverse-shell pattern from the previous module.
`,
      ),
    ],
    quiz: {
      title: 'Evasion & Detection quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'Why ship logs to a central SIEM in real time?',
          options: [
            'To save disk space',
            'So host-side tampering cannot erase evidence already collected',
            'To speed up the host',
            'Because local logs are encrypted',
          ],
          answerIndex: 1,
          explanation:
            'Off-host, append-only logs survive even if the attacker clears the local copy.',
        },
        {
          id: 'q2',
          prompt: 'High-entropy, unusually long DNS subdomain labels can indicate:',
          options: ['A CDN', 'DNS-based data exfiltration', 'A zone transfer', 'DNSSEC'],
          answerIndex: 1,
          explanation:
            'Encoding data into subdomains produces long, random-looking labels and high query volume.',
        },
        {
          id: 'q3',
          prompt: 'What is Sigma used for?',
          options: [
            'Exploiting SQL injection',
            'Writing vendor-neutral detection rules',
            'Scanning ports',
            'Cracking passwords',
          ],
          answerIndex: 1,
          explanation: 'Sigma is a generic rule format that converts to many SIEM query languages.',
        },
      ],
    },
  },
  {
    slug: 'incident-response',
    title: 'Incident Response & Forensics',
    category: 'G',
    difficulty: 'INTERMEDIATE',
    description: 'Triage, evidence handling, and timeline building.',
    lessons: [
      L(
        'ir-lifecycle',
        'The IR lifecycle',
        10,
        `
# The incident-response lifecycle

A common framework (NIST / SANS) has six phases:

1. **Preparation** — tooling, logging, runbooks, contacts.
2. **Identification** — confirm an incident is real and scope it.
3. **Containment** — stop the spread (isolate hosts), short- and long-term.
4. **Eradication** — remove the foothold and root cause.
5. **Recovery** — restore clean systems, monitor closely.
6. **Lessons learned** — write the post-incident report.

Containment before eradication: isolate first so the attacker cannot react while you clean up.
`,
      ),
      L(
        'evidence-collection',
        'Evidence collection & chain of custody',
        15,
        `
# Evidence collection

Collect in **order of volatility** — the most ephemeral first:

1. Memory (RAM), running processes, network connections.
2. Disk (forensic image).
3. Logs and configuration.

Preserve integrity: hash every artifact (\`sha256sum\`), work on copies not originals, and keep a
**chain of custody** — who collected what, when, and where it was stored. Evidence that cannot be
shown to be unaltered is worthless in a review.
`,
      ),
      L(
        'timeline-analysis',
        'Timeline analysis',
        15,
        `
# Timeline analysis

A timeline orders events across sources into one story: *what happened, in what order*.

- Gather timestamps from filesystem (MACB), logs, and application records.
- Normalize to one timezone (UTC) to avoid off-by-hours errors.
- Look for the **initial access** event and work forward to impact.

Tools like Plaso/\`log2timeline\` build "super timelines". The output feeds the incident report and,
in Young Owl terms, the findings and remediation you record on the assessment.
`,
      ),
    ],
    quiz: {
      title: 'Incident Response quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'In the IR lifecycle, containment comes:',
          options: [
            'After recovery',
            'Before eradication',
            'Only during preparation',
            'After lessons learned',
          ],
          answerIndex: 1,
          explanation: 'You isolate to stop the spread before removing the foothold.',
        },
        {
          id: 'q2',
          prompt: 'The order-of-volatility principle says to collect first:',
          options: ['Disk images', 'Memory and live state', 'Printed logs', 'Backups'],
          answerIndex: 1,
          explanation: 'RAM and live connections vanish on reboot, so capture them before disk.',
        },
        {
          id: 'q3',
          prompt: 'Why normalize all timestamps to UTC in a timeline?',
          options: [
            'It looks professional',
            'To avoid off-by-hours errors when correlating sources',
            'UTC is required by law',
            'It compresses the data',
          ],
          answerIndex: 1,
          explanation:
            'Mixed timezones silently misorder events; one timezone keeps the sequence correct.',
        },
      ],
    },
  },
  {
    slug: 'reporting',
    title: 'Writing Security Reports',
    category: 'H',
    difficulty: 'BEGINNER',
    description: 'Severity, CVSS, evidence and remediation write-ups.',
    lessons: [
      L(
        'cvss-basics',
        'CVSS 3.1 basics',
        15,
        `
# CVSS 3.1 basics

CVSS turns a vulnerability into a 0–10 score so findings can be compared and prioritized. The
**Base** score (the part Young Owl computes) comes from a vector such as:

\`\`\`
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H  → 9.8 (Critical)
\`\`\`

- **AV** attack vector (Network→Local→Physical), **AC** complexity, **PR** privileges required,
  **UI** user interaction.
- **S** scope, and the **CIA** impacts (Confidentiality/Integrity/Availability).

Score bands: 0.1–3.9 Low, 4.0–6.9 Medium, 7.0–8.9 High, 9.0–10 Critical. When you add a finding in
Young Owl, pasting the vector fills the score and severity automatically.
`,
      ),
      L(
        'writing-a-finding',
        'Writing a finding',
        10,
        `
# Writing a finding

A useful finding is reproducible and actionable. Include:

1. **Title & severity** — what and how bad (with the CVSS vector).
2. **Description** — the vulnerability in plain language.
3. **Evidence** — exact request/response or payload, enough to reproduce.
4. **Impact** — what an attacker gains.
5. **Remediation** — the concrete fix, not "sanitize input".

Write for two audiences: an engineer who will fix it and a manager who decides priority. Young Owl's
report export bundles your findings into a Markdown or JSON deliverable.
`,
      ),
    ],
    quiz: {
      title: 'Reporting quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          prompt: 'A CVSS base score of 9.8 falls in which severity band?',
          options: ['Medium', 'High', 'Critical', 'Low'],
          answerIndex: 2,
          explanation: '9.0–10.0 is Critical.',
        },
        {
          id: 'q2',
          prompt: 'In a CVSS vector, `AV:N` means:',
          options: [
            'Attack requires physical access',
            'Attack is exploitable over the network',
            'No availability impact',
            'No authentication',
          ],
          answerIndex: 1,
          explanation: 'AV:N = Network — the most exposed attack vector.',
        },
        {
          id: 'q3',
          prompt: 'The best remediation text is:',
          options: [
            '"Fix the bug"',
            '"Sanitize input"',
            'A concrete, specific change (e.g. "use parameterized queries for this query")',
            'A link to OWASP',
          ],
          answerIndex: 2,
          explanation:
            'Remediation must be specific and actionable for the engineer who implements it.',
        },
      ],
    },
  },
];
