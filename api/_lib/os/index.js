const db = require("../../_lib/db");
const withAuth = require("../../_lib/withAuth");

async function handler(req, res) {
  if (req.method === "GET") {
    if (req.user.role === "motorista") {
      const result = await db.query(
        "SELECT * FROM os WHERE motorista_id = $1 ORDER BY id DESC",
        [req.user.sub]
      );
      return res.json({ items: result.rows });
    }

    const result = await db.query("SELECT * FROM os ORDER BY id DESC");
    return res.json({ items: result.rows });
  }

  if (req.method === "POST") {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Sem permissão" });

    const { titulo, descricao, motoristaId } = JSON.parse(req.body);

    if (!titulo || !motoristaId)
      return res.status(400).json({ error: "Dados obrigatórios" });

    const result = await db.query(
      "INSERT INTO os (titulo, descricao, motorista_id) VALUES ($1,$2,$3) RETURNING *",
      [titulo, descricao || null, motoristaId]
    );

    return res.status(201).json(result.rows[0]);
  }

  return res.status(405).end();
}

module.exports = withAuth(handler);