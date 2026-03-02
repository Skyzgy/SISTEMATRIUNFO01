// SISTEMATRIUNFO/js/supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Seus dados do Supabase
const SUPABASE_URL = "https://vwoholfhrskkeuxbissq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FFLXV1o0MUUPJkmjXzURQw_3Emd9h07";

// 🚀 Cria o cliente e deixa disponível globalmente
window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);