const db = require("../../_lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { setAuthCookie } = require("../../_lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { email, senha } = JSON.parse(req.body);

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (!result.rows.length)
    return res.status(401).json({ error: "Credenciais inválidas" });

  const user = result.rows[0];

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok)
    return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign(
    {
      sub: user.id,
      name: user.nome,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  setAuthCookie(res, token);

  res.json({ ok: true, role: user.role, name: user.nome });
};