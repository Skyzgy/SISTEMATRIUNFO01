const withAuth = require("./_lib/withAuth");

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.json({ user: req.user });
}

module.exports = withAuth(handler);