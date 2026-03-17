const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Prisma Client (PostgreSQL)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// .env local apenas fora de produção
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config(); } catch {}
}

const app = express();
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// =====================================================
// 🔎 DIAGNÓSTICO ANTES DE QUALQUER MIDDLEWARE
// =====================================================
app.get("/ping-early", (_req, res) => {
  res.type("text/plain").send("pong-early");
});

// =====================================================
// MIDDLEWARES BÁSICOS + ESTÁTICOS
// =====================================================
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Estáticos do front
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// 🔎 LOGGER VERBOSO POR REQUEST
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`[REQ] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-t0}ms)`);
  });
  next();
});

// =====================================================
// HELPERS
// =====================================================
function isValidName(s){ return typeof s==="string" && s.trim().length>=2 && s.trim().length<=60; }
function isValidSixDigitPassword(p){ return /^\d{6}$/.test(String(p)); }

// Gera próximo número de OS como transação:
// 1) upsert em OSSequence (id=1)
// 2) incrementa last e devolve seq e id "YYYY-000001"
async function nextOSIdTx(tx) {
  const seqRow = await tx.oSSequence.upsert({
    where: { id: 1 },
    create: { id: 1, last: 1 },
    update: { last: { increment: 1 } }
  });
  const seq = seqRow.last; // já incrementado
  const year = new Date().getFullYear();
  const osId = `${year}-${String(seq).padStart(6, "0")}`;
  return { seq, osId };
}

// Middlewares de auth
function authRequired(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida/expirada" });
  }
}
function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}

// =====================================================
// 🔎 ROTAS DE SAÚDE (SEM JSON) + HEALTHZ JSON
// =====================================================
app.get("/ping", (_req, res) => {
  res.type("text/plain").send("pong");
});
app.get("/healthz-light", (_req, res) => {
  res.type("text/plain").send("ok");
});
app.get("/healthz", (_req, res) => {
  return res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// =====================================================
// PÁGINAS
// =====================================================
app.get(['/auth','/auth.html'], (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'auth.html')));
app.get(['/', '/index', '/index.html'], authRequired, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// =====================================================
// SEED ADMIN (se não houver)
// =====================================================
async function seedAdminIfMissing() {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (admin) return;
  const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
  const lastName  = process.env.ADMIN_LAST_NAME  || "Master";
  const password  = process.env.ADMIN_PASSWORD  || "123456";
  const hash = bcrypt.hashSync(password, 10);
  await prisma.user.create({
    data: { firstName, lastName, passwordHash: hash, role: "admin" }
  });
  console.log(`✅ Admin seed criado: ${firstName} ${lastName}`);
}

// =====================================================
// AUTH
// =====================================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    if (!isValidName(firstName) || !isValidName(lastName))
      return res.status(400).json({ error: "Nome e sobrenome devem ter de 2 a 60 caracteres." });
    if (!isValidSixDigitPassword(password))
      return res.status(400).json({ error: "A senha deve ter 6 dígitos numéricos." });

    const exists = await prisma.user.findFirst({
      where: {
        firstName: { equals: String(firstName).trim(), mode: "insensitive" },
        lastName:  { equals: String(lastName).trim(),  mode: "insensitive" }
      }
    });
    if (exists) return res.status(409).json({ error: "Usuário já cadastrado." });

    await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        passwordHash: bcrypt.hashSync(password, 10),
        role: "driver"
      }
    });
    return res.status(201).json({ message: "Cadastro realizado com sucesso." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao registrar." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        firstName: { equals: String(firstName||"").trim(), mode: "insensitive" },
        lastName:  { equals: String(lastName||"").trim(),  mode: "insensitive" }
      }
    });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas." });
    if (!bcrypt.compareSync(String(password||""), user.passwordHash))
      return res.status(401).json({ error: "Credenciais inválidas." });

    const token = jwt.sign({
      id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role
    }, JWT_SECRET, { expiresIn: "8h" });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000*60*60*8
    });
    res.json({ message: "Login efetuado", role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao autenticar." });
  }
});

app.get("/api/auth/me", authRequired, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/logout", (_req, res) => { res.clearCookie("token"); res.json({ message: "Logout ok" }); });

// =====================================================
// OS
// =====================================================

// ===============================
// (NOVA) OS ABERTAS para o select de Requisição
// ===============================
app.get("/api/os/open", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const { garagem, frota } = req.query;

    const where = { status: "aberta" };
    if (garagem) where.garagem = String(garagem);
    if (frota)   where.frota   = String(frota);

    const items = await prisma.oS.findMany({
      where,
      select: {
        id: true,
        garagem: true,
        frota: true,
        tipoServico: true,
        openedAt: true
      },
      orderBy: { openedAt: "desc" }
    });

    res.json({ items });
  } catch (err) {
    console.error("[GET /api/os/open] error:", err);
    res.status(500).json({ error: "Erro ao listar OS abertas." });
  }
});

// ===============================
// EXPORTAÇÃO EXCEL DE OS
// ===============================
app.get("/api/os/export.xlsx", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    // Carrega ExcelJS on-demand (evita falha de require caso não esteja instalado)
    const ExcelJS = require("exceljs");

    const { status, frota, mine } = req.query;
    const where = {};

    if (status) where.status = String(status);
    if (frota)  where.frota  = String(frota);

    // Escopo por papel
    if (req.user.role === "driver") {
      where.createdBy = req.user.id;
    } else if (String(mine).toLowerCase() === "1" || String(mine).toLowerCase() === "true") {
      where.createdBy = req.user.id;
    }

    // Exporta sem paginação (tudo que atender ao filtro)
    const items = await prisma.oS.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    // Monta a planilha
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ordens de Serviço");

    // Cabeçalho
    ws.addRow([
      "ID", "Seq", "Garagem", "Motorista", "Frota", "KM", "Tipo Serviço",
      "Descrição", "Status", "Aberta por", "Abertura", "Atualização"
    ]);
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6E6" } };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      };
    });

    // Linhas
    for (const os of items) {
      ws.addRow([
        os.id,
        os.seq ?? "",
        os.garagem || "",
        os.motorista || "",
        os.frota || "",
        os.km ?? "",
        os.tipoServico || "",
        os.descricao || "",
        os.status || "",
        os.openedByName || "",
        os.openedAt ? new Date(os.openedAt).toLocaleString("pt-BR") : "",
        os.updatedAt ? new Date(os.updatedAt).toLocaleString("pt-BR") : ""
      ]);
    }

    // Ajuste de largura automática simples
    ws.columns?.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const v = String(cell.value ?? "");
        max = Math.max(max, v.length + 2);
      });
      col.width = Math.min(Math.max(max, 12), 60);
    });

    // Headers de resposta
    const fileName = `os-export-${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Erro ao exportar Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel." });
  }
});

// Criar OS (driver/admin) com ID sequencial global
app.post("/api/os", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const { garagem, motorista, frota, km, tipoServico, descricao } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const { seq, osId } = await nextOSIdTx(tx);
      const now = new Date();
      const openedByName = `${req.user?.firstName || ""} ${req.user?.lastName || ""}`.trim();

      const item = await tx.oS.create({
        data: {
          id: osId,
          seq,
          garagem: String(garagem||"").trim(),
          motorista: motorista ? String(motorista).trim() : null,
          frota: String(frota||"").trim(),
          km: Number(km||0),
          tipoServico: String(tipoServico||"").trim(),
          descricao: String(descricao||"").trim(),
          status: "aberta",
          createdBy: req.user?.id || null,
          openedByName,
          openedAt: now,
          createdAt: now
        }
      });
      return item;
    });

    return res.status(201).json({ message: "OS criada", os: result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar OS." });
  }
});

// Listar OS – driver vê só as dele; admin vê tudo (admin pode ?mine=1)
app.get("/api/os", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const { status, frota, limit=50, page=1, mine } = req.query;

    const take = Math.max(1, Math.min(1000, Number(limit)));
    const p = Math.max(1, Number(page));
    const skip = (p-1)*take;

    const where = {};
    if (status) where.status = String(status);
    if (frota)  where.frota = String(frota);

    if (req.user.role === "driver") {
      where.createdBy = req.user.id;
    } else if (String(mine).toLowerCase() === "1" || String(mine).toLowerCase() === "true") {
      where.createdBy = req.user.id;
    }

    const [total, items] = await Promise.all([
      prisma.oS.count({ where }),
      prisma.oS.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take
      })
    ]);

    res.json({ total, page: p, pageSize: take, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar OS." });
  }
});

// (NOVA) Detalhes da OS + itens (Requisições) vinculados — Admin
app.get("/api/os/:id/details", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const os = await prisma.oS.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        garagem: true,
        frota: true,
        motorista: true,
        tipoServico: true,
        descricao: true,
        status: true,
        openedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!os) return res.status(404).json({ error: "OS não encontrada." });

    const itens = await prisma.req.findMany({
      where: { osId: String(id) },
      select: {
        id: true,
        material: true,
        quantidade: true,
        codigo: true,
        descricao: true,
        solicitante: true,
        garagem: true,
        frota: true,
        data: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ os, itens });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar detalhes da OS." });
  }
});

// Alterar status (admin)
app.patch("/api/os/:id/status", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["aberta","andamento","aguardando","concluida"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });

    const found = await prisma.oS.findUnique({ where: { id } });
    if (!found) return res.status(404).json({ error: "OS não encontrada." });

    const upd = await prisma.oS.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
    res.json({ message: "Status atualizado", os: upd });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar status da OS." });
  }
});

// Métricas / Recentes
app.get("/api/os/metrics", authRequired, roleRequired("driver","admin"), async (_req, res) => {
  try {
    const counts = {
      aberta:     await prisma.oS.count({ where: { status: "aberta" } }),
      andamento:  await prisma.oS.count({ where: { status: "andamento" } }),
      aguardando: await prisma.oS.count({ where: { status: "aguardando" } }),
      concluida:  await prisma.oS.count({ where: { status: "concluida" } }),
    };
    const total = counts.aberta + counts.andamento + counts.aguardando + counts.concluida;
    res.json({ counts, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao obter métricas de OS." });
  }
});

app.get("/api/os/recent", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
    const items = await prisma.oS.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar últimas OS." });
  }
});

// =====================================================
// REQUISIÇÕES (ADMIN)
// =====================================================

// (AJUSTADO) Criar Requisição — agora exige osId e valida OS ABERTA
app.post("/api/req", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { material, quantidade, garagem, frota, solicitante, data, codigo, descricao, osId } = req.body;

    // validações simples de campos (mantendo seu padrão)
    const erros = [];
    if (!material) erros.push("Informe o material.");
    if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (> 0).");
    if (!garagem) erros.push("Selecione a garagem.");
    if (!frota)   erros.push("Selecione a frota.");
    if (!solicitante) erros.push("Selecione o solicitante.");
    if (!codigo)  erros.push("Informe o código.");
    if (!descricao) erros.push("Informe a descrição.");

    // ✅ NOVO: exigir OS de destino
    if (!osId) erros.push("Selecione a OS (aberta) para vincular esta peça.");

    if (erros.length) return res.status(400).json({ error: erros.join(" ") });

    // validar OS vinculada (precisa existir e estar ABERTA)
    const osRef = await prisma.oS.findUnique({
      where: { id: String(osId) },
      select: { id: true, status: true }
    });
    if (!osRef) return res.status(400).json({ error: "OS informada não existe." });
    if (osRef.status !== "aberta") {
      return res.status(400).json({ error: "Somente OS com status ABERTA podem receber requisições." });
    }

    // coerção de data (opcional)
    let dataParsed = null;
    if (data) {
      const d = new Date(data);
      if (!isNaN(d.getTime())) dataParsed = d;
    }

    // cria a requisição já vinculada
    const item = await prisma.req.create({
      data: {
        material: String(material||"").trim(),
        quantidade: Number(quantidade||0),
        garagem: String(garagem||"").trim(),
        frota: String(frota||"").trim(),
        solicitante: String(solicitante||"").trim(),
        data: dataParsed,
        codigo: String(codigo||"").trim(),
        descricao: String(descricao||"").trim(),
        status: "aberta",
        createdBy: req.user?.id || null,

        // vínculo
        osId: String(osId)
      }
    });

    res.status(201).json({ message: "Requisição criada", req: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar requisição." });
  }
});

app.get("/api/req", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { status, frota, material, limit=50, page=1 } = req.query;
    const take = Math.max(1, Math.min(1000, Number(limit)));
    const p = Math.max(1, Number(page));
    const skip = (p-1)*take;

    const where = {};
    if (status) where.status = String(status);
    if (frota)  where.frota  = String(frota);
    if (material) where.material = { contains: String(material), mode: "insensitive" };

    const [total, items] = await Promise.all([
      prisma.req.count({ where }),
      prisma.req.findMany({ where, orderBy: { createdAt: "desc" }, skip, take })
    ]);

    res.json({ total, page: p, pageSize: take, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar requisições." });
  }
});

app.patch("/api/req/:id/status", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params; const { status } = req.body;
    const allowed = ["aberta","andamento","aguardando","concluida"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });

    const found = await prisma.req.findUnique({ where: { id } });
    if (!found) return res.status(404).json({ error: "Requisição não encontrada." });

    const upd = await prisma.req.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
    res.json({ message: "Status atualizado", req: upd });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar status da requisição." });
  }
});

// =====================================================
// ABASTECIMENTO (ADMIN)
// =====================================================
app.post("/api/abast", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { dataHora, frota, kmVeiculo, kmInicioBomba, kmFimBomba, litros } = req.body;
    const item = await prisma.abastecimento.create({
      data: {
        dataHora: dataHora ? new Date(dataHora) : new Date(),
        frota: String(frota||"").trim(),
        kmVeiculo: Number(kmVeiculo||0),
        kmInicioBomba: Number(kmInicioBomba||0),
        kmFimBomba: Number(kmFimBomba||0),
        litros: Number(litros||0),
        createdBy: req.user?.id || null
      }
    });
    res.status(201).json({ message: "Abastecimento registrado", abast: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao registrar abastecimento." });
  }
});

app.get("/api/abast", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { frota, limit=50, page=1 } = req.query;
    const take = Math.max(1, Math.min(1000, Number(limit)));
    const p = Math.max(1, Number(page));
    const skip = (p-1)*take;

    const where = {};
    if (frota) where.frota = String(frota);

    const [total, items] = await Promise.all([
      prisma.abastecimento.count({ where }),
      prisma.abastecimento.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take
      })
    ]);

    res.json({ total, page: p, pageSize: take, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar abastecimentos." });
  }
});

// =====================================================
// DASHBOARD SUMMARY
// =====================================================
app.get("/api/dashboard/summary", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    // OS
    const [aberta, andamento, aguardando, concluida] = await Promise.all([
      prisma.oS.count({ where: { status: "aberta" } }),
      prisma.oS.count({ where: { status: "andamento" } }),
      prisma.oS.count({ where: { status: "aguardando" } }),
      prisma.oS.count({ where: { status: "concluida" } }),
    ]);
    const osCounts = { aberta, andamento, aguardando, concluida };
    const osRecent = await prisma.oS.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

    let reqCounts = null, reqRecent = null, abast = null;
    if (req.user.role === "admin") {
      const [rA, rAnd, rAg, rC] = await Promise.all([
        prisma.req.count({ where: { status: "aberta" } }),
        prisma.req.count({ where: { status: "andamento" } }),
        prisma.req.count({ where: { status: "aguardando" } }),
        prisma.req.count({ where: { status: "concluida" } }),
      ]);
      reqCounts = { aberta: rA, andamento: rAnd, aguardando: rAg, concluida: rC };
      reqRecent = await prisma.req.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

      const abRows = await prisma.abastecimento.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
      const totalReg = await prisma.abastecimento.count();
      const totalLitros = await prisma.abastecimento.aggregate({ _sum: { litros: true } });
      abast = { totalReg, totalLitros: Number(totalLitros._sum.litros || 0), recent: abRows };
    }

    res.json({
      role: req.user.role,
      os: { counts: osCounts, recent: osRecent },
      req: reqCounts ? { counts: reqCounts, recent: reqRecent } : null,
      abast
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao montar o dashboard." });
  }
});

// =====================================================
// STARTUP
// =====================================================

/** Aguarda o PostgreSQL estar acessível com retry + backoff linear. */
async function waitForDb(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅ Conexão com Postgres ok (tentativa ${attempt}/${maxRetries}).`);
      return;
    } catch (err) {
      console.warn(`⏳ Postgres indisponível (tentativa ${attempt}/${maxRetries}): ${err?.message || err}`);
      if (attempt < maxRetries) {
        const wait = delayMs * attempt;
        console.log(`   Aguardando ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error("Não foi possível conectar ao PostgreSQL após todas as tentativas.");
}

(async () => {
  try {
    await waitForDb(
      parseInt(process.env.DB_RETRIES  || "10", 10),
      parseInt(process.env.DB_DELAY_MS || "3000", 10)
    );

    await seedAdminIfMissing();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server ouvindo em 0.0.0.0:${PORT}`);
      console.log(`   • NODE_ENV        = ${process.env.NODE_ENV || '(vazio)'}`);
      console.log(`   • process.env.PORT= ${process.env.PORT || '(vazio)'}`);
    });
  } catch (err) {
    console.error("Falha ao iniciar:", err);
    process.exit(1);
  }
})();

// Logs de crash não tratados
process.on("unhandledRejection", (r) => {
  console.error("unhandledRejection:", r);
});
process.on("uncaughtException", (e) => {
  console.error("uncaughtException:", e);
});
