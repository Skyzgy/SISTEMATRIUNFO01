// server/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carregar .env
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do servidor
const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`;

// ----------------------
// MIDDLEWARES GLOBAIS
// ----------------------
app.use(helmet());
app.use(express.json());       // aceita JSON no body
app.use(cookieParser());       // lê cookies httpOnly
app.use(
  cors({
    origin: ORIGIN,            // origem permitida
    credentials: true,         // enviar cookies no fetch()
  })
);

// ----------------------
// ROTAS DA API
// ----------------------
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

// Aqui depois você poderá adicionar:
// import osRoutes from './routes/os.js';
// app.use('/api/os', osRoutes);

// ----------------------
// SERVIR FRONTEND (public)
// ----------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----------------------
// FALLBACK COMPATÍVEL COM EXPRESS 5
// (pega qualquer rota não atendida acima)
// ----------------------
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------------
// INICIAR SERVIDOR
// ----------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});