// ── NFSW Portal server ───────────────────────────────────────────────────────
require('./src/env').loadEnv();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { Store } = require('./src/store');
const {
  hashPassword, verifyPassword, signToken, attachUser, requireAuth,
} = require('./src/auth');

const PORT = Number(process.env.PORT || 8080);
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

// ── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-z0-9_\-]{3,16}$/;

function publicPersona(p) {
  if (!p) return null;
  const winRate = p.races_total ? Math.round((p.races_won / p.races_total) * 100) : 0;
  return {
    name: p.name, level: p.level, reputation: p.reputation, cash: p.cash,
    racesTotal: p.races_total, racesWon: p.races_won, winRate,
    distanceKm: p.distance_km, topSpeedKmh: p.top_speed_kmh,
    crew: p.crew, country: p.country, lastActive: p.last_active,
  };
}

// ── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const name = String(req.body.driverName || '').trim();
  const country = String(req.body.country || 'XX').trim().toUpperCase().slice(0, 2) || 'XX';

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
  if (password.length < 6) return res.status(400).json({ error: 'Das Passwort braucht mindestens 6 Zeichen.' });
  if (!NAME_RE.test(name)) return res.status(400).json({ error: 'Fahrername: 3–16 Buchstaben, Zahlen, _ oder -.' });
  if (Store.getUserByEmail(email)) return res.status(409).json({ error: 'Diese E-Mail ist schon registriert.' });
  if (Store.getPersonaByName(name)) return res.status(409).json({ error: 'Dieser Fahrername ist schon vergeben.' });

  const hash = await hashPassword(password);
  const uid = Store.createUser({ email, passwordHash: hash });
  Store.createPersona({ userId: uid, name, country });

  const token = signToken({ uid, email });
  setSession(res, token);
  res.json({ ok: true, persona: publicPersona(Store.getPersonaByUserId(uid)) });
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  const user = Store.getUserByEmail(email);
  // Constant-ish response whether or not the user exists.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!ok) return res.status(401).json({ error: 'E-Mail oder Passwort ist falsch.' });

  const token = signToken({ uid: user.id, email: user.email });
  setSession(res, token);
  res.json({ ok: true, persona: publicPersona(Store.getPersonaByUserId(user.id)) });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.auth) return res.json({ user: null });
  const persona = Store.getPersonaByUserId(req.auth.uid);
  const rank = persona ? Store.rankOf(persona.name, 'reputation') : null;
  res.json({ user: { email: req.auth.email }, persona: publicPersona(persona), rank });
});

// ── Leaderboard + stats ──────────────────────────────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const sort = ['reputation', 'top_speed', 'wins', 'distance'].includes(req.query.sort) ? req.query.sort : 'reputation';
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = Store.leaderboard({ sort, limit, offset }).map((r) => ({
    rank: r.rank, name: r.name, level: r.level, reputation: r.reputation,
    racesWon: r.races_won, racesTotal: r.races_total,
    winRate: r.races_total ? Math.round((r.races_won / r.races_total) * 100) : 0,
    distanceKm: r.distance_km, topSpeedKmh: r.top_speed_kmh, crew: r.crew, country: r.country,
  }));
  res.json({ sort, rows });
});

app.get('/api/driver/:name', (req, res) => {
  const p = Store.getPersonaByName(req.params.name);
  if (!p) return res.status(404).json({ error: 'Keinen Fahrer mit diesem Namen gefunden.' });
  res.json({ persona: publicPersona(p), rank: Store.rankOf(p.name, 'reputation') });
});

// Live server status. Standalone, there is no XMPP presence feed, so the count
// is a smooth simulated random-walk anchored to the driver pool. When wired to
// a real SBRW backend, replace `onlineNow()` with the Openfire session count.
let online = 0;
function onlineNow() {
  const base = Math.max(12, Math.round(Store.countPersonas() * 0.6));
  if (online === 0) online = base;
  const drift = Math.round((Math.random() - 0.5) * 6);
  online = Math.max(8, Math.min(base * 2, online + drift));
  return online;
}

app.get('/api/status', (_req, res) => {
  const s = Store.stats();
  res.json({
    online: onlineNow(),
    drivers: s.drivers,
    racesTotal: s.races,
    distanceKm: s.distance,
    topSpeedKmh: s.topSpeed,
    serverTime: new Date().toISOString(),
  });
});

// ── Session cookie helper ────────────────────────────────────────────────────
function setSession(res, token) {
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

// ── Static frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  NFSW Portal running  ->  http://localhost:${PORT}`);
  console.log(`  Demo login           ->  demo@nfsw.local / speed123\n`);
});
