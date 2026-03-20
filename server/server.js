// =====================================================
// Triunfo System - Backend Oficial (Versão Otimizada)
// =====================================================

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

// Prisma Client (PostgreSQL)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  log: ["error", "warn"]
});

// =====================================================
// ENV
// =====================================================
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config(); } catch {}
}

const app = express();
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// =====================================================
// HEALTH CHECK ANTES DE TUDO
// =====================================================
app.get("/ping-early", (_req, res) => {
  res.type("text/plain").send("pong-early");
});

// =====================================================
// MIDDLEWARES BASE
// =====================================================
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Estáticos do front
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// Logger simples
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`[REQ] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
  });
  next();
});

// =====================================================
// HELPERS
// =====================================================

function isValidName(s) {
  return typeof s === "string" && s.trim().length >= 2 && s.trim().length <= 60;
}

function isValidSixDigitPassword(p) {
  return /^\d{6}$/.test(String(p));
}

// Sequência OS
async function nextOSIdTx(tx) {
  const seqRow = await tx.oSSequence.upsert({
    where: { id: 1 },
    create: { id: 1, last: 1 },
    update: { last: { increment: 1 } }
  });

  const seq = seqRow.last;
  const year = new Date().getFullYear();
  const osId = `${year}-${String(seq).padStart(6, "0")}`;

  return { seq, osId };
}

// =====================================================
// SEQUÊNCIA DE REQUISIÇÕES (REQ-AAAA-000001)
// =====================================================
async function nextReqIdTx(tx) {
  const seqRow = await tx.reqSequence.upsert({
    where: { id: 1 },
    create: { id: 1, last: 1 },
    update: { last: { increment: 1 } }
  });

  const seq = seqRow.last;
  const year = new Date().getFullYear();
  const reqId = `REQ-${year}-${String(seq).padStart(6, "0")}`;

  return { seq, reqId };
}

// =====================================================
// AUTH MIDDLEWARES
// =====================================================

function authRequired(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}

// =====================================================
// ROTAS DE HEALTH
// =====================================================
app.get("/ping", (_req, res) => res.type("text/plain").send("pong"));

app.get("/healthz-light", (_req, res) =>
  res.type("text/plain").send("ok")
);

app.get("/healthz", (_req, res) =>
  res.status(200).json({ ok: true, ts: new Date().toISOString() })
);

// =====================================================
// PÁGINAS DO FRONT
// =====================================================
app.get(['/auth','/auth.html'], (_req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'auth.html'))
);

app.get(['/', '/index', '/index.html'], authRequired, (_req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
);

// =====================================================
// SEED ADMIN
// =====================================================
async function seedAdminIfMissing() {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (admin) return;

  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "123456", 10);

  await prisma.user.create({
    data: {
      firstName: process.env.ADMIN_FIRST_NAME || "Admin",
      lastName: process.env.ADMIN_LAST_NAME || "Master",
      passwordHash: hash,
      role: "admin"
    }
  });

  console.log("✅ Admin padrão criado.");
}

// =====================================================
// AUTH (LOGIN, REGISTRO, SESSÃO)
// =====================================================

// Registrar usuário (driver por padrão)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    if (!isValidName(firstName) || !isValidName(lastName)) {
      return res.status(400).json({
        error: "Nome e sobrenome devem ter de 2 a 60 caracteres."
      });
    }

    if (!isValidSixDigitPassword(password)) {
      return res.status(400).json({
        error: "A senha deve ter exatamente 6 dígitos numéricos."
      });
    }

    // Evita duplicidade
    const exists = await prisma.user.findFirst({
      where: {
        firstName: { equals: firstName.trim(), mode: "insensitive" },
        lastName:  { equals: lastName.trim(), mode: "insensitive" }
      }
    });

    if (exists) {
      return res.status(409).json({ error: "Usuário já cadastrado." });
    }

    await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash: bcrypt.hashSync(password, 10),
        role: "driver"
      }
    });

    res.status(201).json({ message: "Cadastro realizado com sucesso." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao registrar." });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        firstName: { equals: (firstName || "").trim(), mode: "insensitive" },
        lastName:  { equals: (lastName || "").trim(),  mode: "insensitive" }
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (!bcrypt.compareSync(String(password || ""), user.passwordHash)) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign({
      id: user.id,
      firstName: user.firstName,
      lastName:  user.lastName,
      role:      user.role
    }, JWT_SECRET, { expiresIn: "8h" });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    });

    res.json({ message: "Login efetuado", role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao autenticar." });
  }
});

// Sessão atual
app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

// Logout
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout ok" });
});

// =====================================================
// OS (ORDENS DE SERVIÇO)
// =====================================================

// Lista OS abertas — para select em /api/req
app.get("/api/os/open", authRequired, roleRequired("driver", "admin"), async (req, res) => {
  try {
    const { garagem, frota } = req.query;

    const where = { status: "aberta" };
    if (garagem) where.garagem = String(garagem);
    if (frota) where.frota = String(frota);

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


// =====================================================
// Exportar OS para Excel
// =====================================================
app.get("/api/os/export.xlsx", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const { status, frota, mine } = req.query;

    const where = {};

    if (status) where.status = String(status);
    if (frota) where.frota = String(frota);

    if (req.user.role === "driver") {
      where.createdBy = req.user.id;
    } else if (String(mine).toLowerCase() === "1") {
      where.createdBy = req.user.id;
    }

    const items = await prisma.oS.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ordens de Serviço");

    ws.addRow([
      "ID", "Seq", "Garagem", "Motorista", "Frota", "KM",
      "Tipo Serviço", "Descrição", "Status", "Aberta por",
      "Abertura", "Atualização"
    ]);

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6E6" } };
    });

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

    ws.columns?.forEach(col => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, c => {
        max = Math.max(max, String(c.value ?? "").length + 2);
      });
      col.width = Math.min(Math.max(12, max), 60);
    });

    const fileName = `os-export-${Date.now()}.xlsx`;
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",
      `attachment; filename=${fileName}`);

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Erro ao exportar Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel." });
  }
});


// =====================================================
// Criar OS (ID sequencial global)
// =====================================================
app.post("/api/os", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const { garagem, motorista, frota, km, tipoServico, descricao } = req.body;

    const item = await prisma.$transaction(async tx => {
      const { seq, osId } = await nextOSIdTx(tx);

      const now = new Date();
      const openedByName =
        `${req.user?.firstName || ""} ${req.user?.lastName || ""}`.trim();

      return tx.oS.create({
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
          createdBy: req.user.id,
          openedByName,
          openedAt: now,
          createdAt: now
        }
      });
    });

    res.status(201).json({ message: "OS criada", os: item });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar OS." });
  }
});


// =====================================================
// Listagem de OS (driver vê só as dele)
// =====================================================
app.get("/api/os", authRequired, roleRequired("driver","admin"), async (req, res) => {
  try {
    const { status, frota, limit=50, page=1, mine } = req.query;

    const take = Math.max(1, Math.min(1000, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where = {};
    if (status) where.status = String(status);
    if (frota)  where.frota = String(frota);

    if (req.user.role === "driver") {
      where.createdBy = req.user.id;
    } else if (String(mine).toLowerCase() === "1") {
      where.createdBy = req.user.id;
    }

    const [total, items] = await Promise.all([
      prisma.oS.count({ where }),
      prisma.oS.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take
      })
    ]);

    res.json({ total, page: Number(page), pageSize: take, items });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar OS." });
  }
});


// =====================================================
// Detalhes de OS (somente admin)
// =====================================================
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
      orderBy: { createdAt: "desc" }
    });

    res.json({ os, itens });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar detalhes da OS." });
  }
});


// =====================================================
// Alterar status (somente admin)
// =====================================================
app.patch("/api/os/:id/status", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["aberta","andamento","aguardando","concluida"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    const updated = await prisma.oS.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });

    res.json({ message: "Status atualizado", os: updated });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar o status da OS." });
  }
});


// =====================================================
// Métricas de OS
// =====================================================
app.get("/api/os/metrics", authRequired, roleRequired("driver", "admin"), async (_req, res) => {
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


// =====================================================
// Últimas OS criadas
// =====================================================
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
// REQUISIÇÕES (REQ)
// =====================================================

// Criar requisição — ADMIN e MECÂNICO
app.post("/api/req", authRequired, roleRequired("admin", "mechanic"), async (req, res) => {
  try {
    const { material, quantidade, garagem, frota, solicitante, data, codigo, descricao, osId } = req.body;

    // validações básicas
    const erros = [];
    if (!material) erros.push("Informe o material.");
    if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (> 0).");
    if (!garagem) erros.push("Selecione a garagem.");
    if (!frota) erros.push("Selecione a frota.");
    if (!solicitante) erros.push("Selecione o solicitante.");
    if (!codigo) erros.push("Informe o código.");
    if (!descricao) erros.push("Informe a descrição.");
    if (!osId) erros.push("Selecione a OS (aberta) para vincular.");

    if (erros.length) {
      return res.status(400).json({ error: erros.join(" ") });
    }

    // validação da OS vinculada
    const osRef = await prisma.oS.findUnique({
      where: { id: String(osId) },
      select: { status: true }
    });

    if (!osRef) return res.status(400).json({ error: "OS informada não existe." });

    if (osRef.status !== "aberta") {
      return res.status(400).json({ error: "Somente OS ABERTAS podem receber requisições." });
    }

    // converter data opcional
    let dataParsed = null;
    if (data) {
      const dt = new Date(data);
      if (!isNaN(dt)) dataParsed = dt;
    }

    // criar requisição com ID sequencial
    const reqItem = await prisma.$transaction(async tx => {
      const { reqId } = await nextReqIdTx(tx);

      return tx.req.create({
        data: {
          id: reqId,
          material: material.trim(),
          quantidade: Number(quantidade),
          garagem: garagem.trim(),
          frota: frota.trim(),
          solicitante: solicitante.trim(),
          data: dataParsed,
          codigo: codigo.trim(),
          descricao: descricao.trim(),
          status: "aberta",
          createdBy: req.user?.id || null,
          osId: String(osId),
        }
      });
    });

    res.status(201).json({
      message: "Requisição criada",
      req: reqItem
    });

  } catch (e) {
    console.error("[POST /api/req] erro:", e);
    res.status(500).json({ error: "Erro ao criar requisição." });
  }
});

// =====================================================
// Listar requisições — ADMIN e MECÂNICO
// =====================================================
app.get("/api/req", authRequired, roleRequired("admin", "mechanic"), async (req, res) => {
  try {
    const { 
      status,
      frota,
      garagem,
      solicitante,
      material,
      codigo,
      busca,
      limit = 50,
      page = 1,
      mine
    } = req.query;

    const take = Math.max(1, Math.min(500, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where = {};

    // 🔍 Filtros individuais
    if (status) where.status = String(status);
    if (frota) where.frota = String(frota);
    if (material) where.material = { contains: material, mode: "insensitive" };
    if (codigo) where.codigo = { contains: codigo, mode: "insensitive" };
    if (garagem && garagem !== "Todos") where.garagem = String(garagem);
    if (solicitante) where.solicitante = String(solicitante);

    // 👤 Somente minhas (para mecânico)
    if (mine === "1") where.createdBy = req.user.id;

    // 🔎 Busca geral
    if (busca && busca.trim() !== "") {
      const termo = String(busca).toLowerCase();
      where.OR = [
        { id: { contains: termo, mode: "insensitive" } },
        { frota: { contains: termo, mode: "insensitive" } },
        { garagem: { contains: termo, mode: "insensitive" } },
        { material: { contains: termo, mode: "insensitive" } },
        { solicitante: { contains: termo, mode: "insensitive" } },
        { codigo: { contains: termo, mode: "insensitive" } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.req.count({ where }),
      prisma.req.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take
      })
    ]);

    res.json({
      total,
      page: Number(page),
      pageSize: take,
      items
    });

  } catch (e) {
    console.error("[GET /api/req] erro:", e);
    res.status(500).json({ error: "Erro ao listar requisições." });
  }
});

// =====================================================
// Alterar status da Requisição — SOMENTE ADMIN
// =====================================================
app.patch("/api/req/:id/status", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["aberta", "andamento", "aguardando", "concluida"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    const found = await prisma.req.findUnique({ where: { id } });
    if (!found) return res.status(404).json({ error: "Requisição não encontrada." });

    const upd = await prisma.req.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });

    res.json({ message: "Status atualizado", req: upd });

  } catch (e) {
    console.error("[PATCH /api/req/:id/status] erro:", e);
    res.status(500).json({ error: "Erro ao atualizar status da requisição." });
  }
});

// =====================================================
// ABASTECIMENTO (ADMIN)
// =====================================================

// Criar abastecimento
app.post("/api/abast", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { dataHora, frota, kmVeiculo, kmInicioBomba, kmFimBomba, litros } = req.body;

    const erros = [];
    if (!frota) erros.push("Selecione a frota.");
    if (!litros || Number(litros) <= 0) erros.push("Informe a quantidade de litros (> 0).");
    if (!kmInicioBomba && kmInicioBomba !== 0) erros.push("Informe KM inicial da bomba.");
    if (!kmFimBomba && kmFimBomba !== 0) erros.push("Informe KM final da bomba.");

    if (erros.length) return res.status(400).json({ error: erros.join(" ") });

    const item = await prisma.abastecimento.create({
      data: {
        dataHora: dataHora ? new Date(dataHora) : new Date(),
        frota: String(frota).trim(),
        kmVeiculo: Number(kmVeiculo || 0),
        kmInicioBomba: Number(kmInicioBomba),
        kmFimBomba: Number(kmFimBomba),
        litros: Number(litros),
        createdBy: req.user?.id || null
      }
    });

    res.status(201).json({ message: "Abastecimento registrado", abast: item });

  } catch (e) {
    console.error("[POST /api/abast] erro:", e);
    res.status(500).json({ error: "Erro ao registrar abastecimento." });
  }
});

// Listar abastecimentos
app.get("/api/abast", authRequired, roleRequired("admin"), async (req, res) => {
  try {
    const { frota, limit = 50, page = 1 } = req.query;

    const take = Math.max(1, Math.min(1000, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where = {};
    if (frota) where.frota = String(frota);

    const [total, items] = await Promise.all([
      prisma.abastecimento.count({ where }),
      prisma.abastecimento.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take
      })
    ]);

    res.json({
      total,
      page: Number(page),
      pageSize: take,
      items
    });

  } catch (e) {
    console.error("[GET /api/abast] erro:", e);
    res.status(500).json({ error: "Erro ao listar abastecimentos." });
  }
});

// =====================================================
// DASHBOARD SUMMARY (ADMIN e DRIVER)
// =====================================================
app.get("/api/dashboard/summary", authRequired, roleRequired("driver", "admin"), async (req, res) => {
  try {

    // === Métricas de OS ===
    const [aberta, andamento, aguardando, concluida] = await Promise.all([
      prisma.oS.count({ where: { status: "aberta" } }),
      prisma.oS.count({ where: { status: "andamento" } }),
      prisma.oS.count({ where: { status: "aguardando" } }),
      prisma.oS.count({ where: { status: "concluida" } }),
    ]);

    const osRecent = await prisma.oS.findMany({
      orderBy: { createdAt: "desc" },
      take: 10
    });

    let reqCounts = null;
    let reqRecent = null;
    let abast = null;

    // === ADMIN VÊ TUDO ===
    if (req.user.role === "admin") {

      // Requisições
      const [rA, rAnd, rAg, rC] = await Promise.all([
        prisma.req.count({ where: { status: "aberta" } }),
        prisma.req.count({ where: { status: "andamento" } }),
        prisma.req.count({ where: { status: "aguardando" } }),
        prisma.req.count({ where: { status: "concluida" } }),
      ]);

      reqCounts = { aberta: rA, andamento: rAnd, aguardando: rAg, concluida: rC };

      reqRecent = await prisma.req.findMany({
        orderBy: { createdAt: "desc" },
        take: 10
      });

      // === Abastecimento ===
      const abRows = await prisma.abastecimento.findMany({
        orderBy: { createdAt: "desc" },
        take: 10
      });

      const totalAbast = await prisma.abastecimento.count();
      const totalLitros = await prisma.abastecimento.aggregate({
        _sum: { litros: true }
      });

      abast = {
        totalReg: totalAbast,
        totalLitros: Number(totalLitros._sum.litros || 0),
        recent: abRows
      };
    }

    res.json({
      role: req.user.role,
      os: {
        counts: { aberta, andamento, aguardando, concluida },
        recent: osRecent
      },
      req: reqCounts ? { counts: reqCounts, recent: reqRecent } : null,
      abast
    });

  } catch (e) {
    console.error("[/api/dashboard/summary] erro:", e);
    res.status(500).json({ error: "Erro ao montar o dashboard." });
  }
});


// =====================================================
// STARTUP DO SERVIDOR
// =====================================================
(async () => {
  try {

    // Teste leve do banco
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Conexão com Postgres OK");
    } catch (dbErr) {
      console.warn("⚠️ Não foi possível confirmar o Postgres:", dbErr?.message);
    }

    // Seed do admin
    await seedAdminIfMissing();

    // Inicia o servidor
    app.listen(PORT, "0.0.0.0", () => {
      console.log("=====================================");
      console.log(`🚀 Servidor rodando em 0.0.0.0:${PORT}`);
      console.log(`🌎 Ambiente: ${process.env.NODE_ENV || "dev"}`);
      console.log(`🔐 JWT_SECRET: ${JWT_SECRET ? "OK" : "VAZIO!!!"}`);
      console.log("=====================================");
    });

  } catch (err) {
    console.error("Falha ao iniciar servidor:", err);
    process.exit(1);
  }
})();


// =====================================================
// TRATAMENTO GLOBAL DE EXCEÇÕES
// =====================================================
process.on("unhandledRejection", (r) => {
  console.error("unhandledRejection:", r);
});
process.on("uncaughtException", (e) => {
  console.error("uncaughtException:", e);
});