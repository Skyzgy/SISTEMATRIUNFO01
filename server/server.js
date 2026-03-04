// server/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Necessário para cookies Secure atrás de proxy HTTPS do Render
app.set('trust proxy', 1);

// ORIGINS do .env (lista separada por vírgula)
const ORIGIN = process.env.ORIGIN || '';
const ORIGINS = (process.env.ORIGINS || ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin não permitido: ${origin}`));
  },
  credentials: true
}));

// Rotas da API (ANTES do static e fallback)
app.use('/api/auth', authRoutes);

// Rota de saúde (teste rápido)
app.get('/api/ping', (_req, res) => res.json({ pong: true }));

// Frontend estático (pasta public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback final (Express 5 compatível)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});