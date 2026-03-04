// server/auth-mw.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const { JWT_SECRET } = process.env;

// Garante que o usuário esteja autenticado
export function authRequired(req, res, next) {
  try {
    // Busca o token no cookie httpOnly ou no header Authorization: Bearer
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    const payload = jwt.verify(token, JWT_SECRET);
    // payload: { id, email, role } – definido na hora do login/registro
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Restringe acesso por papel (role)
export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Sem permissão' });
    next();
  };
}