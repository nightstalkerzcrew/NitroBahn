// ── Store ────────────────────────────────────────────────────────────────────
// The ONLY place that talks to the database. Keep all SQL here so that pointing
// the portal at a live SBRW MySQL database means editing just this file.

const { db } = require('./db');

const Store = {
  // ---- Users -------------------------------------------------------------
  createUser({ email, passwordHash, isAdmin = 0 }) {
    const info = db
      .prepare('INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)')
      .run(email.toLowerCase(), passwordHash, isAdmin ? 1 : 0);
    return info.lastInsertRowid;
  },

  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  },

  getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  // ---- Personas (drivers) ------------------------------------------------
  createPersona({ userId, name, country = 'XX' }) {
    const info = db
      .prepare('INSERT INTO personas (user_id, name, country) VALUES (?, ?, ?)')
      .run(userId, name, country);
    return info.lastInsertRowid;
  },

  getPersonaByUserId(userId) {
    return db.prepare('SELECT * FROM personas WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(userId);
  },

  getPersonaByName(name) {
    return db.prepare('SELECT * FROM personas WHERE name = ?').get(name);
  },

  // ---- Leaderboards ------------------------------------------------------
  // sort: 'reputation' | 'top_speed_kmh' | 'races_won' | 'distance_km'
  leaderboard({ sort = 'reputation', limit = 50, offset = 0 } = {}) {
    const allowed = {
      reputation: 'reputation',
      top_speed: 'top_speed_kmh',
      wins: 'races_won',
      distance: 'distance_km',
    };
    const col = allowed[sort] || 'reputation';
    const rows = db
      .prepare(
        `SELECT name, level, reputation, cash, races_total, races_won,
                distance_km, top_speed_kmh, crew, country, last_active
         FROM personas
         ORDER BY ${col} DESC, reputation DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset);
    // attach absolute rank based on the chosen sort
    return rows.map((r, i) => ({ rank: offset + i + 1, ...r }));
  },

  rankOf(name, sort = 'reputation') {
    const allowed = { reputation: 'reputation', top_speed: 'top_speed_kmh', wins: 'races_won', distance: 'distance_km' };
    const col = allowed[sort] || 'reputation';
    const me = this.getPersonaByName(name);
    if (!me) return null;
    const row = db
      .prepare(`SELECT COUNT(*) AS ahead FROM personas WHERE ${col} > ?`)
      .get(me[col]);
    return row.ahead + 1;
  },

  // ---- Stats -------------------------------------------------------------
  stats() {
    const drivers = db.prepare('SELECT COUNT(*) AS n FROM personas').get().n;
    const races = db.prepare('SELECT COALESCE(SUM(races_total),0) AS n FROM personas').get().n;
    const distance = db.prepare('SELECT COALESCE(SUM(distance_km),0) AS n FROM personas').get().n;
    const topSpeed = db.prepare('SELECT COALESCE(MAX(top_speed_kmh),0) AS n FROM personas').get().n;
    return { drivers, races, distance, topSpeed };
  },

  countPersonas() {
    return db.prepare('SELECT COUNT(*) AS n FROM personas').get().n;
  },
};

module.exports = { Store };
