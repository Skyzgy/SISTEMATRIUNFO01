// api/auth/login.js
const db = require('../../_lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setAuthCookie } = require('../../_lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Parse robusto (Vercel pode enviar string ou objeto)
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const { email, senha } = body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Informe email e senha' });
  }

  const { rows } = await db.query(
    'SELECT id, nome, email, senha_hash, role FROM users WHERE email = $1',
    [email]
  );
  if (!rows.length) return res.status(401).json({ error: 'Credenciais inválidas' });

  const user = rows[0];
  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { sub: user.id, name: user.nome, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  setAuthCookie(res, token);
  return res.status(200).json({ ok: true, role: user.role, name: user.nome });
};