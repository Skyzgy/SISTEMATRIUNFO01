// server/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getDb } from '../db.js';
import { authRequired } from '../auth-mw.js';

dotenv.config();
const router = Router();

const {
  JWT_SECRET,
  JWT_EXPIRES,
  COOKIE_SECURE = 'false',
  COOKIE_SAMESITE
} = process.env;

const secureCookie = COOKIE_SECURE === 'true';
const sameSite = (COOKIE_SAMESITE || (secureCookie ? 'none' : 'lax')).toLowerCase();

function setTokenCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES || '1d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite,
    maxAge: 24 * 60 * 60 * 1000
  });
  return token;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email e password são obrigatórios' });

    const db = await getDb();
    const exists = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 12);
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), hash, role]
    );

    const user = { id: result.lastID, name, email: email.toLowerCase(), role };
    setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
    res.status(201).json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'email e password são obrigatórios' });

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: secureCookie,
    sameSite
  });
  res.json({ ok: true });
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      req.user.id
    );
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;