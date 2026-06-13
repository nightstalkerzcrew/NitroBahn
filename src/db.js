// ── Database layer ───────────────────────────────────────────────────────────
// Uses SQLite (better-sqlite3) for a zero-setup local server. The schema is
// modelled on Soapbox Race World's real game database so the migration path to
// a live MySQL/SBRW backend is a straight mapping:
//
//   portal table   ->  SBRW table
//   users          ->  USER     (email, password, ...)
//   personas       ->  PERSONA  (name, level, score/rep, cash, ...)
//
// When DB_DRIVER=mysql, swap the `better-sqlite3` handle for a mysql2 pool and
// repoint the queries in src/store.js at the SBRW table/column names. The rest
// of the app talks only to src/store.js, so nothing else changes.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SQLITE_PATH = process.env.SQLITE_PATH || './data/portal.db';

// Make sure the folder for the db file exists.
fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });

const db = new Database(SQLITE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT    NOT NULL UNIQUE,        -- driver / persona name
      level           INTEGER NOT NULL DEFAULT 1,
      reputation      INTEGER NOT NULL DEFAULT 0,     -- "rep" / score
      cash            INTEGER NOT NULL DEFAULT 30000,
      races_total     INTEGER NOT NULL DEFAULT 0,
      races_won       INTEGER NOT NULL DEFAULT 0,
      distance_km     INTEGER NOT NULL DEFAULT 0,
      top_speed_kmh   INTEGER NOT NULL DEFAULT 0,
      crew            TEXT,
      country         TEXT    NOT NULL DEFAULT 'XX',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      last_active     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_personas_rep ON personas(reputation DESC);
    CREATE INDEX IF NOT EXISTS idx_personas_speed ON personas(top_speed_kmh DESC);
  `);
}

migrate();

module.exports = { db };
