const { clearAuthCookie } = require("../../_lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  clearAuthCookie(res);
  res.json({ ok: true });
};