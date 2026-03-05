// api/auth/bootstrap-admin.js
const db = require('../../_lib/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const code = req.headers['x-bootstrap-code'];
  if (code !== process.env.ADMIN_BOOTSTRAP_CODE) {
    return res.status(403).json({ error: 'Código inválido' });
  }

  // Impedir recriação se já tiver usuários
  try {
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (rows[0].n > 0) {
      return res.status(400).json({ error: 'Já existe usuário no sistema' });
    }
  } catch (e) {
    console.error('Erro ao checar usuários:', e);
    return res.status(500).json({ error: 'Erro ao checar usuários' });
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const { nome, email, senha } = body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Dados obrigatórios' });
  }

  const id = uuidv4();
  const hash = await bcrypt.hash(senha, 10);

  try {
    await db.query(
      'INSERT INTO users (id, nome, email, senha_hash, role) VALUES ($1,$2,$3,$4,$5)',
      [id, nome, email, hash, 'admin']
    );
    return res.status(201).json({ ok: true, id });
  } catch (e) {
    console.error('Erro ao criar admin:', e);
    return res.status(500).json({ error: 'Erro ao criar admin' });
  }
};