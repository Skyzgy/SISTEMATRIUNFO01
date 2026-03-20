/* =========================================================
   Triunfo System - Gestão de Frota
   script.js (COMPLETO e CONSOLIDADO)
   - Catálogos e utilitários
   - Modais (OS / Requisição / Abastecimento)
   - Navegação SPA
   - Tabelas (legado localStorage, mantidas)
   - API helpers + Dashboard (via /summary)
   - Tela inicial por perfil (driver → ‘minhas-os’; admin → ‘dashboard’)
   - Logout
   - Mobile menu (☰) – abrir/fechar sidebar no celular
   ========================================================= */

"use strict";

/* =========================
   Catálogos (dados reais)
========================= */
const bancoDeDados = {
  garagens: ["SANTA LUZIA", "MATOZINHOS"],
  tiposServico: ["MECÂNICA", "ELÉTRICA", "LANTERNAGEM", "BORRACHARIA", "REVISÃO"],
  motoristas: {
    "SANTA LUZIA": [
      "ADILSON DE LIMA","ALLAINE DECOTHE RODRIGUES","ANDERSON FERREIRA DA SILVA","ANDERSON MORGADO",
      "ANGELO PEDROSA","CARLOS MAGNO","DANIEL SILVA TEIXEIRA","DAVID DE OLIVEIRA",
      "EDENILSON DE SOUSA CARVALHO","EDIPO SANTOS INACIO","EDVANDO QUEIROZ","IOLANDA MELO",
      "MARCIO LUIZ","PEDRO AUGUSTO","RONALDO RODRIGUES","SEBASTIÃO REIS","THIAGO RIBEIRO",
      "TIAGO LUIZ","CRISTIANO PIMENTA","JEFFERSON SILVA"
    ],
    "MATOZINHOS": ["LUIZ FERNANDO", "ANTÔNIO SILVA", "FELIPE SOUZA", "BRUNO CASTRO"]
  },
  veiculos: {
    "SANTA LUZIA": [
      { modelo: "VOLARE W9 ON", placa: "PUD6B82", prefixo: "14102" },
      { modelo: "VOLARE W9 ON", placa: "PUD6B79", prefixo: "19505" },
      { modelo: "416CDISPRINTERM", placa: "RNG2A67", prefixo: "2110" },
      { modelo: "415CDISPRINTERM", placa: "GDM3I91", prefixo: "1522" },
      { modelo: "417 SPRINTER M", placa: "SIH6D51", prefixo: "2325" },
      { modelo: "DAILY 50MINIBUS-T", placa: "TDA8G63", prefixo: "25350" },
      { modelo: "417 SPRINTER M", placa: "TCH4E66", prefixo: "25250" },
      { modelo: "VOLARE W9 ON", placa: "OQN0I46", prefixo: "21303" },
      { modelo: "VOLARE W9 ON", placa: "OQR6F21", prefixo: "21302" },
      { modelo: "MA10 NEOBUS TH", placa: "HEH2G50", prefixo: "1124" },
      { modelo: "VOLARE W9 ON", placa: "OQN0A18", prefixo: "2121" },
      { modelo: "VOLARE W9 ON", placa: "OQB9D60", prefixo: "2331" },
      { modelo: "517 SPRINTER A4", placa: "TXG2D55", prefixo: "26140" },
      { modelo: "517 SPRINTER A4", placa: "TEW8B19", prefixo: "26110" },
      { modelo: "517 SPRINTER A4", placa: "TER1I80", prefixo: "26100" },
      { modelo: "517 SPRINTER A4", placa: "TER1I89", prefixo: "26090" },
      { modelo: "517 SPRINTER A4", placa: "TER1I79", prefixo: "26080" },
      { modelo: "517 SPRINTER A4", placa: "TER1I77", prefixo: "26070" },
      { modelo: "517 SPRINTER A4", placa: "TER1I85", prefixo: "26060" },
      { modelo: "517 SPRINTER A4", placa: "TER1I81", prefixo: "26050" },
      { modelo: "517 SPRINTER A4", placa: "TER1I87", prefixo: "26040" },
      { modelo: "517 SPRINTER A4", placa: "TER1I84", prefixo: "26030" },
      { modelo: "517 SPRINTER A4", placa: "TER1I82", prefixo: "26020" },
      { modelo: "517 SPRINTER A4", placa: "TER1I86", prefixo: "26010" }
    ],
    "MATOZINHOS": [{ modelo: "ÔNIBUS TESTE", placa: "AAA-0000", prefixo: "1010" }]
  }
};

// Solicitantes por garagem (para Requisição)
const solicitantesPorGaragem = {
  "SANTA LUZIA": ["SERGIO", "ADÃO", "WANDERLEY", "VAVA", "ROGERIO"],
  "MATOZINHOS":  ["SERGIO", "ADÃO", "WANDERLEY", "VAVA", "ROGERIO"]
};

/* =========================
   Persistência (localStorage) – legado p/ “Ver todos”
========================= */
const STORAGE_KEYS = { OS: "triunfo_os", REQ: "triunfo_req", ABAST: "triunfo_abast" };
let ordensServico   = carregarLista(STORAGE_KEYS.OS);
let requisicoes     = carregarLista(STORAGE_KEYS.REQ);
let abastecimentos  = carregarLista(STORAGE_KEYS.ABAST);

/* =========================
   Status padronizados (legado)
========================= */
const STATUS = ["ABERTA", "EM ANDAMENTO", "AGUARDANDO", "CONCLUÍDA"];

/* =========================
   Utilitários
========================= */
function carregarLista(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function salvarLista(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
function gerarId(prefix) { return `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`; }
function formatarDataBR(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function toISODateString(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${yy}-${mm}-${dd}`;
}
function ISOparaBR(isoStr) {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
}
function escapeHTML(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function normalizarStatus(s){ if(!s) return "ABERTA"; const b=String(s).trim().toUpperCase(); if (b==="FECHADA") return "CONCLUÍDA"; return STATUS.includes(b)?b:"ABERTA"; }
function setText(id,val){ const el=document.getElementById(id); if(el) el.textContent=String(val ?? 0); }
function hideEl(el){ if(!el) return; el.classList?.add('hidden'); if (el.style) el.style.display='none'; }
function showEl(el){ if(!el) return; el.classList?.remove('hidden'); if (el.style) el.style.display='block'; }
function obterFrotasCombinadas(){ const out=[]; Object.entries(bancoDeDados.veiculos||{}).forEach(([g,lista])=>{ (lista||[]).forEach(v=> out.push({garagem:g,prefixo:v.prefixo,placa:v.placa,modelo:v.modelo})); }); return out; }

/* =========================
   Suporte (foco em modais)
========================= */
let ultimoFoco = null;

/* =========================
   Modais - OS
========================= */
async function abrirModal() {
  const overlay = document.getElementById("modalOS");
  if (!overlay) return;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");

  const sGar = document.getElementById("selectGaragem");
  const iMot = document.getElementById("inputMotorista");
  const sFro = document.getElementById("selectFrota");
  const km   = document.getElementById("inputKM");
  const tp   = document.getElementById("selectTipoServico");
  const desc = document.getElementById("textoDescricao");

  if (sGar) sGar.value = "";
  if (iMot) iMot.value = "";
  if (sFro) sFro.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (km)   km.value = "";
  if (tp)   tp.value = "";
  if (desc) desc.value = "";

  // Buscar usuário logado e preencher motorista
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (data.user && iMot) {
      iMot.value = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim();
    }
  } catch (error) {
    console.warn('Erro ao buscar usuário logado:', error);
  }

  ultimoFoco = document.activeElement;
  setTimeout(() => sGar?.focus(), 0);
}

function fecharModal() {
  const overlay = document.getElementById("modalOS");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
  ultimoFoco?.focus();
}



/* =========================
   Modais - Requisição
========================= */
function abrirModalRequisicao() {
  const overlay = document.getElementById("modalRequisicao");
  if (!overlay) return;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");

  const material = document.getElementById("inputMaterial");
  const qtd      = document.getElementById("inputQuantidade");
  const gar      = document.getElementById("selectGaragemReq");
  const fro      = document.getElementById("selectFrotaReq");
  const sol      = document.getElementById("selectSolicitanteReq");
  const data     = document.getElementById("inputDataReq");
  const cod      = document.getElementById("inputCodigoReq");
  const desc     = document.getElementById("textoDescricaoReq");

  if (material) material.value = "";
  if (qtd)      qtd.value = "";
  if (gar)      gar.value = "";
  if (fro)      fro.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (sol)      sol.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (cod)      cod.value = "";
  if (desc)     desc.value = "";
  if (data && !data.value) data.value = toISODateString(new Date());

  // 🔗 Carregar OS abertas ao abrir o modal
  try { popularSelectOSReq(); } catch {}

  ultimoFoco = document.activeElement;
  setTimeout(() => material?.focus(), 0);
}
function fecharModalRequisicao() {
  const overlay = document.getElementById("modalRequisicao");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
  ultimoFoco?.focus();
}

/* =========================
   Modais - Abastecimento
========================= */
function abrirModalAbastecimento() {
  const overlay = document.getElementById("modalAbastecimento");
  if (!overlay) return;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");

  const agora = new Date();
  const pad = n => String(n).padStart(2, "0");
  const isoLocal = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}T${pad(agora.getHours())}:${pad(agora.getMinutes())}`;

  const dt   = document.getElementById("inputDataHoraAbast");
  const fro  = document.getElementById("selectFrotaAbast");
  const kmV  = document.getElementById("inputKMVeiculoAbast");
  const kmI  = document.getElementById("inputKMInicioBomba");
  const kmF  = document.getElementById("inputKMFimBomba");
  const qtd  = document.getElementById("inputQuantidadeLitros");

  if (dt)  dt.value = isoLocal;
  if (fro) fro.value = "";
  if (kmV) kmV.value = "";
  if (kmI) kmI.value = "";
  if (kmF) kmF.value = "";
  if (qtd) qtd.value = "";

  ultimoFoco = document.activeElement;
  setTimeout(() => dt?.focus(), 0);
}
function fecharModalAbastecimento() {
  const overlay = document.getElementById("modalAbastecimento");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
  ultimoFoco?.focus();
}

/* =========================
   Trap de foco (Tab) em modais
========================= */
function trapFocus(modalEl, e) {
  const focusables = modalEl.querySelectorAll(`
    a[href], button:not([disabled]),
    textarea, input, select, [tabindex]:not([tabindex="-1"])
  `);
  const list = Array.from(focusables).filter(el => el.offsetParent !== null);
  if (!list.length) return;

  const first = list[0];
  const last  = list[list.length - 1];

  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

/* =========================
   Navegação SPA
========================= */
function alternarTelas(tela) {
  const ids = ["dashboard", "listagem-os", "minhas-req", "listagem-abast", "minhas-os", "listagem-req"];
  ids.forEach(id => hideEl(document.getElementById(`tela-${id}`)));

  const destino = document.getElementById(`tela-${tela}`);
  showEl(destino);

  document.querySelectorAll(".menu-items button").forEach(b => b.classList.remove("active"));
  const btnAtivo = document.querySelector(`[data-nav-target="${tela}"]`);
  if (btnAtivo) btnAtivo.classList.add("active");
  else if (tela === "dashboard") document.querySelector(".menu-items button")?.classList.add("active");

  if (tela === "listagem-os")    renderizarTabelaOSCompleta();
  if (tela === "listagem-req-completo")   renderizarTabelaREQCompleta();
  if (tela === "listagem-abast") renderizarTabelaAbastecimentoCompleta();
  if (tela === "minhas-req") loadMyReqHistory();

  document.getElementById("conteudo")?.focus({ preventScroll: true });
}

/* =========================
   Selects
========================= */
function popularSelect(id, lista, placeholder = "Selecione...") {
  const s = document.getElementById(id);
  if (!s) return;
  s.innerHTML =
    `<option value="">${placeholder}</option>` +
    (lista || []).map(v => `<option value="${v}">${v}</option>`).join("");
}

function popularTipoServico() {
  const s = document.getElementById("selectTipoServico");
  if (!s) return;
  s.innerHTML =
    `<option value="">Selecione...</option>` +
    (bancoDeDados.tiposServico || [])
      .map(t => `<option value="${t}">${t}</option>`)
      .join("");
}

function popularSelectsRequisicao() {
  popularSelect("selectGaragemReq", bancoDeDados.garagens, "Escolha uma garagem...");
  const sF = document.getElementById("selectFrotaReq");
  const sS = document.getElementById("selectSolicitanteReq");
  if (sF) sF.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (sS) sS.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
}

/* =========================
   Update por GARAGEM
========================= */
function atualizarCamposPorGaragem() {
  const g = document.getElementById("selectGaragem").value;
  const sMot = document.getElementById("selectMotorista");
  const sFrota = document.getElementById("selectFrota");

  if (!g) {
    if (sMot)  sMot.innerHTML  = `<option value="">Selecione a garagem primeiro...</option>`;
    if (sFrota) sFrota.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
    return;
  }

  const motoristas = bancoDeDados.motoristas[g] || [];
  const frotas     = bancoDeDados.veiculos[g]   || [];

  if (sMot) {
    sMot.innerHTML =
      `<option value="">Selecione...</option>` +
      motoristas.map(m => `<option value="${m}">${m}</option>`).join("");
  }
  if (sFrota) {
    sFrota.innerHTML =
      `<option value="">Selecione...</option>` +
      frotas.map(v => `<option value="${v.prefixo}">${v.prefixo} • ${v.placa}</option>`).join("");
  }
}

function atualizarCamposReqPorGaragem() {
  const g     = document.getElementById("selectGaragemReq").value;
  const sFrot = document.getElementById("selectFrotaReq");
  const sSol  = document.getElementById("selectSolicitanteReq");

  if (!g) {
    if (sFrot) sFrot.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
    if (sSol)  sSol.innerHTML  = `<option value="">Selecione a garagem primeiro...</option>`;
    return;
  }

  const frotas = bancoDeDados.veiculos[g] || [];
  if (sFrot) {
    sFrot.innerHTML =
      `<option value="">Selecione...</option>` +
      frotas.map(v => `<option value="${v.prefixo}">${v.prefixo} • ${v.placa}</option>`).join("");
  }

  const equipe = solicitantesPorGaragem[g] || [];
  if (sSol) {
    sSol.innerHTML =
      `<option value="">Selecione...</option>` +
      equipe.map(n => `<option value="${n}">${n}</option>`).join("");
  }
}

/* =========================================================
   OS ABERTAS para Requisição - Helpers
========================================================= */

// Usa o helper api() se existir; senão, usa fetch
async function __getJSON(path) {
  if (typeof api === 'function') return api(path);
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// Carrega OS abertas
async function carregarOSAbertas({ garagem, frota }) {
  const params = new URLSearchParams();
  if (garagem) params.set('garagem', garagem);
  if (frota)   params.set('frota',   frota);
  const qs = params.toString();
  const url = `/api/os/open${qs ? `?${qs}` : ''}`;
  const data = await __getJSON(url);
  return Array.isArray(data.items) ? data.items : [];
}

// Popula o select de OS da Requisição
async function popularSelectOSReq() {
  const selGar = document.getElementById('selectGaragemReq');
  const selFro = document.getElementById('selectFrotaReq');
  const selOS  = document.getElementById('selectOSReq');
  if (!selOS) return;

  selOS.innerHTML = `<option value="">Carregando OS abertas…</option>`;

  try {
    const garagem = selGar?.value || '';
    const frota   = selFro?.value || '';
    const items   = await carregarOSAbertas({ garagem, frota });

    if (!items.length) {
      selOS.innerHTML = `<option value="">Nenhuma OS aberta</option>`;
      return;
    }

    const options = items.map(os => {
      const quando = os.openedAt ? new Date(os.openedAt).toLocaleString('pt-BR') : '';
      const label  = `${os.id} • ${os.frota || '-'} • ${os.tipoServico || ''} • ${quando}`;
      return `<option value="${os.id}">${label}</option>`;
    }).join('');

    selOS.innerHTML = `<option value="">Selecione a OS…</option>` + options;
  } catch (err) {
    console.error('[popularSelectOSReq] erro:', err);
    selOS.innerHTML = `<option value="">Erro ao carregar OS</option>`;
  }
}
``

/* =========================
   Salvar OS/REQ/ABAST – via API
========================= */
async function salvarOS() {
  const garagem   = document.getElementById("selectGaragem").value;
  const motorista = document.getElementById("inputMotorista").value;
  const frota     = document.getElementById("selectFrota").value;
  const km        = document.getElementById("inputKM").value.trim();
  const servico   = document.getElementById("selectTipoServico").value;
  const descricao = document.getElementById("textoDescricao").value.trim();

  const erros = [];
  if (!garagem) erros.push("Selecione a garagem.");
  if (!frota)   erros.push("Selecione a frota.");
  if (km === "" || Number.isNaN(Number(km)) || Number(km) < 0) erros.push("Informe um KM válido (>= 0).");
  if (!servico) erros.push("Selecione o tipo de serviço.");
  if (!descricao) erros.push("Descreva o problema.");

  if (erros.length) { alert("Verifique os campos:\n- " + erros.join("\n- ")); return; }

  const btn  = document.querySelector('[data-submit-os]');
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await api('/api/os', {
      method: 'POST',
      body: JSON.stringify({ garagem, motorista, frota, km, tipoServico: servico, descricao })
    });

    fecharModal();
    if (typeof loadDashboard === 'function') await loadDashboard();

    if (typeof loadMyOsHistory === 'function') {
      const sec = document.getElementById('tela-minhas-os');
      if (sec && !sec.classList.contains('hidden')) await loadMyOsHistory();
    }

    alert(`OS criada com sucesso!`);
  } catch (err) {
    alert('Erro ao abrir OS: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev; }
  }
}

async function loadMyReqHistory() {
  const wrap = document.getElementById("tabela-listagem-req");
  if (!wrap) return;

  wrap.innerHTML = "Carregando...";

  try {
    const data = await api("/api/req?limit=100");

    if (!data.items || data.items.length === 0) {
      wrap.innerHTML = `<div class="empty-state">Sem requisições</div>`;
      return;
    }

    let html = `
      <div class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Material</th>
              <th>Qtd</th>
              <th>Garagem</th>
              <th>Frota</th>
              <th>Solicitante</th>
              <th>Código</th>
              <th>Status</th>
              <th>Abertura</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const r of data.items) {
      html += `
        <tr>
          <td>${r.id}</td>
          <td>${r.material}</td>
          <td>${r.quantidade}</td>
          <td>${r.garagem}</td>
          <td>${r.frota}</td>
          <td>${r.solicitante}</td>
          <td>${r.codigo}</td>
          <td>${r.status}</td>
          <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR") : ""}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    wrap.innerHTML = html;

  } catch (err) {
    console.error("[ERRO loadMyReqHistory]", err);
    wrap.innerHTML = `<div class="empty-state">Erro ao carregar</div>`;
  }
}

async function salvarRequisicao() {
  const material     = document.getElementById("inputMaterial").value.trim();
  const quantidade   = document.getElementById("inputQuantidade")?.value.trim() || "";
  const garagem      = document.getElementById("selectGaragemReq").value;
  const frota        = document.getElementById("selectFrotaReq").value;
  const solicitante  = document.getElementById("selectSolicitanteReq").value;
  const dataISO      = document.getElementById("inputDataReq").value;
  const codigo       = document.getElementById("inputCodigoReq").value.trim();
  const descricao    = document.getElementById("textoDescricaoReq").value.trim();
  const osSel        = document.getElementById("selectOSReq");
  const osId         = osSel ? (osSel.value || "") : "";

  const erros = [];
  if (!material) erros.push("Informe o material.");
  if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (> 0).");
  if (!garagem) erros.push("Selecione a garagem.");
  if (!frota)   erros.push("Selecione a frota.");
  if (!solicitante) erros.push("Selecione o solicitante.");
  if (!dataISO) erros.push("Selecione a data.");
  if (!codigo)  erros.push("Informe o código.");
  if (!descricao) erros.push("Informe a descrição.");

  // ⚠️ Se houver OS aberta disponível, é obrigatório escolher
  const temOpcoesOS = osSel && osSel.options.length > 1;
  if (temOpcoesOS && !osId) erros.push("Selecione a OS aberta para vincular a Requisição.");

  if (erros.length) {
    alert("Verifique os campos:\n- " + erros.join("\n- "));
    return;
  }

  const btn  = document.querySelector('[data-submit-req]');
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const payload = {
      material,
      quantidade: Number(quantidade),
      garagem,
      frota,
      solicitante,
      data: dataISO,
      codigo,
      descricao,
      osId: osId || null
    };

    await api('/api/req', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    fecharModalRequisicao();
    if (typeof loadDashboard === 'function') await loadDashboard();
    alert('Requisição criada com sucesso!');
  } catch (err) {
    console.error('[salvarRequisicao] erro:', err);
    alert('Erro ao criar Requisição: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev; }
  }
}

async function salvarAbastecimento() {
  const dataHoraISO = document.getElementById("inputDataHoraAbast").value;
  const frota       = document.getElementById("selectFrotaAbast").value;
  const kmVeiculo   = document.getElementById("inputKMVeiculoAbast").value.trim();
  const kmIni       = document.getElementById("inputKMInicioBomba").value.trim();
  const kmFim       = document.getElementById("inputKMFimBomba").value.trim();
  const quantidade  = document.getElementById("inputQuantidadeLitros").value.trim();

  const erros = [];
  if (!dataHoraISO) erros.push("Informe a data e hora.");
  if (!frota) erros.push("Selecione a frota.");
  if (kmVeiculo === "" || Number(kmVeiculo) < 0) erros.push("Informe o KM do veículo (>= 0).");
  const nIni = Number(kmIni); const nFim = Number(kmFim);
  if (kmIni === "" || nIni < 0) erros.push("Informe o KM inicial da bomba (>= 0).");
  if (kmFim === "" || nFim < 0) erros.push("Informe o KM final da bomba (>= 0).");
  if (!Number.isNaN(nIni) && !Number.isNaN(nFim) && nFim < nIni) erros.push("KM final da bomba >= KM inicial.");
  if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (litros > 0).");

  if (erros.length) { alert("Verifique os campos:\n- " + erros.join("\n- ")); return; }

  const btn  = document.querySelector('[data-submit-abast]');
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await api('/api/abast', {
      method: 'POST',
      body: JSON.stringify({
        dataHora: dataHoraISO,
        frota,
        kmVeiculo: Number(kmVeiculo),
        kmInicioBomba: Number(kmIni),
        kmFimBomba: Number(kmFim),
        litros: Number(quantidade)
      })
    });

    fecharModalAbastecimento();
    if (typeof loadDashboard === 'function') await loadDashboard();
    alert(`Abastecimento registrado!`);
  } catch (err) {
    alert('Erro ao registrar Abastecimento: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev; }
  }
}

/* =========================
   Dashboard (via API)
========================= */
async function atualizarDashboard() {
  try {
    if (typeof loadDashboard === 'function') {
      await loadDashboard();
    }
  } catch (e) {
    console.warn('[atualizarDashboard] aviso:', e?.message || e);
  }
}

function renderUltimasOS(container, dados) {
  if (!container) return;
  container.innerHTML = "";
  if (!dados?.length) {
    container.classList.add("empty-state");
    container.textContent = "Sem registros";
    return;
  }
  container.classList.remove("empty-state");

  const ul = document.createElement("ul");
  ul.className = "list-simples";

  dados.slice(0, 5).forEach(os => {
    const li = document.createElement("li");
    const desc = os.descricao ? escapeHTML(os.descricao) : "";
    const resumoDesc = desc ? (desc.length > 140 ? desc.slice(0, 140) + "..." : desc) : "";
    li.innerHTML = `
      <div><strong>${escapeHTML(os.id)}</strong> • ${escapeHTML(os.dataBR || "")} • ${escapeHTML(os.servico || "")}</div>
      <div class="meta">Garagem: ${escapeHTML(os.garagem || "-")} • Frota: ${escapeHTML(os.frota || "")} • Motorista: ${escapeHTML(os.motorista || "")} • Status: ${escapeHTML(os.status || "")}</div>
      ${resumoDesc ? `<div class="desc">${resumoDesc}</div>` : ""}
    `;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

/* =========================
   Tabelas completas (LEGADO – localStorage)
========================= */
function renderizarTabelaOSCompleta() {
  const wrap = document.getElementById("tabela-completa-os");
  if (!wrap) return;

  if (!ordensServico.length) {
    wrap.innerHTML = `<div class="empty-state">Sem registros</div>`;
    return;
  }

  const rows = ordensServico.map((os, idx) => `
    <tr>
      <td>${escapeHTML(os.id)}</td>
      <td>${escapeHTML(os.dataBR || "")}</td>
      <td>${escapeHTML(os.garagem || "")}</td>
      <td>${escapeHTML(os.motorista || "")}</td>
      <td>${escapeHTML(os.frota || "")}</td>
      <td>${os.km ?? "-"}</td>
      <td>${escapeHTML(os.servico || "")}</td>
      <td>${escapeHTML(os.descricao || "")}</td>
      <td>
        <select class="status-select" onchange="alterarStatusOS('${os.id}', this.value, ${idx})">
          ${STATUS.map(s => `<option value="${s}" ${normalizarStatus(os.status)===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <button class="btn-acao" onclick="concluirOS('${os.id}', ${idx})">Concluir</button>
        <button class="btn-acao secondary" onclick="removerOS('${os.id}', ${idx})">Remover</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Garagem</th><th>Motorista</th><th>Frota</th>
            <th>KM</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderizarTabelaREQCompletaComFiltros() {
  const wrap = document.getElementById("tabela-completa-req");
  if (!wrap) return;

  let listaFinal = estadoRequisicoesFiltro.dados;

  // BUSCA (igual ao de OS – busca inteligente)
if (estadoRequisicoesFiltro.busca.trim() !== "") {
  const termo = normalizarBuscaReq(estadoRequisicoesFiltro.busca);
  
  listaFinal = listaFinal.filter(r => {
    const texto =
      `${r.id} ${r.material} ${r.quantidade} ${r.frota} ${r.garagem} ${r.solicitante} ${r.codigo} ${r.status}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    return texto.includes(termo);
  });
}
  // VAZIO
  if (!listaFinal.length) {
    wrap.innerHTML = `<div class="empty-state">Sem requisições encontradas</div>`;
    document.getElementById("total-req-count-completo").textContent = "0";
    return;
  }

  // TABELA MYOS
  let html = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Abertura</th>
        <th>Garagem</th>
        <th>Frota</th>
        <th>Material</th>
        <th>Qtd</th>
        <th>Solicitante</th>
        <th>Código</th>
        <th>Status</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const r of listaFinal) {
    const dataAbertura = r.createdAt
      ? new Date(r.createdAt).toLocaleString("pt-BR")
      : "";

    // PÍLULA DE STATUS (igual OS)
    const statusPill = `
  <span class="pill ${
    r.status === "aberta" ? "open" :
    r.status === "andamento" ? "working" :
    r.status === "aguardando" ? "waiting" :
    "done"
  }">
    ${
      r.status === "aberta" ? "Aberta" :
      r.status === "andamento" ? "Em andamento" :
      r.status === "aguardando" ? "Aguardando" :
      "Concluída"
    }
  </span>
`;

    html += `
      <tr>
        <td data-label="ID">${escapeHTML(r.id)}</td>
        <td data-label="Abertura">${dataAbertura}</td>
        <td data-label="Garagem">${escapeHTML(r.garagem || '-')}</td>
        <td data-label="Frota">${escapeHTML(r.frota || '-')}</td>
        <td data-label="Material">${escapeHTML(r.material || '-')}</td>
        <td data-label="Qtd">${r.quantidade || 0}</td>
        <td data-label="Solicitante">${escapeHTML(r.solicitante || '-')}</td>
        <td data-label="Código">${escapeHTML(r.codigo || '-')}</td>

        <td data-label="Status">${statusPill}</td>

        <td data-label="Ação">
          <select class="status-select"
            onchange="alterarStatusRequisicaoAPI('${r.id}', this.value)">
            <option value="aberta" ${r.status === "aberta" ? "selected" : ""}>Aberta</option>
            <option value="andamento" ${r.status === "andamento" ? "selected" : ""}>Em andamento</option>
            <option value="aguardando" ${r.status === "aguardando" ? "selected" : ""}>Aguardando</option>
            <option value="concluida" ${r.status === "concluida" ? "selected" : ""}>Concluída</option>
          </select>
        </td>
      </tr>
    `;
  }

  html += "</tbody>";

  wrap.innerHTML = html;

  // RODAPÉ: ATUALIZAÇÃO VISUAL
  document.getElementById("total-req-count-completo").textContent =
    estadoRequisicoesFiltro.totalRegistros;
  document.getElementById("req-pagina-atual").textContent =
    estadoRequisicoesFiltro.paginaAtual;
  document.getElementById("req-total-paginas").textContent =
    estadoRequisicoesFiltro.totalPaginas;
}

/* =========================
   Ações (LEGADO – localStorage)
========================= */
function alterarStatusOS(id, novo, indexFallback = -1) {
  let idx = ordensServico.findIndex(x => x.id === id);
  if (idx < 0) idx = indexFallback;
  if (idx < 0 || !ordensServico[idx]) return;

  ordensServico[idx].status = normalizarStatus(novo);
  salvarLista(STORAGE_KEYS.OS, ordensServico);

  renderizarTabelaOSCompleta();
  atualizarDashboard();
}
function concluirOS(id, indexFallback = -1) { alterarStatusOS(id, "CONCLUÍDA", indexFallback); }
function removerOS(id, indexFallback = -1) {
  let idx = ordensServico.findIndex(x => x.id === id);
  if (idx < 0) idx = indexFallback;
  if (idx < 0 || !ordensServico[idx]) return;
  if (!confirm(`Remover ${ordensServico[idx].id}? Esta ação não pode ser desfeita.`)) return;

  ordensServico.splice(idx, 1);
  salvarLista(STORAGE_KEYS.OS, ordensServico);

  renderizarTabelaOSCompleta();
  atualizarDashboard();
}

function alterarStatusREQ(id, novo, indexFallback = -1) {
  let idx = requisicoes.findIndex(x => x.id === id);
  if (idx < 0) idx = indexFallback;
  if (idx < 0 || !requisicoes[idx]) return;

  requisicoes[idx].status = normalizarStatus(novo);
  salvarLista(STORAGE_KEYS.REQ, requisicoes);

  renderizarTabelaREQCompleta();
  atualizarDashboard();
}
function concluirREQ(id, indexFallback = -1) { alterarStatusREQ(id, "CONCLUÍDA", indexFallback); }
function removerREQ(id, indexFallback = -1) {
  let idx = requisicoes.findIndex(x => x.id === id);
  if (idx < 0) idx = indexFallback;
  if (idx < 0 || !requisicoes[idx]) return;
  if (!confirm(`Remover ${requisicoes[idx].id}? Esta ação não pode ser desfeita.`)) return;

  requisicoes.splice(idx, 1);
  salvarLista(STORAGE_KEYS.REQ, requisicoes);

  renderizarTabelaREQCompleta();
  atualizarDashboard();
}

function removerAbastecimento(id, indexFallback = -1) {
  let idx = abastecimentos.findIndex(x => x.id === id);
  if (idx < 0) idx = indexFallback;
  if (idx < 0 || !abastecimentos[idx]) return;
  if (!confirm(`Remover ${abastecimentos[idx].id}? Esta ação não pode ser desfeita.`)) return;

  abastecimentos.splice(idx, 1);
  salvarLista(STORAGE_KEYS.ABAST, abastecimentos);

  renderizarTabelaAbastecimentoCompleta();
  atualizarDashboard();
}

/* =========================
   BUSCA nas telas “Ver todos” (LEGADO)
========================= */
const BUSCA_STATE = { os: "", req: "", abast: "" };
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function renderizarTabelaOSFiltrada() {
  const termo = norm(BUSCA_STATE.os);
  let lista = ordensServico;

  if (termo) {
    lista = ordensServico.filter(os => {
      const campos = [
        os.id, os.dataBR, os.garagem, os.motorista, os.frota,
        os.km, os.servico, os.descricao, os.status
      ];
      return campos.some(v => norm(v).includes(termo));
    });
  }

  const wrap = document.getElementById("tabela-completa-os");
  if (!wrap) return;
  if (!lista.length) { wrap.innerHTML = `<div class="empty-state">Sem registros</div>`; return; }

  const rows = lista.map((os, idx) => `
    <tr>
      <td>${escapeHTML(os.id)}</td>
      <td>${escapeHTML(os.dataBR || "")}</td>
      <td>${escapeHTML(os.garagem || "")}</td>
      <td>${escapeHTML(os.motorista || "")}</td>
      <td>${escapeHTML(os.frota || "")}</td>
      <td>${os.km ?? "-"}</td>
      <td>${escapeHTML(os.servico || "")}</td>
      <td>${escapeHTML(os.descricao || "")}</td>
      <td>
        <select class="status-select" onchange="alterarStatusOS('${os.id}', this.value, ${idx})">
          ${STATUS.map(s => `<option value="${s}" ${normalizarStatus(os.status)===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <button class="btn-acao" onclick="concluirOS('${os.id}', ${idx})">Concluir</button>
        <button class="btn-acao secondary" onclick="removerOS('${os.id}', ${idx})">Remover</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Garagem</th><th>Motorista</th><th>Frota</th>
            <th>KM</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderizarTabelaREQFiltrada() {
  const termo = norm(BUSCA_STATE.req);
  let lista = requisicoes;

  if (termo) {
    lista = requisicoes.filter(req => {
      const campos = [
        req.id, req.dataBR, req.material, req.quantidade, req.garagem,
        req.frota, req.solicitante, req.codigo, req.descricao, req.status
      ];
      return campos.some(v => norm(v).includes(termo));
    });
  }

  const wrap = document.getElementById("tabela-completa-req");
  if (!wrap) return;
  if (!lista.length) { wrap.innerHTML = `<div class="empty-state">Sem registros</div>`; return; }

  const rows = lista.map((req, idx) => `
    <tr>
      <td>${escapeHTML(req.id)}</td>
      <td>${escapeHTML(req.dataBR || "")}</td>
      <td>${escapeHTML(req.material || "")}</td>
      <td>${escapeHTML(String(req.quantidade ?? req.unidade ?? "-"))}</td>
      <td>${escapeHTML(req.garagem || "")}</td>
      <td>${escapeHTML(req.frota || "")}</td>
      <td>${escapeHTML(req.solicitante || "")}</td>
      <td>${escapeHTML(req.codigo || "")}</td>
      <td>${escapeHTML(req.descricao || "")}</td>
      <td>
        <select class="status-select" onchange="alterarStatusREQ('${req.id}', this.value, ${idx})">
          ${STATUS.map(s => `<option value="${s}" ${normalizarStatus(req.status)===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <button class="btn-acao" onclick="concluirREQ('${req.id}', ${idx})">Concluir</button>
        <button class="btn-acao secondary" onclick="removerREQ('${req.id}', ${idx})">Remover</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Material</th><th>Quantidade</th>
            <th>Garagem</th><th>Frota</th><th>Solicitante</th>
            <th>Código</th><th>Descrição</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderizarTabelaAbastecimentoFiltrada() {
  const termo = norm(BUSCA_STATE.abast);
  let lista = abastecimentos;

  if (termo) {
    lista = abastecimentos.filter(a => {
      const campos = [
        a.id, a.dataBR, a.frota, a.placa, a.garagem,
        a.kmVeiculo, a.kmBombaIni, a.kmBombaFim, a.quantidade
      ];
      return campos.some(v => norm(v).includes(termo));
    });
  }

  const wrap = document.getElementById("tabela-completa-abast");
  if (!wrap) return;
  if (!lista.length) { wrap.innerHTML = `<div class="empty-state">Sem registros</div>`; return; }

  const rows = lista.map((a, idx) => `
    <tr>
      <td>${escapeHTML(a.id)}</td>
      <td>${escapeHTML(a.dataBR || "")}</td>
      <td>${escapeHTML(a.frota || "")}</td>
      <td>${escapeHTML(a.placa || "")}</td>
      <td>${escapeHTML(a.garagem || "")}</td>
      <td>${escapeHTML(String(a.kmVeiculo))}</td>
      <td>${escapeHTML(String(a.kmBombaIni))}</td>
      <td>${escapeHTML(String(a.kmBombaFim))}</td>
      <td>${escapeHTML(String((Number(a.quantidade)||0).toFixed(3)))} L</td>
      <td>
        <button class="btn-acao secondary" onclick="removerAbastecimento('${a.id}', ${idx})">Remover</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th><th>Data/Hora</th><th>Frota</th><th>Placa</th><th>Garagem</th>
            <th>KM Veículo</th><th>KM Bomba (Ini)</th><th>KM Bomba (Fim)</th><th>Quantidade (L)</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ---- Liga inputs de busca ---- */
document.addEventListener("DOMContentLoaded", () => {
  const iOS    = document.getElementById("busca-os");
  const iREQ   = document.getElementById("busca-req");
  const iABAST = document.getElementById("busca-abast");

  if (iOS)  iOS.addEventListener("input", () => { BUSCA_STATE.os = iOS.value; renderizarTabelaOSFiltrada(); });
  if (iREQ) iREQ.addEventListener("input", () => { BUSCA_STATE.req = iREQ.value; renderizarTabelaREQFiltrada(); });
  if (iABAST) iABAST.addEventListener("input", () => { BUSCA_STATE.abast = iABAST.value; renderizarTabelaAbastecimentoFiltrada(); });
});

/* =========================
   Event wiring + Inicialização
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Nav por data-nav-target
  document.querySelectorAll("[data-nav-target]").forEach(btn => {
    btn.addEventListener("click", () => alternarTelas(btn.dataset.navTarget));
  });

  // Abrir modais
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.openModal;
      if (tipo === "os")    abrirModal();
      if (tipo === "req")   abrirModalRequisicao();
      if (tipo === "abast") abrirModalAbastecimento();
    });
  });

  // Fechar modais
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (!modal) return;
      if (modal.id === "modalOS")             fecharModal();
      if (modal.id === "modalRequisicao")     fecharModalRequisicao();
      if (modal.id === "modalAbastecimento")  fecharModalAbastecimento();
    });
  });

  // Clique fora fecha modais
  document.addEventListener("click", (e) => {
    const mOS  = document.getElementById("modalOS");
    const mRQ  = document.getElementById("modalRequisicao");
    const mAB  = document.getElementById("modalAbastecimento");
    if (e.target === mOS) fecharModal();
    if (e.target === mRQ) fecharModalRequisicao();
    if (e.target === mAB) fecharModalAbastecimento();
  });

  // ESC fecha modais
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.getElementById("modalOS")?.classList.contains("active"))            fecharModal();
    if (document.getElementById("modalRequisicao")?.classList.contains("active"))    fecharModalRequisicao();
    if (document.getElementById("modalAbastecimento")?.classList.contains("active")) fecharModalAbastecimento();
  });

  // Trap de foco
  ["modalOS", "modalRequisicao", "modalAbastecimento"].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener("keydown", (e) => { if (e.key === "Tab") trapFocus(modal, e); });
  });

  // Submits via Enter nas modais
  document.getElementById("modalOS")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "select") return;
      salvarOS();
    }
  });
  document.getElementById("modalRequisicao")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "select") return;
      salvarRequisicao();
    }
  });
  document.getElementById("modalAbastecimento")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "select") return;
      salvarAbastecimento();
    }
  });

  // Dependentes de garagem
  document.getElementById("selectGaragem")?.addEventListener("change", atualizarCamposPorGaragem);
  
  document.getElementById("selectGaragemReq")?.addEventListener("change", async () => {
  atualizarCamposReqPorGaragem();
  try { await popularSelectOSReq(); } catch {}
});

document.getElementById("selectFrotaReq")?.addEventListener("change", async () => {
  try { await popularSelectOSReq(); } catch {}
});

  // Botões submit
  document.querySelector("[data-submit-os]")?.addEventListener("click", salvarOS);
  document.querySelector("[data-submit-req]")?.addEventListener("click", salvarRequisicao);
  document.querySelector("[data-submit-abast]")?.addEventListener("click", salvarAbastecimento);

  // Migração leve (legado localStorage)
  let migrated = false;
  ordensServico = (ordensServico || []).map((o) => {
    const n = { ...o };
    if (!n.id) { n.id = gerarId("OS"); migrated = true; }
    n.status = normalizarStatus(n.status);
    if (!n.dataBR && n.data) { try { n.dataBR = formatarDataBR(new Date(n.data)); } catch {} }
    return n;
  });
  requisicoes = (requisicoes || []).map((r) => {
    const n = { ...r };
    if (!n.id) { n.id = gerarId("REQ"); migrated = true; }
    n.status = normalizarStatus(n.status);
    if (n.unidade && !n.quantidade) {
      const num = Number(String(n.unidade).replace(",", "."));
      if (!Number.isNaN(num) && num > 0) n.quantidade = num;
    }
    return n;
  });
  if (migrated) {
    salvarLista(STORAGE_KEYS.OS, ordensServico);
    salvarLista(STORAGE_KEYS.REQ, requisicoes);
  }

  // Selects iniciais
  popularSelect("selectGaragem", bancoDeDados.garagens, "Escolha uma garagem...");
  popularTipoServico();
  popularSelectsRequisicao();

  const inputDataReq = document.getElementById("inputDataReq");
  if (inputDataReq && !inputDataReq.value) inputDataReq.value = toISODateString(new Date());

  // Popular Frota no Abastecimento
  (function popularSelectFrotaAbastecimento() {
    const s = document.getElementById("selectFrotaAbast");
    if (!s) return;
    const frotas = obterFrotasCombinadas();
    s.innerHTML = `<option value="">Selecione...</option>` +
      frotas.map(f => `<option value="${f.prefixo}">${f.prefixo} • ${f.placa} • ${f.garagem}</option>`).join("");
  })();

  /* ======== TELA INICIAL POR PERFIL ======== */
  try {
    const me = await api('/api/auth/me');       // exige sessão
    const role = me?.user?.role;

    if (role === 'driver') {
      // Esconde tudo de admin
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden','true');
      });
      // Vai direto para “Minhas OS”
      alternarTelas('minhas-os');

      // Carrega a seção
      if (typeof loadMyOsHistory === 'function') {
        try { await loadMyOsHistory(); } catch(e) {}
      }
    } else {
      // Admin → Dashboard
      alternarTelas('dashboard');
      try { await atualizarDashboard(); } catch(e) {}
    }
  } catch (e) {
    // Sem sessão: fluxo normal leva para /auth
  }
});

/* =========================
   API CONFIG + HELPERS
========================= */
// MESMO host (Railway serve front + API)
const API_URL = ''; // se front for separado, aponte para a URL do backend

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

async function loadDashboard() {
  try {
    const summary = await api('/api/dashboard/summary');

    const osCounts = summary?.os?.counts || {};
    setText('os-count-aberta',       osCounts.aberta    || 0);
    setText('os-count-em-andamento', osCounts.andamento || 0);
    setText('os-count-aguardando',   osCounts.aguardando|| 0);
    setText('os-count-concluida',    osCounts.concluida || 0);

    const ultimasOSBox = document.getElementById('lista-vazia');
    if (ultimasOSBox) {
      const items = summary?.os?.recent || [];
      if (!items.length) {
        ultimasOSBox.textContent = 'Sem registros';
      } else {
        ultimasOSBox.innerHTML = '';
        const ul = document.createElement('ul');
        ul.style.margin = '0'; ul.style.paddingLeft = '16px';
        items.forEach(r => {
          const li = document.createElement('li');
          li.textContent = `${r.id} — ${r.frota || '-'} — ${r.status}`;
          ul.appendChild(li);
        });
        ultimasOSBox.appendChild(ul);
      }
    }

    const reqCounts = summary?.req?.counts;
    if (reqCounts) {
      setText('req-count-aberta',       reqCounts.aberta    || 0);
      setText('req-count-em-andamento', reqCounts.andamento || 0);
      setText('req-count-aguardando',   reqCounts.aguardando|| 0);
      setText('req-count-concluida',    reqCounts.concluida || 0);

      const ultimasReqBox = document.getElementById('lista-requisicoes');
      if (ultimasReqBox) {
        const items = summary?.req?.recent || [];
        if (!items.length) {
          ultimasReqBox.textContent = 'Sem registros';
        } else {
          ultimasReqBox.innerHTML = '';
          const ul = document.createElement('ul');
          ul.style.margin = '0'; ul.style.paddingLeft = '16px';
          items.forEach(r => {
            const li = document.createElement('li');
            li.textContent = `${r.id} — ${r.material || '-'} — ${r.status}`;
            ul.appendChild(li);
          });
          ultimasReqBox.appendChild(ul);
        }
      }
    }
  } catch (err) {
    console.error('[loadDashboard] erro:', err.message);
  }
}

/* =========================
   LOGOUT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btnLogout');
  if (!btnLogout) return;

  if (btnLogout.dataset.wired === '1') return;
  btnLogout.dataset.wired = '1';

  btnLogout.addEventListener('click', async (ev) => {
    ev.preventDefault();
    btnLogout.disabled = true;
    const prev = btnLogout.textContent;
    btnLogout.textContent = 'Saindo...';

    try {
      await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
      window.location.href = '/auth';
    } catch (err) {
      console.error('[logout] erro:', err);
      alert('Não foi possível sair agora. Tente novamente.');
      btnLogout.disabled = false;
      btnLogout.textContent = prev;
    }
  });
});

/* =========================
   MOBILE MENU (☰) – abrir/fechar sidebar
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnMobileMenu');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (!btn || !backdrop) return;

  const openMenu = () => {
    document.body.classList.add('sidebar-open');
    backdrop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  };
  const closeMenu = () => {
    document.body.classList.remove('sidebar-open');
    backdrop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', () => {
    const isOpen = document.body.classList.contains('sidebar-open');
    isOpen ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);

  // Fecha ao navegar no menu (apenas no mobile)
  document.querySelector('.menu-items')?.addEventListener('click', (ev) => {
    const item = ev.target.closest('button,[role="menuitem"]');
    if (!item) return;
    if (window.matchMedia('(max-width: 1024px)').matches) closeMenu();
  });

  // Se voltar para desktop, garante fechado
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 1024px)').matches) closeMenu();
  });
});
