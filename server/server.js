// server/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const USERS_DB   = path.join(__dirname, "users.json");

// ====== DB (arquivo JSON) ======
function ensureUsersFile() {
  if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, "[]", "utf8");
}
function readUsers() {
  ensureUsersFile();
  return JSON.parse(fs.readFileSync(USERS_DB, "utf8") || "[]");
}
function writeUsers(users) {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2), "utf8");
}
function randomId() {
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function findUserByName(firstName, lastName) {
  const users = readUsers();
  return users.find(
    (u) =>
      u.firstName.toLowerCase() === String(firstName || "").toLowerCase() &&
      u.lastName.toLowerCase() === String(lastName || "").toLowerCase()
  );
}
function isValidName(s) {
  return typeof s === "string" && s.trim().length >= 2 && s.trim().length <= 60;
}
function isValidSixDigitPassword(pwd) {
  return /^\d{6}$/.test(String(pwd));
}

// ====== Seed Admin ======
(function seedAdmin() {
  const users = readUsers();
  const hasAdmin = users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
    const lastName  = process.env.ADMIN_LAST_NAME  || "Master";
    const password  = process.env.ADMIN_PASSWORD  || "123456";
    if (!isValidSixDigitPassword(password)) {
      console.warn('ADMIN_PASSWORD deve ter 6 dígitos numéricos. Usando "123456".');
    }
    users.push({
      id: randomId(),
      firstName,
      lastName,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "admin",
      createdAt: new Date().toISOString(),
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

// ====== Auth middlewares ======
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

// ====== Healthcheck (novo) ======
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// ====== Rotas de API ======
// Cadastro
app.post("/api/auth/register", (req, res) => {
  const { firstName, lastName, password } = req.body;
  if (!isValidName(firstName) || !isValidName(lastName))
    return res.status(400).json({ error: "Nome e sobrenome devem ter de 2 a 60 caracteres." });
  if (!isValidSixDigitPassword(password))
    return res.status(400).json({ error: "A senha deve ter exatamente 6 dígitos numéricos." });
  if (findUserByName(firstName, lastName))
    return res.status(409).json({ error: "Usuário já cadastrado." });

  const users = readUsers();
  users.push({
    id: randomId(),
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: "driver",
    createdAt: new Date().toISOString(),
  });
  writeUsers(users);
  return res.status(201).json({ message: "Cadastro realizado com sucesso." });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { firstName, lastName, password } = req.body;
  const user = findUserByName(firstName, lastName);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });
  if (!bcrypt.compareSync(String(password || ""), user.passwordHash))
    return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign(
    { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8,
  });
  res.json({ message: "Login efetuado", role: user.role });
});

// Me
app.get("/api/auth/me", authRequired, (req, res) => res.json({ user: req.user }));

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout ok" });
});

// OS (driver e admin)
app.get("/api/os", authRequired, roleRequired("driver", "admin"), (req, res) => {
  res.json({
    module: "Abertura de OS",
    canOpen: true,
    items: [
      { id: "OS001", status: "aberta" },
      { id: "OS002", status: "aberta" },
    ],
  });
});

// Admin APIs (somente admin)
app.get("/api/admin/users", authRequired, roleRequired("admin"), (req, res) => {
  const users = readUsers().map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json({ users });
});

app.post("/api/admin/users", authRequired, roleRequired("admin"), (req, res) => {
  const { firstName, lastName, password, role } = req.body;
  if (!isValidName(firstName) || !isValidName(lastName))
    return res.status(400).json({ error: "Nome/sobrenome inválidos." });
  if (!isValidSixDigitPassword(password))
    return res.status(400).json({ error: "Senha deve ter 6 dígitos numéricos." });
  if (!["admin", "driver"].includes(role))
    return res.status(400).json({ error: "Role inválida." });
  if (findUserByName(firstName, lastName))
    return res.status(409).json({ error: "Usuário já existe." });

  const users = readUsers();
  users.push({
    id: randomId(),
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    createdAt: new Date().toISOString(),
  });
  writeUsers(users);
  res.status(201).json({ message: "Usuário criado" });
});

// ====== Páginas (guarda de HTML) ======
// Auth (sem guarda)
app.get(["/auth", "/auth.html"], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "auth.html"));
});

// Index (exige estar logado; UI já esconde admin-only via JS)
app.get(["/", "/index", "/index.html"], authRequired, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ====== Estáticos (CSS/JS/IMG) DEPOIS das rotas de página ======
app.use(express.static(PUBLIC_DIR));

// ====== Start ======
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});