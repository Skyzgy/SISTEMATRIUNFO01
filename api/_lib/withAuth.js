// api/_lib/withAuth.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

function withAuth(handler, roles = []) {
  return async (req, res) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const token = cookies.auth;
      if (!token) return res.status(401).json({ error: 'Não autenticado' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { sub, name, email, role, iat, exp }

      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Sem permissão' });
      }

      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido/expirado' });
    }
  };
}

module.exports = withAuth;