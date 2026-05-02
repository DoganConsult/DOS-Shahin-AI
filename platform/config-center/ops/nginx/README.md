# Nginx edge configuration

## File inventory

| File | Purpose | Deployed to |
|------|---------|-------------|
| `nginx.conf` | **Base NGINX config** — `user`, `worker_processes`, `pid`, `ssl_protocols`, logging | `/etc/nginx/nginx.conf` |
| `dos-platform.conf` | Main platform site config — upstreams, vhosts, rate limits, proxy routing | `/etc/nginx/sites-enabled/dos-platform` |
| `frontend.conf` | Legacy standalone SPA config (superseded by `dos-platform.conf`) | `/etc/nginx/sites-enabled/frontend` (deprecated) |
| `generated/upstreams.inc` | Auto-generated upstream blocks for all PM2 services | Same dir as `dos-platform.conf` |
| `generated/frontend-api-proxy.inc` | Auto-generated single `proxy_pass` for legacy frontend | Same dir as `frontend.conf` |
| `snippets/cloudflare-real-ip.conf` | `set_real_ip_from` for Cloudflare CIDRs + `real_ip_header CF-Connecting-IP` | `/etc/nginx/snippets/` |
| `snippets/cloudflare-forwarded.conf` | `proxy_set_header X-Forwarded-Proto`, `CF-Ray`, `CF-Connecting-IP` | `/etc/nginx/snippets/` |
| `conf.d/00-cloudflare-maps.conf` | Cloudflare header maps (`$cf_forwarded_proto`, `$cf_forwarded_port`) | `/etc/nginx/conf.d/` |

## nginx.conf — base configuration (required on every server)

The base `nginx.conf` handles global settings: worker processes, PID file location, SSL
protocols, logging, and which `conf.d`/`sites-enabled` directories to load.

**Always copy `nginx.conf` to `/etc/nginx/nginx.conf` before deploying site configs:**

```bash
sudo cp ops/nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo nginx -s reload
```

If the PID file path changes, ensure the directory exists and is writable:

```bash
sudo mkdir -p /var/run
sudo chown www-data:www-data /var/run
```

### Key settings in nginx.conf

- **`pid /var/run/nginx.pid`** — Do NOT use `/run/nginx.pid`. On some deployments
  `/run` is a read-only tmpfs. Use `/var/run/nginx.pid` and bind-mount `/var/run → /run`
  if you need compatibility with both patterns.
- **`ssl_protocols TLSv1.2 TLSv1.3`** — TLSv1 and TLSv1.1 are deprecated. Only enable
  them if you have an explicit legacy requirement (PCI-DSS note: TLSv1.2+ is required).
- **Log permissions** — `error_log` and `access_log` must be writable by `www-data`.
  Run `sudo chown -R www-data:www-data /var/log/nginx/` after installation.

## Generated upstreams and API proxy

Ports are **not** hardcoded in `dos-platform.conf` or `frontend.conf` for the PM2-backed services. They are emitted from the same source as PM2:

1. `ops/ecosystem.all.config.js` (override with `ECOSYSTEM_CONFIG`)
2. `ops/config/nginx-upstream-map.json` — maps nginx `upstream` block names to PM2 app names

Regenerate after changing ecosystem ports or the map:

```bash
pnpm run generate:edge-config
```

Outputs:

- `generated/upstreams.inc` — included by `dos-platform.conf`
- `generated/frontend-api-proxy.inc` — `proxy_pass` for `frontend.conf` `/api/`

## Cloudflare integration

All site blocks should include:

```nginx
include /etc/nginx/snippets/cloudflare-real-ip.conf;
```

This trusts Cloudflare's `CF-Connecting-IP` header and sets the real client IP for logging
and rate limiting. It also includes all Cloudflare IPv4 and IPv6 CIDR ranges.

For proxied headers (forward to upstream services):

```nginx
include /etc/nginx/snippets/cloudflare-forwarded.conf;
```

This sets `X-Forwarded-Proto`, `X-Forwarded-Port`, `CF-Ray`, and `CF-Connecting-IP`
so upstream services can reconstruct the original request.

## How to test / reload nginx

**Prefix** must be this directory so `include generated/…` resolves:

```bash
cd /path/to/DOS-AIO/ops/nginx
sudo nginx -t -p "$(pwd)" -c "$(pwd)/dos-platform.conf"
sudo nginx -s reload -p "$(pwd)" -c "$(pwd)/dos-platform.conf"
```

If your deployment copies configs elsewhere, copy `generated/*.inc` next to the active
`dos-platform.conf` / `frontend.conf`, or set an absolute `include` in a
deployment-specific wrapper.

## TLS certificates on local HTTPS ports

Local HTTPS ports (8443, 8444) in `conf.d/00-cloudflare-maps.conf` use snakeoil
certificates by default. **Replace with real certificates from Let's Encrypt or your CA:**

```bash
# Let's Encrypt example
sudo certbot --nginx -d shahin-ai.com -d www.shahin-ai.com -d auth.shahin-ai.com

# Then update conf.d/00-cloudflare-maps.conf to point to the new cert paths:
ssl_certificate /etc/letsencrypt/live/shahin-ai.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/shahin-ai.com/privkey.pem;
```
