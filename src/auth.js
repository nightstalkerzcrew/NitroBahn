// ── Auth ─────────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL = '30d';

async function hashPassword(plain) {
  return bcrypt.hash(plain, 11);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Express middleware: attaches req.auth = { uid, email } when a valid session
// cookie is present, otherwise leaves it null. Never throws.
function attachUser(req, _res, next) {
  const token = req.cookies && req.cookies.session;
  req.auth = token ? verifyToken(token) : null;
  next();
}

// Express middleware: rejects the request when not logged in.
function requireAuth(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Bitte melde dich an.' });
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  attachUser,
  requireAuth,
};
