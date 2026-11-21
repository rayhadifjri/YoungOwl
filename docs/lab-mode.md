# Lab mode — attacking Young Owl itself

Lab mode runs a second, deliberately vulnerable copy of Young Owl so you can practise against it
from your own Kali machine. The data in it is dummy data; the point is the attack surface, not the
data behind it.

> ⚠️ Only ever point your own tools at this lab, or at systems you own or have written permission to
> test. The lab copy is isolated on purpose (see [Isolation](#isolation)); keep it that way.

## Two copies, one codebase

The same code runs in two modes, chosen by the `VULN_MODE` environment variable:

|                      | Normal copy (`docker-compose.yml`)            | Lab copy (`docker-compose.lab.yml`)      |
| -------------------- | --------------------------------------------- | ---------------------------------------- |
| `VULN_MODE`          | `false`                                       | `true`                                   |
| Role                 | Your control center: notes, findings, reports | The target you attack from Kali          |
| Database             | `youngowl`                                    | `youngowl_lab` (separate, dummy, in RAM) |
| Vulnerable endpoints | not loaded                                    | loaded                                   |
| Exposure             | `127.0.0.1` only, behind HTTPS later          | published port, reachable from your Kali |

When `VULN_MODE` is off, none of the vulnerable code runs: the extra routes are never registered,
the login keeps its brute-force limit and generic error message, and the finding description is
escaped. A guard rail in `config.ts` refuses to start in lab mode unless the database name ends in
`_lab`, so you cannot point the vulnerable build at your real data by mistake.

## Running the lab

On the VPS (or locally with Docker):

```bash
docker compose -f docker-compose.lab.yml -p youngowl-lab up -d --build
sudo bash infrastructure/lab/firewall.sh    # block the lab from reaching out
```

The lab web app is published on port `8080` by default (`LAB_PORT`). Point your Kali browser and
tools at `http://<vps-ip>:8080`. Log in with the seeded `admin@youngowl.lab` / `student@youngowl.lab`
accounts, or find your own way in.

Reset it to a clean state any time:

```bash
bash infrastructure/lab/reset.sh
```

A cron entry keeps it fresh automatically (example every 6 hours):

```cron
0 */6 * * * cd /opt/YoungOwl && bash infrastructure/lab/reset.sh >> /var/log/youngowl-lab-reset.log 2>&1
```

## Isolation

The lab is built to be attacked without putting the VPS or your real Young Owl at risk:

- **Separate database.** `youngowl_lab`, seeded with dummy data only, stored in a RAM `tmpfs` so a
  restart wipes anything an attacker changed.
- **No route to the real stack.** The lab uses its own Docker networks and shares nothing with
  `docker-compose.yml`.
- **No outbound internet.** `infrastructure/lab/firewall.sh` adds `DOCKER-USER` and `INPUT` rules
  that drop new connections started by the lab network, so even the command-injection and
  file-read bugs can't be used to pivot out, reach the host, or exfiltrate. It only answers people
  who connect to the published port.
- **Locked-down containers.** Read-only root filesystem, all Linux capabilities dropped,
  `no-new-privileges`, and CPU/memory/PID limits.
- **Auto-reset.** `reset.sh` tears the whole lab down (including volumes) and rebuilds it.

Run the lab on a separate VPS from anything you care about if you can.

## What's planted (and the flags)

Each weakness is a common, real-world class. Capture-the-flag strings look like `YO{...}`. Flag
values come from environment variables, so change them for a group exercise.

| #   | Class (OWASP)                        | Where                                                                      | Level        | Flag                                  |
| --- | ------------------------------------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------- |
| 1   | SQL injection (A03)                  | `GET /api/v1/targets/search?q=` and the **Lab tools → Target search** page | Beginner     | `FLAG_SQLI` in `lab_flags`            |
| 2   | Broken access control / IDOR (A01)   | `GET /api/v1/assessments/:id/export`                                       | Beginner     | `FLAG_IDOR` in the private assessment |
| 3   | Path traversal (A01)                 | `GET /api/v1/files?name=` — strips `../` once, so `....//` survives        | Intermediate | `FLAG_TRAVERSAL`                      |
| 4   | OS command injection (A03)           | `POST /api/v1/tools/lookup` and **Lab tools → Host lookup**                | Advanced     | `FLAG_RCE`                            |
| 5   | Security misconfiguration (A05)      | `GET /api/v1/system/debug` — no auth, leaks config; hinted in `robots.txt` | Beginner     | `FLAG_DEBUG`                          |
| 6   | Stored XSS (A03)                     | Finding **Description** is rendered as raw HTML on the assessment page     | Intermediate | — (prove script execution)            |
| 7   | Identification & auth failures (A07) | Login: user enumeration, no rate limit, weak `intern` password             | Beginner     | — (log in as `intern`)                |

The exact payloads are left for you to work out — that's the exercise. The automated tests in
`apps/api/test/vuln-lab.test.ts` exercise every one of them if you want a reference.

## Adding your own

Put new vulnerable endpoints in `apps/api/src/modules/vuln-lab/` (API) or behind `isLabMode()` in
the web app. They only load when `VULN_MODE=true`, so they can never reach the normal copy. Add a
flag to the `lab_flags` table or an environment variable, and a row to the table above.
