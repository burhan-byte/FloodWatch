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

```bash
npm ci
npm run build
NODE_ENV=production PORT=8080 DB_PATH=/var/lib/floodwatch/floodwatch.db IP_SALT=<random-string> TRUST_PROXY=1 npm start
```

| Env | Default | Purpose |
|---|---|---|
| `NODE_ENV` | unset | Set to `production` on the VPS. In production the server refuses to start without `IP_SALT`, and refuses to start if `TRUST_PROXY` is set to anything other than a non-negative integer |
| `PORT` | `8080` | HTTP port |
| `DB_PATH` | `./data/floodwatch.db` | SQLite file (directory is created) |
| `IP_SALT` | random per start | Salt for hashing IPs of fake-case flags; set it so flags survive restarts. Required when `NODE_ENV=production` |
| `TRUST_PROXY` | unset | Number of reverse proxies in front of the app (a non-negative integer); set to `1` behind nginx so rate limits see real client IPs. In production the server warns when it is unset |

nginx must not buffer the event stream:

```nginx
location /api/stream {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_read_timeout 1h;
}
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Backup: copy the SQLite file with `sqlite3 "$DB_PATH" ".backup backup.db"` (safe while running).

Moderation (no admin UI yet):

```bash
sqlite3 "$DB_PATH" "UPDATE help_requests SET hidden = 1 WHERE id = '<id>';"
```
