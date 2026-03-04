// public/js/auth-page.js

// ✅ Base da API: em dev (localhost) usa o próprio Express local;
// em produção (Vercel), aponta para o backend público no Render.
const API_BASE =
  location.hostname === 'localhost'
    ? '' // desenvolvimento local: /api vai para o express local
    : 'https://sistematriunfoo01.onrender.com'; // PRODUÇÃO: backend público (Render)

// === Utilitários ===
const el = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);

// Helpers: gerar "e-mail virtual" a partir do nome (para não pedir e-mail)
const FAKE_DOMAIN = "drivers.local";
const slugifyName = (name) =>
  (name
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().toLowerCase()
    .replace(/[^a-z0-9 ]/g,'')
    .replace(/\s+/g,'.')) || `motorista.${Math.floor(Math.random()*1e6)}`;
const nameToEmail = (name) => `${slugifyName(name)}@${FAKE_DOMAIN}`;

// HTTP helper central (sempre com credenciais para enviar cookie httpOnly)
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha na requisição');
  return data;
}

// Alternância de telas (cadastro/login)
function setView(view) { // 'cadastro' | 'login'
  const isLogin = view === 'login';
  el('form-cadastro').classList.toggle('hidden', isLogin);
  el('form-login').classList.toggle('hidden', !isLogin);
  el('form-login').setAttribute('aria-hidden', (!isLogin).toString());

  if (isLogin) {
    el('switchText').textContent = 'Ainda não tem conta?';
    el('toggleLink').textContent = 'Cadastrar';
    el('toggleLink').setAttribute('href', '#cadastrar');
    el('toggleLink').setAttribute('aria-controls', 'form-cadastro');
  } else {
    el('switchText').textContent = 'Já tem conta?';
    el('toggleLink').textContent = 'Entrar';
    el('toggleLink').setAttribute('href', '#entrar');
    el('toggleLink').setAttribute('aria-controls', 'form-login');
  }
  ['cad-erro','cad-ok','log-erro'].forEach(id => { const n=el(id); if(n){ n.style.display='none'; n.textContent=''; }});
}

// Link de alternância & voltar
el('toggleLink')?.addEventListener('click', (e)=>{
  e.preventDefault();
  const toLogin = !el('form-cadastro').classList.contains('hidden');
  setView(toLogin ? 'login' : 'cadastro');
});
el('btnVoltarCadastro')?.addEventListener('click', () => setView('cadastro'));

// === Cadastro ===
el('form-cadastro')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  el('cad-erro').style.display='none'; el('cad-ok').style.display='none';

  const nome  = el('su_nome').value.trim();
  const senha = el('su_senha').value;

  if (nome.length < 2){ el('cad-erro').textContent='Informe um nome válido.'; el('cad-erro').style.display='block'; return; }
  if (senha.length < 6){ el('cad-erro').textContent='A senha deve ter pelo menos 6 caracteres.'; el('cad-erro').style.display='block'; return; }

  const btn = el('btnCriar'); btn.disabled = true; btn.textContent='Criando…';
  const email = nameToEmail(nome);

  try {
    const { user } = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: nome, email, password: senha, role: 'driver' })
    });
    el('cad-ok').textContent = `Conta criada para ${user.name}. Agora clique em "Entrar".`;
    el('cad-ok').style.display = 'block';
    setView('login');
  } catch (err) {
    const msg = String(err.message || '').toLowerCase().includes('cadastrado')
      ? 'Já existe uma conta com esse nome (e-mail virtual). Tente entrar.'
      : err.message;
    el('cad-erro').textContent = msg;
    el('cad-erro').style.display='block';
  } finally {
    btn.disabled = false; btn.textContent='Criar conta';
  }
});

// === Login ===
el('form-login')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  el('log-erro').style.display='none';

  const nome  = el('si_nome').value.trim();
  const senha = el('si_senha').value;

  if (!nome || senha.length < 6){
    el('log-erro').textContent='Informe um nome e uma senha com pelo menos 6 caracteres.';
    el('log-erro').style.display='block'; return;
  }

  const btn = el('btnEntrar'); btn.disabled = true; btn.textContent='Entrando…';
  const email = nameToEmail(nome);

  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: senha })
    });
    // Redireciona após login com sucesso
    window.location.href = "/";
  } catch (err) {
    el('log-erro').textContent = err.message || 'Erro no login.';
    el('log-erro').style.display='block';
  } finally {
    btn.disabled=false; btn.textContent='Entrar';
  }
});

// === Sessão / banner ===
(async () => {
  try {
    const { user } = await api('/api/auth/me', { method: 'GET' });
    if (user && qs.get('stay') !== '1') {
      const nameOrEmail = user.name || user.email || '(sem identificação)';
      el('sessionInfo').textContent = `Você já está logado como ${nameOrEmail}.`;
      el('sessionBanner').style.display = 'flex';

      el('forceLogout')?.addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); }
        catch(e) { console.warn(e); }
        el('sessionBanner').style.display = 'none';
        setView('login');
      });
    }
  } catch {
    // não logado; tudo normal
  }
})();

// View inicial
setView('cadastro');