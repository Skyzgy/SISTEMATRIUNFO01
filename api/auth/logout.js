// api/auth/logout.js
const { clearAuthCookie } = require('../../_lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
};