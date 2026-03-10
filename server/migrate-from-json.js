/**
 * server/migrate-from-json.js
 *
 * Migra dados legados de JSON (server/data/*.json) para o Postgres via Prisma:
 *  - Users (users.json)
 *  - OS (os.json)  -> mantém sequência global; usa id do tipo YYYY-000001 quando existir; senão gera
 *  - Req (req.json) -> de-duplicação básica
 *  - Abastecimento (abast.json) -> de-duplicação básica
 *
 * Rodar localmente (Windows PowerShell):
 *   $env:DATABASE_URL="COLE_SUA_URL"; node server/migrate-from-json.js --dry
 *   $env:DATABASE_URL="COLE_SUA_URL"; node server/migrate-from-json.js
 *
 * macOS/Linux:
 *   export DATABASE_URL="COLE_SUA_URL"
 *   node server/migrate-from-json.js --dry
 *   node server/migrate-from-json.js
 */

const path = require("path");
const fs = require("fs").promises;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROOT = path.join(__dirname, "data");
const p = (...x) => path.join(ROOT, ...x);
const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");

function log(...args){ console.log("[MIGRA]", ...args); }
function warn(...args){ console.warn("[MIGRA]", ...args); }

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normStatus(s) {
  if (!s) return "aberta";
  const t = String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("andamento"))  return "andamento";
  if (t.includes("aguard"))     return "aguardando";
  if (t.includes("conclu"))     return "concluida";
  return "aberta";
}

function tryParseDate(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function toInt(n) {
  if (n === null || n === undefined || n === "") return 0;
  const x = Number(String(n).replace(",", "."));
  return Number.isFinite(x) ? Math.trunc(x) : 0;
}
function toFloat(n) {
  if (n === null || n === undefined || n === "") return 0;
  const x = Number(String(n).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function parseOsIdSeq(id) {
  // Ex.: 2026-000123 -> 123
  if (!id) return null;
  const m = String(id).match(/^(\d{4})-(\d{6})$/);
  if (!m) return null;
  return Number(m[2]);
}

function splitName(full) {
  if (!full) return [null, null];
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], ""];
  const lastName = parts.pop();
  const firstName = parts.join(" ");
  return [firstName, lastName];
}

async function ensureSequenceLast(targetLast) {
  // Garante a linha OSSequence(id=1) com last >= targetLast
  const row = await prisma.oSSequence.findUnique({ where: { id: 1 } });
  if (!row) {
    if (!DRY_RUN) await prisma.oSSequence.create({ data: { id: 1, last: targetLast } });
    log(`OSSequence criada com last=${targetLast}`);
    return targetLast;
  }
  if (row.last < targetLast) {
    if (!DRY_RUN) await prisma.oSSequence.update({ where: { id: 1 }, data: { last: targetLast } });
    log(`OSSequence atualizada: ${row.last} -> ${targetLast}`);
    return targetLast;
  }
  log(`OSSequence preservada (last=${row.last})`);
  return row.last;
}

function buildOsId(year, seq) {
  const y = String(year || new Date().getFullYear());
  const s = String(seq).padStart(6, "0");
  return `${y}-${s}`;
}

async function findUserIdFromOpenedByName(openedByName) {
  const [fn, ln] = splitName(openedByName);
  if (!fn) return null;
  const u = await prisma.user.findFirst({
    where: {
      firstName: { contains: fn, mode: "insensitive" },
      ...(ln ? { lastName: { contains: ln, mode: "insensitive" } } : {})
    }
  });
  return u?.id || null;
}

async function migrate() {
  log("Iniciando migração...", DRY_RUN ? "(DRY-RUN: sem gravar)" : "");

  // 1) Ler arquivos (se não existirem, segue com lista vazia)
  const usersJson = await readJson(p("users.json"), []);
  const osJson    = await readJson(p("os.json"), []);
  const reqJson   = await readJson(p("req.json"), []);
  const abastJson = await readJson(p("abast.json"), []);

  log(`Lidos: users=${usersJson.length}, os=${osJson.length}, req=${reqJson.length}, abast=${abastJson.length}`);

  // 2) USERS — evita duplicar por nome+sobrenome
  let createdUsers = 0, skippedUsers = 0;
  for (const u of usersJson) {
    const firstName = (u.firstName || u.nome || "").toString().trim();
    const lastName  = (u.lastName  || u.sobrenome || "").toString().trim();
    if (!firstName || !lastName) { skippedUsers++; continue; }

    const exists = await prisma.user.findFirst({
      where: {
        firstName: { equals: firstName, mode: "insensitive" },
        lastName:  { equals: lastName,  mode: "insensitive" }
      }
    });
    if (exists) { skippedUsers++; continue; }

    if (DRY_RUN) {
      log(`(dry) Criaria user: ${firstName} ${lastName} (${u.role||"driver"})`);
    } else {
      await prisma.user.create({
        data: {
          firstName,
          lastName,
          passwordHash: u.passwordHash || "$2a$10$5L4uGP5b9mZkQ4QqsVx8iO8Q3G8s8z8G8G8G8G8G8G8G8G8G8G", // hash fake se não houver
          role: (u.role === "admin" || u.role === "driver") ? u.role : "driver",
          createdAt: tryParseDate(u.createdAt) || undefined
        }
      });
    }
    createdUsers++;
  }
  log(`Users: criados=${createdUsers}, pulados=${skippedUsers}`);

  // 3) OS — preparar sequência
  let maxSeqFromJson = 0;
  for (const o of osJson) {
    const seq = Number(o.seq || parseOsIdSeq(o.id) || 0);
    if (seq > maxSeqFromJson) maxSeqFromJson = seq;
  }
  const agg = await prisma.oS.aggregate({ _max: { seq: true } });
  const maxSeqDb = agg?._max?.seq || 0;
  let currentSeq = Math.max(maxSeqDb, maxSeqFromJson);
  await ensureSequenceLast(currentSeq);

  let createdOS = 0, skippedOS = 0, maxInsertedSeq = currentSeq;
  for (const o of osJson) {
    const idFromJson = o.id && /^\d{4}-\d{6}$/.test(String(o.id)) ? String(o.id) : null;
    let seq = Number(o.seq || (idFromJson ? parseOsIdSeq(idFromJson) : 0)) || 0;
    let id  = idFromJson;

    const exists = id ? await prisma.oS.findUnique({ where: { id } }) : null;
    if (exists) { skippedOS++; continue; }

    if (!id) {
      currentSeq += 1;
      seq = currentSeq;
      const y = tryParseDate(o.openedAt)?.getFullYear() || tryParseDate(o.createdAt)?.getFullYear() || new Date().getFullYear();
      id = buildOsId(y, seq);
      if (seq > maxInsertedSeq) maxInsertedSeq = seq;
    } else {
      if (seq > maxInsertedSeq) maxInsertedSeq = seq;
    }

    const openedAt = tryParseDate(o.openedAt) || tryParseDate(o.createdAt) || new Date();
    const createdAt = tryParseDate(o.createdAt) || openedAt;
    const updatedAt = tryParseDate(o.updatedAt) || createdAt;
    const createdBy = o.createdBy ? await findUserIdFromOpenedByName(o.openedByName) : null;

    const data = {
      id,
      seq,
      garagem: String(o.garagem || "").trim(),
      motorista: o.motorista ? String(o.motorista).trim() : null,
      frota: String(o.frota || "").trim(),
      km: toInt(o.km),
      tipoServico: String(o.tipoServico || o.servico || "").trim(),
      descricao: String(o.descricao || "").trim(),
      status: normStatus(o.status),
      createdBy: createdBy || null,
      openedByName: o.openedByName ? String(o.openedByName).trim() : null,
      openedAt, createdAt, updatedAt
    };

    if (DRY_RUN) log(`(dry) Criaria OS ${data.id} (seq=${data.seq}) [${data.status}]`);
    else await prisma.oS.create({ data });

    createdOS++;
  }

  const finalLast = Math.max(currentSeq, maxInsertedSeq, maxSeqDb, maxSeqFromJson);
  await ensureSequenceLast(finalLast);
  log(`OS: criadas=${createdOS}, puladas=${skippedOS}, last=${finalLast}`);

  // 4) REQ — de-duplicação: material+qtd+garagem+frota+data+codigo+descricao
  let createdReq = 0, skippedReq = 0;
  for (const r of reqJson) {
    const data = tryParseDate(r.data) || null;
    const match = await prisma.req.findFirst({
      where: {
        material: { equals: String(r.material||"").trim(), mode: "insensitive" },
        quantidade: Number(r.quantidade||0),
        garagem: String(r.garagem||"").trim(),
        frota: String(r.frota||"").trim(),
        codigo: String(r.codigo||"").trim(),
        descricao: { equals: String(r.descricao||"").trim(), mode: "insensitive" },
        ...(data ? { data } : {})
      }
    });
    if (match) { skippedReq++; continue; }

    const item = {
      material: String(r.material||"").trim(),
      quantidade: Number(r.quantidade||0),
      garagem: String(r.garagem||"").trim(),
      frota: String(r.frota||"").trim(),
      solicitante: String(r.solicitante||"").trim(),
      data,
      codigo: String(r.codigo||"").trim(),
      descricao: String(r.descricao||"").trim(),
      status: normStatus(r.status),
      createdBy: null,
      createdAt: tryParseDate(r.createdAt) || undefined,
      updatedAt: tryParseDate(r.updatedAt) || undefined
    };

    if (DRY_RUN) log(`(dry) Criaria REQ ${item.codigo || "(sem código)"} (${item.material})`);
    else await prisma.req.create({ data: item });

    createdReq++;
  }
  log(`REQ: criadas=${createdReq}, puladas=${skippedReq}`);

  // 5) ABAST — de-duplicação: dataHora+frota+kmVeiculo+litros
  let createdAb = 0, skippedAb = 0;
  for (const a of abastJson) {
    const dataHora = tryParseDate(a.dataHora) || tryParseDate(a.createdAt) || new Date(0);
    const frota    = String(a.frota || "").trim();
    const kmVeic   = toInt(a.kmVeiculo);
    const litros   = toFloat(a.litros);

    const dupe = await prisma.abastecimento.findFirst({
      where: { dataHora, frota, kmVeiculo: kmVeic, litros }
    });
    if (dupe) { skippedAb++; continue; }

    const item = {
      dataHora,
      frota,
      kmVeiculo: kmVeic,
      kmInicioBomba: toFloat(a.kmInicioBomba),
      kmFimBomba: toFloat(a.kmFimBomba),
      litros,
      createdBy: null,
      createdAt: tryParseDate(a.createdAt) || undefined
    };

    if (DRY_RUN) log(`(dry) Criaria ABAST ${item.frota} @ ${item.dataHora.toISOString()} (${item.litros} L)`);
    else await prisma.abastecimento.create({ data: item });

    createdAb++;
  }
  log(`ABAST: criados=${createdAb}, pulados=${skippedAb}`);

  log("Migração finalizada.", DRY_RUN ? "(DRY-RUN)" : "");
}

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      warn("DATABASE_URL não definida! Ex.:");
      warn('  PowerShell: $env:DATABASE_URL="postgres://..."');
      warn('  mac/linux : export DATABASE_URL="postgres://..."');
      process.exit(1);
    }
    await migrate();
  } catch (e) {
    console.error("Falha na migração:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();