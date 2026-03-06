// public/js/minhas-os.js

// Se front e API estão NO MESMO host (Railway servindo tudo), deixe vazio:
const API_URL = ''; 
// Se o front estiver na Vercel e a API no Railway, use a URL da API:
// const API_URL = 'https://sistematriunfo01-production.up.railway.app';

// Helper para chamadas à API (com cookie httpOnly)
async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  return data;
}

// Navegação simples por data-nav-target (se já existir no seu script.js, este bloco não conflita)
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-nav-target]');
  if (!btn) return;
  const target = btn.getAttribute('data-nav-target');
  document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
  const sec = document.getElementById(`tela-${target}`) || document.getElementById(target);
  if (sec) sec.classList.remove('hidden');

  // Se navegar para "minhas-os", recarrega a listagem
  if (target === 'minhas-os') {
    loadMyOsHistory();
  }
});

// Esconde Dashboard e admin-only para driver e mostra "Minhas OS"
(async function driverViewGuard() {
  try {
    const me = await api('/api/auth/me'); // { user: { role } }
    const role = me?.user?.role;

    if (role === 'driver') {
      // Esconda o botão de Dashboard e a seção
      document.querySelectorAll('[data-nav-target="dashboard"]').forEach(el => el.style.display = 'none');
      const dash = document.getElementById('tela-dashboard');
      if (dash) dash.style.display = 'none';

      // Esconde tudo que for admin-only
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      });

      // Leva para "Minhas OS" ao entrar
      document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
      const secMinhas = document.getElementById('tela-minhas-os');
      if (secMinhas) secMinhas.classList.remove('hidden');

      // Carrega a listagem do motorista
      await loadMyOsHistory();
    } else {
      // Admin: se quiser, pode carregar o dashboard aqui
      // (o seu script.js principal já deve estar cuidando disso)
    }
  } catch (e) {
    // sem sessão — o seu guard de sessão deve redirecionar p/ /auth
  }
})();

// Carrega a listagem "Minhas OS" (driver: apenas dele; admin: pode ver todas ou mine=1)
async function loadMyOsHistory() {
  const box = document.getElementById('tabela-minhas-os');
  if (!box) return;
  box.textContent = 'Carregando...';
  try {
    // Para driver, o servidor já restringe às próprias; para admin você pode usar ?mine=1
    const res = await api('/api/os?limit=100&page=1'); // para admin: '/api/os?mine=1&limit=100&page=1'
    const items = res?.items || [];

    if (!items.length) {
      box.textContent = 'Sem OS abertas por você.';
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #334">ID</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #334">Frota</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #334">Tipo</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #334">Status</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #334">Criada em</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    items.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px;border-bottom:1px solid #223">${r.id}</td>
        <td style="padding:8px;border-bottom:1px solid #223">${r.frota || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #223">${r.tipoServico || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #223">${r.status}</td>
        <td style="padding:8px;border-bottom:1px solid #223">${(r.createdAt||'').replace('T',' ').replace('Z','')}</td>
      `;
      tbody.appendChild(tr);
    });

    box.innerHTML = '';
    box.appendChild(table);
  } catch (err) {
    box.textContent = `Erro ao carregar suas OS: ${err.message}`;
  }
}

// (Opcional) se quiser que ao abrir uma OS pelo modal a listagem seja atualizada
(function wireOpenOSRefresh() {
  const btn = document.querySelector('[data-submit-os]');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', async () => {
    // Aguarda um pouco para a API salvar e então recarrega a listagem (se a seção estiver visível)
    setTimeout(() => {
      const secMinhas = document.getElementById('tela-minhas-os');
      if (secMinhas && !secMinhas.classList.contains('hidden')) {
        loadMyOsHistory();
      }
    }, 600);
  });
})();
``