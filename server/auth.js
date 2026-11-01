import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { JWT_SECRET, IS_PROD, ADMIN_EMAIL, ADMIN_PASSWORD } from './config.js';

const COOKIE = 'gff_admin';

export function ensureAdmin() {
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (!count) {
    db.prepare('INSERT INTO users(email,name,password_hash,role) VALUES(?,?,?,?)')
      .run(ADMIN_EMAIL.toLowerCase(), 'Administrateur', bcrypt.hashSync(ADMIN_PASSWORD, 10), 'owner');
    console.log(`[admin] compte créé : ${ADMIN_EMAIL}`);
  }
}

export function login(req, res) {
  const { email = '', password = '' } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 7 * 864e5 });
  res.json({ user: publicUser(user) });
}

export function logout(_req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

export function publicUser(u) { return { id: u.id, email: u.email, name: u.name, role: u.role }; }

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const { uid } = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
    if (!user) throw new Error('missing');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expirée' });
  }
}

export function hashPassword(p) { return bcrypt.hashSync(p, 10); }
export function checkPassword(p, hash) { return bcrypt.compareSync(p, hash); }
