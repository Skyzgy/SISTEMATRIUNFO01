// js/supabaseClient.js
// Requer que a lib UMD do Supabase tenha sido carregada antes (tag acima).

(() => {
  const SUPABASE_URL = 'https://vwoholfhrskkeuxbissq.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_FFLXV1o0MUUPJkmjXzURQw_3Emd9h07';

  // 1) Guarde a LIB num nome separado e verifique
  const lib = window.supabase; // <-- ESTE é o namespace da LIB UMD
  if (!lib || typeof lib.createClient !== 'function') {
    console.error('[supabaseClient] Biblioteca UMD do Supabase não carregada (ordem dos scripts).');
    return;
  }
  window._supabaseLib = lib; // salva a referência da lib

  // 2) Evite recriar se já existir um client
  if (window.supabaseClient?.auth?.getSession) {
    console.info('[supabaseClient] Reutilizando client existente.');
    window.supabaseClientReady = true;
    return;
  }

  try {
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    // 3) Exponha o CLIENTE em outro nome
    window.supabaseClient = client;
    window.supabaseClientReady = true;
    console.info('[supabaseClient] Cliente do Supabase inicializado.');
  } catch (e) {
    console.error('[supabaseClient] Erro ao criar client:', e);
  }

  // 4) Helper global para esperar o client
  window.waitForSupabaseClient = function waitForSupabaseClient(timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function tick() {
        if (window.supabaseClient?.auth?.getSession) return resolve(window.supabaseClient);
        if (Date.now() - start > timeoutMs) return reject(new Error('Timeout esperando Supabase Client'));
        setTimeout(tick, 30);
      })();
    });
  };
})();
``