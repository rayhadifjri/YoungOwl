# Deploy Young Owl on a standalone VPS

This sets up Young Owl on your own VPS: the **control center** (where you keep notes and reports)
and, optionally, the **vulnerable lab copy** you attack from Kali.

> Run the lab copy on a VPS you are comfortable exposing. Lab targets are public on purpose; keep the
> control center and its database closed. A separate VPS for the lab is ideal.

## 0. Prerequisites

- A VPS (Ubuntu 22.04/24.04 is fine), with a non-root sudo user.
- Docker Engine + the Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
```

## 1. Get the code and configure secrets

```bash
git clone https://github.com/rayhadifjri/YoungOwl.git
cd YoungOwl
cp .env.example .env
```

Edit `.env` and set strong values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD` and the three
`SEED_*_PASSWORD` logins. For the **first** start only, set `SEED_ON_START=true` to load the dummy
data, then set it back to `false`.

## 2. Deploy

```bash
# Control center only:
bash infrastructure/deploy/deploy.sh

# Control center + the vulnerable lab you attack from Kali:
bash infrastructure/deploy/deploy.sh --with-lab
sudo bash infrastructure/lab/firewall.sh
```

- The control center binds to `127.0.0.1:3000` — it is **not** public yet.
- The lab target (with `--with-lab`) is public on `:8080` (`LAB_PORT`). That is the thing you point
  Kali at.

## 3. Reach the control center

Until HTTPS is set up, tunnel in over SSH from your laptop:

```bash
ssh -L 3000:localhost:3000 you@your-vps
# then browse to http://localhost:3000
```

Log in with `admin@youngowl.lab` and the `SEED_ADMIN_PASSWORD` you set.

### Optional: put it behind HTTPS (recommended for real use)

Install Nginx + a Let's Encrypt certificate (certbot) and reverse-proxy `:3000`. A minimal server
block:

```nginx
server {
  server_name youngowl.example.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

Then `sudo certbot --nginx -d youngowl.example.com`. Open only 80/443 (and your SSH port) in `ufw`.

## 4. Keep the lab clean

The lab copy auto-resets with the helper script. Add a cron entry:

```cron
0 */6 * * * cd /home/you/YoungOwl && bash infrastructure/lab/reset.sh >> /var/log/youngowl-lab-reset.log 2>&1
```

See [lab-mode.md](lab-mode.md) for the full isolation story (separate DB in RAM, no egress, hardened
containers).

## 5. Update later

```bash
cd YoungOwl && git pull && bash infrastructure/deploy/deploy.sh --with-lab
```

## Can Claude deploy this for me?

Not directly — this cloud session can't reach your VPS (no SSH access to it, and that's by design).
The steps above are copy-paste. If you link your **own computer** to a thread and that computer can
reach the VPS, Claude can run the commands there with you; a VPS by itself isn't a linked device.
