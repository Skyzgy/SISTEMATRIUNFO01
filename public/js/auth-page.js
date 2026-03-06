// public/js/auth-page.js

// ===== Utilitários básicos =====
const $ = (sel) => document.querySelector(sel);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function setLoading(btn, isLoading, textWhileLoading = "Aguarde...") {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.prevText = btn.textContent;
    btn.textContent = textWhileLoading;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.prevText || btn.textContent;
    btn.disabled = false;
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  return data;
}

// Divide "João da Silva" em { firstName:"João", lastName:"da Silva" }
function splitFullName(full) {
  const clean = String(full || "").trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length < 2) return null; // exige nome + sobrenome
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function isSixDigitPassword(p) {
  return /^\d{6}$/.test(String(p || ""));
}

// ===== Elementos do DOM (conforme seu HTML) =====
const formCadastro = document.getElementById("form-cadastro");
const formLogin    = document.getElementById("form-login");

const su_nome  = document.getElementById("su_nome");
const su_senha = document.getElementById("su_senha");
const cadErro  = document.getElementById("cad-erro");
const cadOk    = document.getElementById("cad-ok");
const btnCriar = document.getElementById("btnCriar");

const si_nome  = document.getElementById("si_nome");
const si_senha = document.getElementById("si_senha");
const logErro  = document.getElementById("log-erro");
const btnEntrar = document.getElementById("btnEntrar");

const btnVoltarCadastro = document.getElementById("btnVoltarCadastro");

const switchText = document.getElementById("switchText");
const toggleLink = document.getElementById("toggleLink");

const sessionBanner = document.getElementById("sessionBanner");
const sessionInfo   = document.getElementById("sessionInfo");
const forceLogout   = document.getElementById("forceLogout");

// ===== Alternância Cadastro <-> Login =====
function showCadastro() {
  formCadastro?.classList.remove("hidden");
  formCadastro?.setAttribute("aria-hidden", "false");
  formLogin?.classList.add("hidden");
  formLogin?.setAttribute("aria-hidden", "true");
  if (switchText) switchText.textContent = "Já tem conta?";
  if (toggleLink) toggleLink.textContent = "Entrar";
  if (toggleLink) toggleLink.setAttribute("href", "#entrar");

  if (cadErro) cadErro.style.display = "none";
  if (cadOk)   cadOk.style.display   = "none";
  if (logErro) logErro.style.display = "none";
}

function showLogin() {
  formLogin?.classList.remove("hidden");
  formLogin?.setAttribute("aria-hidden", "false");
  formCadastro?.classList.add("hidden");
  formCadastro?.setAttribute("aria-hidden", "true");
  if (switchText) switchText.textContent = "Ainda não tem conta?";
  if (toggleLink) toggleLink.textContent = "Criar conta";
  if (toggleLink) toggleLink.setAttribute("href", "#criar");

  if (cadErro) cadErro.style.display = "none";
  if (cadOk)   cadOk.style.display   = "none";
  if (logErro) logErro.style.display = "none";
}

on(toggleLink, "click", (e) => {
  e.preventDefault();
  const isLoginHidden = formLogin?.classList.contains("hidden");
  if (isLoginHidden) showLogin(); else showCadastro();
});

on(btnVoltarCadastro, "click", () => showCadastro());

// ===== Banner de sessão ativa =====
async function checkSession() {
  try {
    const { user } = await api("/api/auth/me");
    // sessão ativa
    if (sessionBanner) {
      sessionBanner.style.display = "flex";
      if (sessionInfo) {
        sessionInfo.textContent = `Você já está logado como ${user.firstName} ${user.lastName} (${user.role}).`;
      }
    }
  } catch {
    if (sessionBanner) sessionBanner.style.display = "none";
  }
}

on(forceLogout, "click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    if (sessionBanner) sessionBanner.style.display = "none";
    showCadastro();
  } catch (err) {
    alert(err.message);
  }
});

// ===== Fluxo de Cadastro =====
on(formCadastro, "submit", async (e) => {
  e.preventDefault();
  cadErro.style.display = "none";
  cadOk.style.display   = "none";

  const fullName = su_nome?.value || "";
  const password = su_senha?.value || "";

  const names = splitFullName(fullName);
  if (!names) {
    cadErro.textContent = "Informe nome completo (nome e sobrenome).";
    cadErro.style.display = "block";
    return;
  }
  if (!isSixDigitPassword(password)) {
    cadErro.textContent = "A senha deve ter exatamente 6 dígitos numéricos (ex.: 123456).";
    cadErro.style.display = "block";
    return;
  }

  const payload = { ...names, password };

  try {
    setLoading(btnCriar, true, "Criando...");
    // 1) Cadastra
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    cadOk.textContent = "Cadastro criado! Entrando...";
    cadOk.style.display = "block";

    // 2) Login automático
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    // 3) Vai para o sistema
    location.href = "/";
  } catch (err) {
    const msg = String(err.message || "");
    cadErro.textContent = msg;
    cadErro.style.display = "block";

    if (/já cadastrado|já existe|409/i.test(msg)) {
      showLogin();
      if (si_nome) si_nome.value = fullName;
      if (si_senha) si_senha.value = password;
    }
  } finally {
    setLoading(btnCriar, false);
  }
});

// ===== Fluxo de Login =====
on(formLogin, "submit", async (e) => {
  e.preventDefault();
  logErro.style.display = "none";

  const fullName = si_nome?.value || "";
  const password = si_senha?.value || "";

  const names = splitFullName(fullName);
  if (!names) {
    logErro.textContent = "Informe nome completo (nome e sobrenome).";
    logErro.style.display = "block";
    return;
  }
  if (!isSixDigitPassword(password)) {
    logErro.textContent = "Senha inválida. Use 6 dígitos numéricos (ex.: 123456).";
    logErro.style.display = "block";
    return;
  }

  try {
    setLoading(btnEntrar, true, "Entrando...");
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...names, password })
    });
    location.href = "/";
  } catch (err) {
    logErro.textContent = err.message;
    logErro.style.display = "block";
  } finally {
    setLoading(btnEntrar, false);
  }
});

// ===== Inicialização =====
(function init() {
  showCadastro();
  checkSession();
})();