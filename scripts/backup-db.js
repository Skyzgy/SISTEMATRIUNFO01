/**
 * scripts/backup-db.js
 * Backup automático do banco PostgreSQL antes de cada deploy.
 *
 * Estratégia:
 *  1. Tenta pg_dump (nativo, preferido em ambientes com PostgreSQL instalado)
 *  2. Fallback: exporta todas as tabelas como JSON via Prisma
 *
 * Uso:  node scripts/backup-db.js
 * Env:  DATABASE_URL  (obrigatório)
 *       BACKUP_DIR    (opcional, padrão: ./backups)
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { execFile } = require("child_process");

// Carrega .env apenas fora de produção
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config({ path: path.join(__dirname, "..", "server", ".env") }); } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida. Backup cancelado.");
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(__dirname, "..", "backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp   = new Date().toISOString().replace(/[:.]/g, "-");
const pgDumpFile  = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
const jsonFile    = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

// ─── 1. Tenta pg_dump ─────────────────────────────────────────────────────────
function tryPgDump() {
  return new Promise((resolve) => {
    const url = new URL(DATABASE_URL);
    const env = {
      ...process.env,
      PGPASSWORD: url.password,
    };
    const args = [
      "-h", url.hostname,
      "-p", url.port || "5432",
      "-U", url.username,
      "-d", url.pathname.split("/")[1].split("?")[0],
      "-F", "c",  // custom format (comprimido)
      "-f", pgDumpFile,
    ];

    execFile("pg_dump", args, { env }, (err) => {
      if (err) {
        console.warn("⚠️  pg_dump não disponível, usando fallback JSON:", err.message);
        resolve(false);
      } else {
        const sizeMB = (fs.statSync(pgDumpFile).size / 1024 / 1024).toFixed(2);
        console.log(`✅  Backup pg_dump criado: ${pgDumpFile} (${sizeMB} MB)`);
        resolve(true);
      }
    });
  });
}

// ─── 2. Fallback: exporta via Prisma como JSON ────────────────────────────────
// Nota: carrega todos os registros em memória. Adequado para bancos de até
// alguns GBs; para volumes maiores prefira pg_dump (instalado no ambiente).
async function prismaJsonBackup() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const [users, osSeq, os, req, abast] = await Promise.all([
      prisma.user.findMany(),
      prisma.oSSequence.findMany(),
      prisma.oS.findMany(),
      prisma.req.findMany(),
      prisma.abastecimento.findMany(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      tables: { users, osSeq, os, req, abast },
    };

    fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), "utf-8");
    const sizeMB = (fs.statSync(jsonFile).size / 1024 / 1024).toFixed(2);
    console.log(`✅  Backup JSON criado: ${jsonFile} (${sizeMB} MB)`);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Rotação: apaga backups com mais de 7 dias ────────────────────────────────
function pruneOldBackups() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    fs.readdirSync(BACKUP_DIR).forEach((f) => {
      const full = path.join(BACKUP_DIR, f);
      if (fs.statSync(full).mtimeMs < cutoff) {
        fs.unlinkSync(full);
        console.log(`🗑   Backup antigo removido: ${f}`);
      }
    });
  } catch (e) {
    console.warn("⚠️  Erro na rotação de backups:", e.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("🔄  Iniciando backup do banco de dados...");
  const pgOk = await tryPgDump();
  if (!pgOk) {
    await prismaJsonBackup();
  }
  pruneOldBackups();
  console.log("✔   Backup concluído.");
})().catch((e) => {
  console.error("❌  Falha no backup:", e);
  process.exit(1);
});
