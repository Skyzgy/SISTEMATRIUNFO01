// server/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`;

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);

// (As rotas /api virão na próxima etapa)

// Servir frontend estático da pasta /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback para SPA; se não usar SPA, pode manter - ele serve o index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});