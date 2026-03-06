// server/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// ⚠️ Carrega .env apenas fora de produção para não sobrescrever PORT no Railway
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ====== Caminhos ======
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const USERS_DB   = path.join(__dirname, "users.json");
const DATA_DIR   = path.join(__dirname, "data");
const OS_DB      = path.join(DATA_DIR, "os.json");
const REQ_DB     = path.join(DATA_DIR, "req.json");
const ABAST_DB   = path.join(DATA_DIR, "abast.json");

// ====== Helpers de arquivo ======
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function ensureFile(file, fallback = "[]") {
  if (!fs.existsSync(file)) fs.writeFileSync(file, fallback, "utf8");
}
function readJson(file) {
  ensureFile(file);
  return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}
function ensureUsersFile() { ensureFile(USERS_DB, "[]"); }
function readUsers() { ensureUsersFile(); return JSON.parse(fs.readFileSync(USERS_DB, "utf8") || "[]"); }
function writeUsers(users) { fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2), "utf8"); }

ensureDir(DATA_DIR);
ensureFile(OS_DB, "[]");
ensureFile(REQ_DB, "[]");
ensureFile(ABAST_DB, "[]");

function randomId(prefix = "u") {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
function isValidName(s){ return typeof s==="string" && s.trim().length>=2 && s.trim().length<=60; }
function isValidSixDigitPassword(pwd){ return /^\d{6}$/.test(String(pwd)); }

// ====== Seed Admin ======
(function seedAdmin(){
  const users = readUsers();
  const hasAdmin = users.some(u => u.role === "admin");
  if (!hasAdmin) {
    const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
    const lastName  = process.env.ADMIN_LAST_NAME  || "Master";
    const password  = process.env.ADMIN_PASSWORD  || "123456";
    if (!isValidSixDigitPassword(password)) {
      console.warn('ADMIN_PASSWORD deve ter 6 dígitos numéricos. Usando "123456".');
    }
    users.push({
      id: randomId("u"),
      firstName, lastName,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "admin",
      createdAt: new Date().toISOString()
    });
    writeUsers(users);
    console.log(`✅ Admin seed criado: ${firstName} ${lastName}`);
  }
})();

// ====== Middlewares Globais ======
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simples (útil no Railway)
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now()-t0}ms)`));
  next();
});

// ====== Auth middlewares ======
function authRequired(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Sessão inválida/expirada" }); }
}
function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}

// ====== Healthcheck ======
app.get("/healthz", (req, res) => res.status(200).json({ ok: true, ts: new Date().toISOString() }));

// ====== Rotas de Autenticação ======
app.post("/api/auth/register", (req, res) => {
  const { firstName, lastName, password } = req.body;
  if (!isValidName(firstName) || !isValidName(lastName))
    return res.status(400).json({ error: "Nome e sobrenome devem ter de 2 a 60 caracteres." });
  if (!isValidSixDigitPassword(password))
    return res.status(400).json({ error: "A senha deve ter exatamente 6 dígitos numéricos." });
  const users = readUsers();
  if (users.find(u => u.firstName.toLowerCase()===firstName.toLowerCase() && u.lastName.toLowerCase()===lastName.toLowerCase()))
    return res.status(409).json({ error: "Usuário já cadastrado." });

  users.push({
    id: randomId("u"),
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: "driver",
    createdAt: new Date().toISOString()
  });
  writeUsers(users);
  return res.status(201).json({ message: "Cadastro realizado com sucesso." });
});

app.post("/api/auth/login", (req, res) => {
  const { firstName, lastName, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.firstName.toLowerCase()===String(firstName||"").toLowerCase() &&
                               u.lastName.toLowerCase()===String(lastName||"").toLowerCase());
  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });
  if (!bcrypt.compareSync(String(password||""), user.passwordHash))
    return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign({ id:user.id, firstName:user.firstName, lastName:user.lastName, role:user.role }, JWT_SECRET, { expiresIn: "8h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",                    // se front e API forem domínios diferentes em HTTPS, depois podemos usar 'none'
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000*60*60*8
  });
  res.json({ message: "Login efetuado", role: user.role });
});

app.get("/api/auth/me", authRequired, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/logout", (req, res) => { res.clearCookie("token"); res.json({ message: "Logout ok" }); });

// ============================================================
// ===================  MÓDULO: OS  ===========================
// ============================================================
/**
 * Modelo de OS (armazenado em os.json):
 * { id, garagem, motorista, frota, km, tipoServico, descricao, status, createdBy, createdAt, updatedAt }
 * status: 'aberta' | 'andamento' | 'aguardando' | 'concluida'
 */

// Criar OS (driver e admin)
app.post("/api/os", authRequired, roleRequired("driver","admin"), (req, res) => {
  const { garagem, motorista, frota, km, tipoServico, descricao } = req.body;
  const os = readJson(OS_DB);
  const item = {
    id: randomId("os"),
    garagem: String(garagem||"").trim(),
    motorista: String(motorista||"").trim(),
    frota: String(frota||"").trim(),
    km: Number(km||0),
    tipoServico: String(tipoServico||"").trim(),
    descricao: String(descricao||"").trim(),
    status: "aberta",
    createdBy: req.user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  os.push(item); writeJson(OS_DB, os);
  res.status(201).json({ message: "OS criada", os: item });
});

// Listar OS (com filtros simples)
app.get("/api/os", authRequired, roleRequired("driver","admin"), (req, res) => {
  const { status, frota, limit=50, page=1 } = req.query;
  let rows = readJson(OS_DB);
  if (status) rows = rows.filter(r => r.status === status);
  if (frota)  rows = rows.filter(r => r.frota === String(frota));
  const p = Math.max(1, Number(page)); const l = Math.max(1, Math.min(1000, Number(limit)));
  const start = (p-1)*l; const end = start + l;
  res.json({ total: rows.length, page:p, pageSize:l, items: rows.slice(start,end) });
});

// Alterar status da OS (admin)
app.patch("/api/os/:id/status", authRequired, roleRequired("admin"), (req, res) => {
  const { id } = req.params; const { status } = req.body;
  const allowed = ["aberta","andamento","aguardando","concluida"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });
  const os = readJson(OS_DB);
  const i = os.findIndex(r => r.id === id);
  if (i<0) return res.status(404).json({ error: "OS não encontrada." });
  os[i].status = status; os[i].updatedAt = new Date().toISOString();
  writeJson(OS_DB, os);
  res.json({ message: "Status atualizado", os: os[i] });
});

// Métricas de OS
app.get("/api/os/metrics", authRequired, roleRequired("driver","admin"), (req, res) => {
  const rows = readJson(OS_DB);
  const counts = { aberta:0, andamento:0, aguardando:0, concluida:0 };
  rows.forEach(r => { counts[r.status] = (counts[r.status]||0)+1; });
  res.json({ counts, total: rows.length });
});

// Últimas OS
app.get("/api/os/recent", authRequired, roleRequired("driver","admin"), (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const rows = readJson(OS_DB).sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  res.json({ items: rows });
});

// ============================================================
// =================  MÓDULO: REQUISIÇÃO  =====================
// ============================================================
/**
 * Modelo de REQ (armazenado em req.json):
 * { id, material, quantidade, garagem, frota, solicitante, data, codigo, descricao, status, createdBy, createdAt, updatedAt }
 * status: 'aberta' | 'andamento' | 'aguardando' | 'concluida'
 */

// Criar Requisição (somente admin)
app.post("/api/req", authRequired, roleRequired("admin"), (req, res) => {
  const { material, quantidade, garagem, frota, solicitante, data, codigo, descricao } = req.body;
  const reqs = readJson(REQ_DB);
  const item = {
    id: randomId("req"),
    material: String(material||"").trim(),
    quantidade: Number(quantidade||0),
    garagem: String(garagem||"").trim(),
    frota: String(frota||"").trim(),
    solicitante: String(solicitante||"").trim(),
    data: data || null,
    codigo: String(codigo||"").trim(),
    descricao: String(descricao||"").trim(),
    status: "aberta",
    createdBy: req.user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  reqs.push(item); writeJson(REQ_DB, reqs);
  res.status(201).json({ message: "Requisição criada", req: item });
});

// Listar Requisição + filtros
app.get("/api/req", authRequired, roleRequired("admin"), (req, res) => {
  const { status, frota, material, limit=50, page=1 } = req.query;
  let rows = readJson(REQ_DB);
  if (status) rows = rows.filter(r => r.status === status);
  if (frota)  rows = rows.filter(r => r.frota === String(frota));
  if (material) rows = rows.filter(r => r.material?.toLowerCase().includes(String(material).toLowerCase()));
  const p = Math.max(1, Number(page)); const l = Math.max(1, Math.min(1000, Number(limit)));
  const start = (p-1)*l; const end = start + l;
  res.json({ total: rows.length, page:p, pageSize:l, items: rows.slice(start,end) });
});

// Atualizar status (admin)
app.patch("/api/req/:id/status", authRequired, roleRequired("admin"), (req, res) => {
  const { id } = req.params; const { status } = req.body;
  const allowed = ["aberta","andamento","aguardando","concluida"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });
  const rows = readJson(REQ_DB);
  const i = rows.findIndex(r => r.id === id);
  if (i<0) return res.status(404).json({ error: "Requisição não encontrada." });
  rows[i].status = status; rows[i].updatedAt = new Date().toISOString();
  writeJson(REQ_DB, rows);
  res.json({ message: "Status atualizado", req: rows[i] });
});

// Métricas de Requisição
app.get("/api/req/metrics", authRequired, roleRequired("admin"), (req, res) => {
  const rows = readJson(REQ_DB);
  const counts = { aberta:0, andamento:0, aguardando:0, concluida:0 };
  rows.forEach(r => { counts[r.status] = (counts[r.status]||0)+1; });
  res.json({ counts, total: rows.length });
});

// Últimas Requisições
app.get("/api/req/recent", authRequired, roleRequired("admin"), (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const rows = readJson(REQ_DB).sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  res.json({ items: rows });
});

// ============================================================
// =================  MÓDULO: ABASTECIMENTO  ==================
// ============================================================
/**
 * Modelo de ABAST (armazenado em abast.json):
 * { id, dataHora, frota, kmVeiculo, kmInicioBomba, kmFimBomba, litros, createdBy, createdAt }
 */

// Criar Abastecimento (somente admin)
app.post("/api/abast", authRequired, roleRequired("admin"), (req, res) => {
  const { dataHora, frota, kmVeiculo, kmInicioBomba, kmFimBomba, litros } = req.body;
  const rows = readJson(ABAST_DB);
  const item = {
    id: randomId("ab"),
    dataHora: dataHora || new Date().toISOString(),
    frota: String(frota||"").trim(),
    kmVeiculo: Number(kmVeiculo||0),
    kmInicioBomba: Number(kmInicioBomba||0),
    kmFimBomba: Number(kmFimBomba||0),
    litros: Number(litros||0),
    createdBy: req.user?.id,
    createdAt: new Date().toISOString()
  };
  rows.push(item); writeJson(ABAST_DB, rows);
  res.status(201).json({ message: "Abastecimento registrado", abast: item });
});

// Listar Abastecimentos + filtros
app.get("/api/abast", authRequired, roleRequired("admin"), (req, res) => {
  const { frota, limit=50, page=1 } = req.query;
  let rows = readJson(ABAST_DB);
  if (frota) rows = rows.filter(r => r.frota === String(frota));
  const p = Math.max(1, Number(page)); const l = Math.max(1, Math.min(1000, Number(limit)));
  const start = (p-1)*l; const end = start + l;
  res.json({ total: rows.length, page:p, pageSize:l, items: rows.slice(start,end) });
});

// Métricas de Abastecimento (ex.: total de registros e total de litros)
app.get("/api/abast/metrics", authRequired, roleRequired("admin"), (req, res) => {
  const rows = readJson(ABAST_DB);
  const totalReg = rows.length;
  const totalLitros = rows.reduce((s,r)=> s + Number(r.litros||0), 0);
  res.json({ totalReg, totalLitros });
});

// Últimos Abastecimentos
app.get("/api/abast/recent", authRequired, roleRequired("admin"), (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const rows = readJson(ABAST_DB).sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  res.json({ items: rows });
});

// ============================================================
// =================  DASHBOARD: RESUMO GERAL  ================
// ============================================================
app.get("/api/dashboard/summary", authRequired, roleRequired("driver","admin"), (req, res) => {
  // OS
  const osRows = readJson(OS_DB);
  const osCounts = { aberta:0, andamento:0, aguardando:0, concluida:0 };
  osRows.forEach(r => { osCounts[r.status] = (osCounts[r.status]||0)+1; });
  const osRecent = osRows.sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  // REQ (se usuário for driver, não retorna detalhes)
  let reqCounts = null, reqRecent = null;
  if (req.user.role === "admin") {
    const reqRows = readJson(REQ_DB);
    reqCounts = { aberta:0, andamento:0, aguardando:0, concluida:0 };
    reqRows.forEach(r => { reqCounts[r.status] = (reqCounts[r.status]||0)+1; });
    reqRecent = reqRows.sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  }

  // ABAST (métricas simples para dashboard)
  let abast = null;
  if (req.user.role === "admin") {
    const abRows = readJson(ABAST_DB);
    const totalReg = abRows.length;
    const totalLitros = abRows.reduce((s,r)=> s + Number(r.litros||0), 0);
    const recent = abRows.sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
    abast = { totalReg, totalLitros, recent };
  }

  res.json({
    role: req.user.role,
    os: { counts: osCounts, recent: osRecent },
    req: reqCounts ? { counts: reqCounts, recent: reqRecent } : null,
    abast
  });
});

// ====== Páginas (guarda de HTML) ======
app.get(['/auth','/auth.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'auth.html'));
});
app.get(['/', '/index', '/index.html'], authRequired, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ====== Estáticos (CSS/JS/IMG) ======
app.use(express.static(PUBLIC_DIR));

// ====== Start ======
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ouvindo em 0.0.0.0`);
  console.log(`   • NODE_ENV        = ${process.env.NODE_ENV || '(vazio)'}`);
  console.log(`   • process.env.PORT= ${process.env.PORT || '(vazio)'}`);
  console.log(`   • PORT efetiva    = ${PORT}`);
});
