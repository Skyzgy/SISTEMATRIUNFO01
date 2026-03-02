// /js/supabaseClient.js
// Requer que a lib UMD do Supabase tenha sido carregada antes:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>

(() => {
  // >>>>>>>>>>>>>>>>  SEUS DADOS  <<<<<<<<<<<<<<<<
  const SUPABASE_URL = 'https://vwoholfhrskkeuxbissq.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_FFLXV1o0MUUPJkmjXzURQw_3Emd9h07';
  // >>>>>>>>>>>>>>>>  /SEUS DADOS  <<<<<<<<<<<<<<<

  const lib = window.supabase; // a lib UMD expõe o namespace 'supabase' com createClient

  if (!lib || typeof lib.createClient !== 'function') {
    console.error('[supabaseClient] Biblioteca do Supabase não carregada.');
    return;
  }

  try {
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    // Tornamos o CLIENT disponível globalmente (substitui o namespace da lib)
    window.supabase = client;
    window.supabaseClientReady = true;
    console.info('[supabaseClient] Cliente do Supabase inicializado.');
  } catch (e) {
    console.error('[supabaseClient] Erro ao criar client:', e);
  }
})();