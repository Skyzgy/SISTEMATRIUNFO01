// api/_lib/db.js
const { Pool } = require('pg');

let pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

pool = global.pgPool;

const initSql = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','motorista')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  motorista_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'aberta',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

pool.query(initSql).catch(err => console.error("Erro ao inicializar tabelas:", err));

module.exports = {
  query: (text, params) => pool.query(text, params)
};
