// api/me.js
const withAuth = require('./_lib/withAuth');

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  return res.status(200).json({ user: req.user }); // {sub, name, email, role}
}

module.exports = withAuth(handler);