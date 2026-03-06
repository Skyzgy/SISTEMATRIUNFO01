// public/js/role-guard.js
(async function roleGuard() {
  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
    return data;
  }

  // 1) Verifica sessão
  let role = null;
  try {
    const { user } = await api('/api/auth/me');
    role = user.role; // 'admin' ou 'driver'
  } catch {
    // sem sessão -> vai para login
    if (!location.pathname.endsWith('/auth') && !location.pathname.endsWith('/auth.html')) {
      location.href = '/auth';
    }
    return;
  }

  // 2) Esconde elementos de admin para driver
  if (role === 'driver') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });
  }

  // (Opcional) Log da sessão
  // console.log('[role-guard] role =', role);
})();
