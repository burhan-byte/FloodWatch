# FloodWatch

ศูนย์กลางขอความช่วยเหลือน้ำท่วม — คนเดือดร้อนปักหมุดขอความช่วยเหลือ อาสาเห็นบนแผนที่ รับเคส และปิดเคสเมื่อช่วยเสร็จ ไม่ต้องสมัครสมาชิก

## Development

```bash
npm install
npm run dev:server   # API + SSE on http://localhost:8080
npm run dev          # Vite on http://localhost:3000 (proxies /api)
npm test
npm run lint
```

## Production (VPS)

The build and the server only need production dependencies (`tsx` runs the TypeScript server):

```bash
npm ci --omit=dev
npm run build
NODE_ENV=production PORT=8080 DB_PATH=/var/lib/floodwatch/floodwatch.db IP_SALT=<random-string> TRUST_PROXY=1 npm start
```

| Env | Default | Purpose |
|---|---|---|
| `NODE_ENV` | unset | Set to `production` on the VPS. In production the server refuses to start without `IP_SALT` |
| `PORT` | `8080` | HTTP port |
| `DB_PATH` | `./data/floodwatch.db` | SQLite file (directory is created) |
| `IP_SALT` | random per start | Salt for hashing IPs of fake-case flags; set it so flags survive restarts. Required when `NODE_ENV=production` |
| `TRUST_PROXY` | unset | Number of reverse proxies in front of the app; set to `1` behind nginx so rate limits see real client IPs. It must be a non-negative integer: any other value stops startup in every environment. In production the server warns when it is unset |

### HTTPS (required)

Serve the site over HTTPS only. GPS location ("ใช้ตำแหน่งปัจจุบันของฉัน", "ใกล้ฉัน"), copying links and the share
button need a secure context, so over plain HTTP the location picker and copy/share buttons do not work.

Get a certificate with certbot (it edits the nginx config and sets up renewal):

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d example.org
```

`/etc/nginx/sites-available/floodwatch` (replace `example.org`):

```nginx
# Owner and claim links carry the secret token in the query string (/r/<id>?t=... / ?c=...).
# The default access log records $request (path + query), which would store those tokens,
# so log only the path ($uri) instead.
log_format floodwatch '$remote_addr - [$time_local] "$request_method $uri $server_protocol" '
                      '$status $body_bytes_sent "$http_user_agent"';

server {
    listen 80;
    listen [::]:80;
    server_name example.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.org;

    ssl_certificate     /etc/letsencrypt/live/example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/floodwatch.access.log floodwatch;

    # Server-sent events: nginx must not buffer the stream
    location /api/stream {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/floodwatch /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The tokens are not in API request URLs (the app sends them in the `X-Token` header), but the page URL a browser
first opens from a shared link is. Keep any other request logging (load balancers, analytics) to paths only too.

### systemd

Run the app as a dedicated user that owns the data directory:

```bash
sudo useradd --system --home /var/lib/floodwatch --shell /usr/sbin/nologin floodwatch
sudo mkdir -p /var/lib/floodwatch
sudo chown floodwatch:floodwatch /var/lib/floodwatch
```

`/etc/systemd/system/floodwatch.service` (adjust `WorkingDirectory` to where the app is checked out and built):

```ini
[Unit]
Description=FloodWatch help hub
After=network.target

[Service]
Type=simple
User=floodwatch
Group=floodwatch
WorkingDirectory=/opt/floodwatch
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=DB_PATH=/var/lib/floodwatch/floodwatch.db
Environment=IP_SALT=<random-string>
Environment=TRUST_PROXY=1
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now floodwatch
journalctl -u floodwatch -f
```

Generate `IP_SALT` once (e.g. `openssl rand -hex 16`) and keep it; changing it resets fake-case flag counts.

### Backup and moderation

Backup: copy the SQLite file with `sqlite3 "$DB_PATH" ".backup backup.db"` (safe while running).

Moderation (no admin UI yet):

```bash
sqlite3 "$DB_PATH" "UPDATE help_requests SET hidden = 1 WHERE id = '<id>';"
```
