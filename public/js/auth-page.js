// public/js/auth-page.js
// ===============================================
// Triunfo • Autenticação (Front-end)
// - Produção (Vercel) -> aponta para o Render
// - Desenvolvimento (localhost) -> usa o Express local
// - Cookies httpOnly com credentials: 'include'
// ===============================================

// ✅ Base da API (ajuste a URL do Render se mudar o nome do serviço)
const API_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '' // DEV local: usa o mesmo host do Express
    : 'https://sistematriunfoo01.onrender.com'; // PROD: backend público (Render)

// Utilitários de DOM
const el = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);

// Helpers: gerar "e-mail virtual" a partir do nome (para não pedir e‑mail real)
const FAKE_DOMAIN = "drivers.local";
const slugifyName = (name) =>
  (name
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().toLowerCase()
    .replace(/[^a-z0-9 ]/g,'')
    .replace(/\s+/g,'.')) || `motorista.${Math.floor(Math.random()*1e6)}`;
const nameToEmail = (name) => `${slugifyName(name)}@${FAKE_DOMAIN}`;

// Pequena espera (usado no retry por "cold start" do Render Free)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Cliente HTTP básico com:
 * - credentials: 'include' (envia/recebe cookie httpOnly)
 * - retries automáticos para lidar com "cold start" do Render (até 3 tentativas)
 */
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
      // Se o backend ainda estiver "acordando", o fetch pode nem chegar aqui (TypeError)
      // Quando chega, tentamos ler o JSON mesmo em erro para exibir mensagem clara
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Constrói erro amigável
        const msg = data?.error || data?.message || `Falha na requisição (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      lastErr = err;
      // Se for erro de rede/fetch (ex.: TypeError: Failed to fetch), tenta de novo com backoff
      const isNetwork = (err?.name === 'TypeError') || /fetch|network|Failed to fetch/i.test(String(err));
      if (attempt < 3 && isNetwork) {
        // 1ª tentativa espera 800ms, 2ª 1500ms antes de tentar de novo
        await sleep(attempt === 1 ? 800 : 1500);
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error('Falha na requisição');
}

// Alternância de telas (cadastro/login)
function setView(view) { // 'cadastro' | 'login'
  const isLogin = view === 'login';
  const cad = el('form-cadastro');
  const log = el('form-login');

  if (cad) cad.classList.toggle('hidden', isLogin);
  if (log) {
    log.classList.toggle('hidden', !isLogin);
    log.setAttribute('aria-hidden', (!isLogin).toString());
  }

  const switchText = el('switchText');
  const toggle = el('toggleLink');
  if (switchText && toggle) {
    if (isLogin) {
      switchText.textContent = 'Ainda não tem conta?';
      toggle.textContent = 'Cadastrar';
      toggle.setAttribute('href', '#cadastrar');
      toggle.setAttribute('aria-controls', 'form-cadastro');
    } else {
      switchText.textContent = 'Já tem conta?';
      toggle.textContent = 'Entrar';
      toggle.setAttribute('href', '#entrar');
      toggle.setAttribute('aria-controls', 'form-login');
    }
  }

  // Limpa mensagens
  ['cad-erro','cad-ok','log-erro'].forEach(id => {
    const n = el(id);
    if (n) { n.style.display = 'none'; n.textContent = ''; }
  });
}

// Listeners de alternância
el('toggleLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  const cad = el('form-cadastro');
  const toLogin = cad && !cad.classList.contains('hidden');
  setView(toLogin ? 'login' : 'cadastro');
});
el('btnVoltarCadastro')?.addEventListener('click', () => setView('cadastro'));

// === CADASTRO ===
el('form-cadastro')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = el('cad-erro');
  const okBox  = el('cad-ok');
  if (errBox) { errBox.style.display='none'; errBox.textContent=''; }
  if (okBox)  { okBox.style.display='none'; okBox.textContent=''; }

  const nome  = el('su_nome')?.value?.trim() || '';
  const senha = el('su_senha')?.value || '';

  if (nome.length < 2) {
    if (errBox) { errBox.textContent='Informe um nome válido.'; errBox.style.display='block'; }
    return;
  }
  if (senha.length < 6) {
    if (errBox) { errBox.textContent='A senha deve ter pelo menos 6 caracteres.'; errBox.style.display='block'; }
    return;
  }

  const btn = el('btnCriar');
  if (btn) { btn.disabled = true; btn.textContent='Criando…'; }

  const email = nameToEmail(nome);

  try {
    const { user } = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: nome, email, password: senha, role: 'driver' })
    });
    if (okBox) {
      okBox.textContent = `Conta criada para ${user?.name || nome}. Agora clique em "Entrar".`;
      okBox.style.display = 'block';
    }
    setView('login');
  } catch (err) {
    const msgRaw = String(err?.message || 'Erro ao criar conta');
    const msg = /cadastrado|unique|email/i.test(msgRaw)
      ? 'Já existe uma conta com esse nome (e‑mail virtual). Tente entrar.'
      : msgRaw;
    if (errBox) { errBox.textContent = msg; errBox.style.display='block'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent='Criar conta'; }
  }
});

// === LOGIN ===
el('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = el('log-erro');
  if (errBox) { errBox.style.display='none'; errBox.textContent=''; }

  const nome  = el('si_nome')?.value?.trim() || '';
  const senha = el('si_senha')?.value || '';

  if (!nome || senha.length < 6) {
    if (errBox) {
      errBox.textContent='Informe um nome e uma senha com pelo menos 6 caracteres.';
      errBox.style.display='block';
    }
    return;
  }

  const btn = el('btnEntrar');
  if (btn) { btn.disabled = true; btn.textContent='Entrando…'; }

  const email = nameToEmail(nome);

  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: senha })
    });
    // Redireciona após login com sucesso
    window.location.href = "/";
  } catch (err) {
    if (errBox) { errBox.textContent = err?.message || 'Erro no login.'; errBox.style.display='block'; }
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='Entrar'; }
  }
});

// === Sessão / banner ===
(async () => {
  try {
    const { user } = await api('/api/auth/me', { method: 'GET' });
    if (user && qs.get('stay') !== '1') {
      const banner = el('sessionBanner');
      const info   = el('sessionInfo');
      if (info) info.textContent = `Você já está logado como ${user.name || user.email || '(sem identificação)'}.`;
      if (banner) banner.style.display = 'flex';

      el('forceLogout')?.addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); }
        catch(e) { console.warn('Erro ao sair:', e); }
        if (banner) banner.style.display = 'none';
        setView('login');
      });
    }
  } catch {
    // não logado; segue o fluxo normal
  }
})();

// View padrão ao abrir a página
setView('cadastro');