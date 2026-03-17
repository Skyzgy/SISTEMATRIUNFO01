/**
 * scripts/health-check.js
 * Valida a conexão com o PostgreSQL antes de iniciar o servidor.
 *
 * - Tenta conectar até MAX_RETRIES vezes com intervalo crescente (backoff).
 * - Sai com código 0 se a conexão for bem-sucedida.
 * - Sai com código 1 se todas as tentativas falharem.
 *
 * Uso:  node scripts/health-check.js
 * Env:  DATABASE_URL  (obrigatório)
 *       HC_RETRIES    (opcional, padrão: 10)
 *       HC_DELAY_MS   (opcional, padrão: 3000 ms)
 */

"use strict";

const path = require("path");

// Carrega .env apenas fora de produção
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config({ path: path.join(__dirname, "..", "server", ".env") }); } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida. Health-check cancelado.");
  process.exit(1);
}

const MAX_RETRIES = parseInt(process.env.HC_RETRIES  || "10", 10);
const DELAY_MS    = parseInt(process.env.HC_DELAY_MS || "3000", 10);

const { PrismaClient } = require("@prisma/client");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkDb() {
  const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅  PostgreSQL acessível (tentativa ${attempt}/${MAX_RETRIES}).`);
      await prisma.$disconnect();
      return true;
    } catch (err) {
      console.warn(
        `⏳  Tentativa ${attempt}/${MAX_RETRIES} falhou: ${err?.message || err}`
      );
      if (attempt < MAX_RETRIES) {
        const wait = DELAY_MS * attempt; // backoff linear
        console.log(`    Aguardando ${wait / 1000}s antes da próxima tentativa...`);
        await sleep(wait);
      }
    } finally {
      try { await prisma.$disconnect(); } catch (disconnectErr) {
        console.warn("⚠️  Erro ao desconectar do Prisma:", disconnectErr?.message || disconnectErr);
      }
    }
  }
  return false;
}

(async () => {
  console.log("🔍  Verificando conexão com PostgreSQL...");
  const ok = await checkDb();
  if (!ok) {
    console.error("❌  Não foi possível conectar ao PostgreSQL após todas as tentativas.");
    process.exit(1);
  }
  console.log("✔   Health-check OK. PostgreSQL está disponível.");
})();
