// public/js/auth-page.js
// ===============================================
// Triunfo • Autenticação (Front-end)
// ===============================================

// ✅ Ajuste a URL abaixo se o nome do serviço no Render mudar:
const API_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '' // DEV local
    : 'https://sistematriunfoo01.onrender.com'; // PROD (Render)

// Utilitários
const el = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);

const FAKE_DOMAIN = "drivers.local";
const slugifyName = (name) =>
  (name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .trim().toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,'.'))
  || `motorista.${Math.floor(Math.random()*1e6)}`;
const nameToEmail = (name) => `${slugifyName(name)}@${FAKE_DOMAIN}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const init = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  };

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Falha na requisição (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      lastErr = err;
      const isNetwork = (err?.name === 'TypeError') || /fetch|network|Failed to fetch/i.test(String(err));
      if (attempt < 3 && isNetwork) {
        await sleep(attempt === 1 ? 800 : 1500); // Render Free "cold start"
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error('Falha na requisição');
}

function setView(view) {
  const isLogin = view === 'login';
  el('form-cadastro')?.classList.toggle('hidden', isLogin);
  const loginEl = el('form-login');
  if (loginEl) {
    loginEl.classList.toggle('hidden', !isLogin);
    loginEl.setAttribute('aria-hidden', (!isLogin).toString());
  }
  const swText = el('switchText');
  const toggle = el('toggleLink');
  if (swText && toggle) {
    if (isLogin) {
      swText.textContent = 'Ainda não tem conta?';
      toggle.textContent = 'Cadastrar';
      toggle.setAttribute('href', '#cadastrar');
      toggle.setAttribute('aria-controls', 'form-cadastro');
    } else {
      swText.textContent = 'Já tem conta?';
      toggle.textContent = 'Entrar';
      toggle.setAttribute('href', '#entrar');
      toggle.setAttribute('aria-controls', 'form-login');
    }
  }
  ['cad-erro','cad-ok','log-erro'].forEach(id => { const n=el(id); if(n){ n.style.display='none'; n.textContent=''; }});
}

el('toggleLink')?.addEventListener('click', (e)=>{
  e.preventDefault();
  const toLogin = !el('form-cadastro')?.classList.contains('hidden');
  setView(toLogin ? 'login' : 'cadastro');
});
el('btnVoltarCadastro')?.addEventListener('click', () => setView('cadastro'));

// CADASTRO
el('form-cadastro')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const errBox = el('cad-erro'), okBox = el('cad-ok');
  if (errBox) { errBox.style.display='none'; errBox.textContent=''; }
  if (okBox)  { okBox.style.display='none'; okBox.textContent=''; }

  const nome  = el('su_nome')?.value?.trim() || '';
  const senha = el('su_senha')?.value || '';

  if (nome.length < 2) { if (errBox){ errBox.textContent='Informe um nome válido.'; errBox.style.display='block'; } return; }
  if (senha.length < 6){ if (errBox){ errBox.textContent='A senha deve ter pelo menos 6 caracteres.'; errBox.style.display='block'; } return; }

  const btn = el('btnCriar'); if (btn){ btn.disabled = true; btn.textContent='Criando…'; }
  const email = nameToEmail(nome);

  try {
    const { user } = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: nome, email, password: senha, role: 'driver' })
    });
    if (okBox) { okBox.textContent = `Conta criada para ${user?.name || nome}. Agora clique em "Entrar".`; okBox.style.display='block'; }
    setView('login');
  } catch (err) {
    const msgRaw = String(err?.message || 'Erro ao criar conta');
    const msg = /cadastrado|unique|email/i.test(msgRaw)
      ? 'Já existe uma conta com esse nome (e‑mail virtual). Tente entrar.'
      : msgRaw;
    if (errBox){ errBox.textContent = msg; errBox.style.display='block'; }
  } finally {
    if (btn){ btn.disabled = false; btn.textContent='Criar conta'; }
  }
});

// LOGIN
el('form-login')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const errBox = el('log-erro'); if (errBox){ errBox.style.display='none'; errBox.textContent=''; }

  const nome  = el('si_nome')?.value?.trim() || '';
  const senha = el('si_senha')?.value || '';

  if (!nome || senha.length < 6) {
    if (errBox){ errBox.textContent='Informe um nome e uma senha com pelo menos 6 caracteres.'; errBox.style.display='block'; }
    return;
  }

  const btn = el('btnEntrar'); if (btn){ btn.disabled = true; btn.textContent='Entrando…'; }
  const email = nameToEmail(nome);

  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: senha })
    });
    window.location.href = "/";
  } catch (err) {
    if (errBox){ errBox.textContent = err?.message || 'Erro no login.'; errBox.style.display='block'; }
  } finally {
    if (btn){ btn.disabled=false; btn.textContent='Entrar'; }
  }
});

// Sessão / banner
(async () => {
  try {
    const { user } = await api('/api/auth/me', { method: 'GET' });
    if (user && qs.get('stay') !== '1') {
      el('sessionInfo').textContent = `Você já está logado como ${user.name || user.email || '(sem identificação)'}.`;
      el('sessionBanner').style.display = 'flex';
      el('forceLogout')?.addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch(e) {}
        el('sessionBanner').style.display = 'none';
        setView('login');
      });
    }
  } catch {}
})();

setView('cadastro');