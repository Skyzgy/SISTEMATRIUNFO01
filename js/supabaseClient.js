// js/supabaseClient.js
// Este arquivo deve ser carregado como: <script type="module" src="js/supabaseClient.js"></script>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://vwoholfhrskkeuxbissq.supabase.co";  // << sua URL
const SUPABASE_ANON_KEY = "sb_publishable_FFLXV1o0MUUPJkmjXzURQw_3Emd9h07"; // << sua anon key

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL/ANON_KEY ausentes no supabaseClient.js");
}

window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);