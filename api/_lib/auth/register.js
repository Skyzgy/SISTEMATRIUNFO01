const db = require("../../_lib/db");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const withAuth = require("../../_lib/withAuth");

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { nome, email, senha, role } = JSON.parse(req.body);

  if (!nome || !email || !senha || !["admin","motorista"].includes(role))
    return res.status(400).json({ error: "Dados inválidos" });

  const hash = await bcrypt.hash(senha, 10);
  const id = uuid();

  try {
    await db.query(
      "INSERT INTO users (id, nome, email, senha_hash, role) VALUES ($1,$2,$3,$4,$5)",
      [id, nome, email, hash, role]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Email já cadastrado" });
  }
}

module.exports = withAuth(handler, ["admin"]);