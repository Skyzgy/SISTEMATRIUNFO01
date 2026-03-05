const db = require("../../_lib/db");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  if (req.headers["x-bootstrap-code"] !== process.env.ADMIN_BOOTSTRAP_CODE)
    return res.status(403).json({ error: "Código inválido" });

  const { nome, email, senha } = JSON.parse(req.body);

  const count = await db.query("SELECT COUNT(*)::int AS total FROM users");
  if (count.rows[0].total > 0)
    return res.status(400).json({ error: "Já existe usuário no sistema" });

  const hash = await bcrypt.hash(senha, 10);
  const id = uuid();

  await db.query(
    "INSERT INTO users (id, nome, email, senha_hash, role) VALUES ($1,$2,$3,$4,$5)",
    [id, nome, email, hash, "admin"]
  );

  res.json({ ok: true });
};