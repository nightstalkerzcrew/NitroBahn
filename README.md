# NITROBAHN — NFSW Community Portal

A modern web portal for a *Need for Speed: World* revival server: **login,
registration, live leaderboards and driver profiles**, in the style of
nightriderz.world but with its own darker "midnight street-racing" identity.

This repo is the **web portal layer**. It runs standalone out of the box (no
database setup) and is built to plug straight into a real Soapbox Race World
(SBRW) game backend when you're ready.

---

## How an NFSW server actually fits together

A working "NFSW server" is **two separate things**:

```
   ┌─────────────────────────┐        ┌──────────────────────────────┐
   │  GAME BACKEND (SBRW)     │        │  WEB PORTAL  (this repo)     │
   │  soapbox-race-core       │        │  login · leaderboard · stats │
   │  Java · Wildfly/Thorntail│ ─────► │  Node · Express              │
   │  the nfsw.exe client     │ shared │  what players see in browser │
   │  connects HERE           │  MySQL │                              │
   └─────────────────────────┘   DB   └──────────────────────────────┘
            ▲                                        ▲
            │ SOAP/XML + XMPP (Openfire)             │ HTTP
        nfsw.exe game client                    web browser
```

- **Game backend** = [`SoapboxRaceWorld/soapbox-race-core`](https://github.com/SoapboxRaceWorld/soapbox-race-core)
  (or the ready-made [`SBRW-COMPILED`](https://github.com/0P3N50URC3-F0R3V3R) build).
  This is the mature project the actual game talks to. You **deploy** it — you
  don't rewrite it. The `michelinus/nfsw-server` repo you started from is an
  early ancestor of this and is archived/outdated.
- **Web portal** = this project. It reads/writes the **same MySQL database** the
  game backend uses, so the leaderboard shows real drivers and players log in
  with their real accounts.

This repo gives you the second box, done well. Setting up the first box is a
server-admin task covered by the SBRW docs and the
[`setting-up-sbrw`](https://github.com/berkayylmao/setting-up-sbrw) guide.

---

## Quick start (standalone, 60 seconds)

Requires **Node.js 18+**.

```bash
npm install        # installs express, better-sqlite3, bcryptjs, jsonwebtoken
npm run seed       # creates ./data/portal.db with 60 demo drivers + a test account
npm start          # http://localhost:8080
```

Open <http://localhost:8080>.

**Test account** — email `demo@nfsw.local`, password `speed123`.
Sign in to see the hero switch to your live driver card with your global rank.

> Just want to *see* the design first? Open `nfsw-portal-preview.html` in any
> browser — it's a single self-contained file that renders with demo data, no
> server needed.

---

## What's included

| Feature | Where |
|---|---|
| Register (email + driver name + country) | `POST /api/register` |
| Login / logout (bcrypt + signed httpOnly cookie session) | `POST /api/login`, `/api/logout` |
| Current session + driver profile | `GET /api/me` |
| Leaderboard, 4 sorts (rep / top speed / wins / distance) | `GET /api/leaderboard?sort=` |
| Single driver lookup | `GET /api/driver/:name` |
| Live server status (online count, totals) | `GET /api/status` |
| Responsive HUD frontend, login modal, driver dashboard | `public/` |

### Project layout

```
nfsw-portal/
├── server.js            # Express app + all routes
├── src/
│   ├── env.js           # tiny .env loader (no dependency)
│   ├── db.js            # SQLite handle + schema (mirrors SBRW USER/PERSONA)
│   ├── store.js         # ALL database queries live here  ← edit this for MySQL
│   ├── auth.js          # password hashing + JWT session helpers
│   └── seed.js          # demo drivers + test account
├── public/
│   ├── index.html       # markup
│   ├── css/styles.css   # midnight street-racing theme
│   └── js/app.js        # frontend logic (+ demo-data fallback)
├── .env.example
└── package.json
```

---

## Going live: connect to a real SBRW database

The schema in `src/db.js` is intentionally modelled on SBRW's real tables:

| Portal table | SBRW table | Notes |
|---|---|---|
| `users`    | `USER`    | email + password hash |
| `personas` | `PERSONA` | driver name, `level`, `reputation`/score, `cash`, race stats |

To switch the portal from its own SQLite DB to the live game DB:

1. Set `DB_DRIVER=mysql` and the `MYSQL_*` values in `.env` (copy from
   `.env.example`) to point at your soapbox-race-core MySQL database.
2. Add a MySQL client: `npm install mysql2`.
3. In **`src/store.js`** (the only file that touches the database), repoint each
   query at the real SBRW table/column names — e.g. `personas` → `PERSONA`,
   `reputation` → SBRW's score column. Everything else in the app already talks
   only to `store.js`, so no other file changes.
4. **Login compatibility:** so players use the *same* credentials as the game,
   `src/auth.js` must verify passwords with SBRW's hashing scheme rather than
   bcrypt. Check how your core build hashes `USER.password` and match it in
   `verifyPassword()`. (Keep new portal-only sign-ups on bcrypt if you don't
   want the portal to be able to create game accounts.)
5. Replace the simulated `onlineNow()` in `server.js` with the live session
   count from Openfire's REST API for a real "players online" number.

---

## Deploying

- Put it behind a reverse proxy (nginx/Caddy) with HTTPS and set
  `NODE_ENV=production` so the session cookie is marked `secure`.
- Set a long random `JWT_SECRET`.
- `pm2 start server.js --name nfsw-portal` (or a systemd unit) to keep it up.

---

## Make it yours

- **Rename the brand:** "NITROBAHN" and the tagline live in `public/index.html`
  (search for `brand`/`hero`) and the page `<title>`. The logo is the CSS
  `.brand .logo` block in `styles.css`.
- **Recolor:** every colour is a CSS variable at the top of `styles.css`
  (`--ignition`, `--xenon`, …). Change those two accents and the whole site
  reskins.
- **Add sections** (news, car catalogue, store) by following the existing
  `.section` pattern.

---

## Legal

This is a **non-commercial, fan-made community project**. *Need for Speed:
World* and related trademarks belong to **Electronic Arts Inc.** This project is
not affiliated with, endorsed by, or sponsored by EA, and distributes **no game
files**. You are responsible for how you run any server based on it.

The SBRW game core is GPL-3.0; if you redistribute a modified core, honour that
license.
