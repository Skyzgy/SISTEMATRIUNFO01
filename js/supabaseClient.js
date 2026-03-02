// /js/supabaseClient.js
// Requer que a lib UMD do Supabase tenha sido carregada antes (em auth.html).

(() => {
  const SUPABASE_URL = 'https://vwoholfhrskkeuxbissq.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_FFLXV1o0MUUPJkmjXzURQw_3Emd9h07';

  const lib = window.supabase; // namespace da lib UMD
  if (!lib || typeof lib.createClient !== 'function') {
    console.error('[supabaseClient] Biblioteca do Supabase não carregada.');
    return;
  }

  try {
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    // Exponha o client como window.supabase
    window.supabase = client;
    window.supabaseClientReady = true;
    console.info('[supabaseClient] Cliente do Supabase inicializado.');
  } catch (e) {
    console.error('[supabaseClient] Erro ao criar client:', e);
  }
})();