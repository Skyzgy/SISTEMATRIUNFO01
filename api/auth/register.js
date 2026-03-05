// api/auth/register.js
const db = require('../../_lib/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const withAuth = require('../../_lib/withAuth');

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const { nome, email, senha, role } = body;

  if (!nome || !email || !senha || !['admin', 'motorista'].includes(role)) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const hash = await bcrypt.hash(senha, 10);
  const id = uuidv4();

  try {
    await db.query(
      'INSERT INTO users (id, nome, email, senha_hash, role) VALUES ($1,$2,$3,$4,$5)',
      [id, nome, email, hash, role]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

module.exports = withAuth(handler, ['admin']);