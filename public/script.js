/* =========================================================
   Triunfo System - Gestão de Frota
   script.js (COMPLETO - PARTE 1/3)
   - Utilitários, catálogos, modais, navegação
   - Salvamento de OS/REQ/ABAST (API)
   - A PARTE 2 virá com dashboard, renderizações e buscas
   - A PARTE 3 virá com inicialização, helpers da API, logout,
     mobile menu e o botão de Exportação Excel (apenas ADMIN)
   ========================================================= */

"use strict";

/* =========================
   Catálogos (dados de apoio)
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
const solicitantesPorGaragem = {
  "SANTA LUZIA": ["SERGIO", "ADÃO", "WANDERLEY", "VAVA", "ROGERIO"],
  "MATOZINHOS":  ["SERGIO", "ADÃO", "WANDERLEY", "VAVA", "ROGERIO"]
};

/* =========================
   Persistência (localStorage) – legado
========================= */
const STORAGE_KEYS = { OS: "triunfo_os", REQ: "triunfo_req", ABAST: "triunfo_abast" };
let ordensServico   = carregarLista(STORAGE_KEYS.OS);
let requisicoes     = carregarLista(STORAGE_KEYS.REQ);
let abastecimentos  = carregarLista(STORAGE_KEYS.ABAST);

const STATUS = ["ABERTA", "EM ANDAMENTO", "AGUARDANDO", "CONCLUÍDA"];

/* =========================
   Utilitários diversos
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
function abrirModal() {
  const overlay = document.getElementById("modalOS");
  if (!overlay) return;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");

  const sGar = document.getElementById("selectGaragem");
  const sMot = document.getElementById("selectMotorista");
  const sFro = document.getElementById("selectFrota");
  const km   = document.getElementById("inputKM");
  const tp   = document.getElementById("selectTipoServico");
  const desc = document.getElementById("textoDescricao");

  if (sGar) sGar.value = "";
  if (sMot) sMot.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (sFro) sFro.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (km)   km.value = "";
  if (tp)   tp.value = "";
  if (desc) desc.value = "";

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
  const ids = ["dashboard", "listagem-os", "listagem-req", "listagem-abast", "minhas-os"];
  ids.forEach(id => hideEl(document.getElementById(`tela-${id}`)));

  const destino = document.getElementById(`tela-${tela}`);
  showEl(destino);

  document.querySelectorAll(".menu-items button").forEach(b => b.classList.remove("active"));
  const btnAtivo = document.querySelector(`[data-nav-target="${tela}"]`);
  if (btnAtivo) btnAtivo.classList.add("active");
  else if (tela === "dashboard") document.querySelector(".menu-items button")?.classList.add("active");

  if (tela === "listagem-os")    renderizarTabelaOSCompleta();
  if (tela === "listagem-req")   renderizarTabelaREQCompleta();
  if (tela === "listagem-abast") renderizarTabelaAbastecimentoCompleta();

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

/* =========================
   Salvar OS/REQ/ABAST – via API
========================= */
async function salvarOS() {
  const garagem   = document.getElementById("selectGaragem").value;
  const motorista = document.getElementById("selectMotorista").value;
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

async function salvarRequisicao() {
  const material     = document.getElementById("inputMaterial").value.trim();
  const quantidade   = document.getElementById("inputQuantidade")?.value.trim() || "";
  const garagem      = document.getElementById("selectGaragemReq").value;
  const frota        = document.getElementById("selectFrotaReq").value;
  const solicitante  = document.getElementById("selectSolicitanteReq").value;
  const dataISO      = document.getElementById("inputDataReq").value;
  const codigo       = document.getElementById("inputCodigoReq").value.trim();
  const descricao    = document.getElementById("textoDescricaoReq").value.trim();

  const erros = [];
  if (!material) erros.push("Informe o material.");
  if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (> 0).");
  if (!garagem) erros.push("Selecione a garagem.");
  if (!frota)   erros.push("Selecione a frota.");
  if (!solicitante) erros.push("Selecione o solicitante.");
  if (!dataISO) erros.push("Selecione a data.");
  if (!codigo)  erros.push("Informe o código.");
  if (!descricao) erros.push("Informe a descrição.");

  if (erros.length) { alert("Verifique os campos:\n- " + erros.join("\n- ")); return; }

  const btn  = document.querySelector('[data-submit-req]');
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await api('/api/req', {
      method: 'POST',
      body: JSON.stringify({
        material,
        quantidade: Number(quantidade),
        garagem,
        frota,
        solicitante,
        data: dataISO,
        codigo,
        descricao
      })
    });

    fecharModalRequisicao();
    if (typeof loadDashboard === 'function') await loadDashboard();
    alert('Requisição criada com sucesso!');
  } catch (err) {
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
/* =========================================================
   PARTE 2 / 3 — Dashboards, tabelas, buscas e renderizações
========================================================= */

/* =========================
   Dashboard (admin)
========================= */
async function loadDashboard() {
  try {
    const data = await api("/api/dashboard/summary");
    if (!data) return;

    // OS
    if (data.os?.counts) {
      setText("os-count-aberta",     data.os.counts.aberta);
      setText("os-count-em-andamento", data.os.counts.andamento);
      setText("os-count-aguardando", data.os.counts.aguardando);
      setText("os-count-concluida",  data.os.counts.concluida);

      if (Array.isArray(data.os.recent)) {
        const recent = data.os.recent;
        const cont   = document.querySelector("#lista-vazia")?.parentElement;
        if (cont) cont.innerHTML =
          recent.length
            ? recent
                .map(os => `<div>• ${os.id || ""} | ${escapeHTML(os.garagem||"")} | ${escapeHTML(os.frota||"")} | ${escapeHTML(os.status||"")}</div>`)
                .join("")
            : `<div class="empty-state">Sem registros</div>`;
      }
    }

    // Requisições
    if (data.req?.counts) {
      setText("req-count-aberta",     data.req.counts.aberta);
      setText("req-count-em-andamento", data.req.counts.andamento);
      setText("req-count-aguardando", data.req.counts.aguardando);
      setText("req-count-concluida",  data.req.counts.concluida);

      if (Array.isArray(data.req.recent)) {
        const recent = data.req.recent;
        const el     = document.getElementById("lista-requisicoes");
        if (el) {
          el.innerHTML =
            recent.length
              ? recent
                  .map(r => `<div>• ${escapeHTML(r.codigo||"")} | ${escapeHTML(r.material||"")} | ${escapeHTML(r.garagem||"")}</div>`)
                  .join("")
              : `<div class="empty-state">Sem registros</div>`;
        }
      }
    }
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
  }
}

/* =========================
   Tabelas — OS (admin)
========================= */
async function renderizarTabelaOSCompleta() {
  const cont = document.getElementById("tabela-completa-os");
  if (!cont) return;
  cont.innerHTML = "Carregando...";

  try {
    const busca = document.getElementById("busca-os")?.value || "";
    const data  = await api("/api/os");
    const lista = Array.isArray(data?.items) ? data.items : [];

    const filtrado = busca
      ? lista.filter(os =>
          String(os.id||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(os.garagem||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(os.motorista||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(os.frota||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(os.tipoServico||"").toLowerCase().includes(busca.toLowerCase())
        )
      : lista;

    cont.innerHTML =
      filtrado.length
        ? gerarTabelaOS(filtrado)
        : `<div class="empty-state">Nenhuma OS encontrada.</div>`;
  } catch (err) {
    cont.innerHTML = `<div class="empty-state">Erro ao carregar OS.</div>`;
  }
}

function gerarTabelaOS(lista) {
  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Garagem</th>
            <th>Motorista</th>
            <th>Frota</th>
            <th>KM</th>
            <th>Serviço</th>
            <th>Status</th>
            <th>Abertura</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(os => `
            <tr>
              <td>${escapeHTML(os.id||"")}</td>
              <td>${escapeHTML(os.garagem||"")}</td>
              <td>${escapeHTML(os.motorista||"")}</td>
              <td>${escapeHTML(os.frota||"")}</td>
              <td>${escapeHTML(os.km||"")}</td>
              <td>${escapeHTML(os.tipoServico||"")}</td>
              <td>${escapeHTML(os.status||"")}</td>
              <td>${new Date(os.openedAt||os.createdAt||"").toLocaleString("pt-BR")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================
   Tabelas — Requisições (admin)
========================= */
async function renderizarTabelaREQCompleta() {
  const cont = document.getElementById("tabela-completa-req");
  if (!cont) return;
  cont.innerHTML = "Carregando...";

  try {
    const busca = document.getElementById("busca-req")?.value || "";
    const data  = await api("/api/req");
    const lista = Array.isArray(data?.items) ? data.items : [];

    const filtrado = busca
      ? lista.filter(r =>
          String(r.codigo||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(r.material||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(r.garagem||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(r.frota||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(r.solicitante||"").toLowerCase().includes(busca.toLowerCase())
        )
      : lista;

    cont.innerHTML =
      filtrado.length
        ? gerarTabelaREQ(filtrado)
        : `<div class="empty-state">Nenhuma Requisição encontrada.</div>`;
  } catch (err) {
    cont.innerHTML = `<div class="empty-state">Erro ao carregar Requisições.</div>`;
  }
}

function gerarTabelaREQ(lista) {
  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Código</th>
            <th>Material</th>
            <th>Qtd</th>
            <th>Garagem</th>
            <th>Frota</th>
            <th>Solicitante</th>
            <th>Data</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(r => `
            <tr>
              <td>${escapeHTML(r.id||"")}</td>
              <td>${escapeHTML(r.codigo||"")}</td>
              <td>${escapeHTML(r.material||"")}</td>
              <td>${escapeHTML(r.quantidade||"")}</td>
              <td>${escapeHTML(r.garagem||"")}</td>
              <td>${escapeHTML(r.frota||"")}</td>
              <td>${escapeHTML(r.solicitante||"")}</td>
              <td>${r.data ? new Date(r.data).toLocaleDateString("pt-BR") : ""}</td>
              <td>${escapeHTML(r.status||"")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================
   Tabelas — Abastecimentos (admin)
========================= */
async function renderizarTabelaAbastecimentoCompleta() {
  const cont = document.getElementById("tabela-completa-abast");
  if (!cont) return;
  cont.innerHTML = "Carregando...";

  try {
    const busca = document.getElementById("busca-abast")?.value || "";
    const data  = await api("/api/abast");
    const lista = Array.isArray(data?.items) ? data.items : [];

    const filtrado = busca
      ? lista.filter(a =>
          String(a.frota||"").toLowerCase().includes(busca.toLowerCase()) ||
          String(a.kmVeiculo||"").toLowerCase().includes(busca.toLowerCase())
        )
      : lista;

    cont.innerHTML =
      filtrado.length
        ? gerarTabelaAbast(filtrado)
        : `<div class="empty-state">Nenhum Abastecimento encontrado.</div>`;
  } catch (err) {
    cont.innerHTML = `<div class="empty-state">Erro ao carregar Abastecimentos.</div>`;
  }
}

function gerarTabelaAbast(lista) {
  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Frota</th>
            <th>KM Veículo</th>
            <th>KM Início</th>
            <th>KM Fim</th>
            <th>Litros</th>
            <th>Data/Hora</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(a => `
            <tr>
              <td>${escapeHTML(a.id||"")}</td>
              <td>${escapeHTML(a.frota||"")}</td>
              <td>${escapeHTML(a.kmVeiculo||"")}</td>
              <td>${escapeHTML(a.kmInicioBomba||"")}</td>
              <td>${escapeHTML(a.kmFimBomba||"")}</td>
              <td>${escapeHTML(a.litros||"")}</td>
              <td>${a.dataHora ? new Date(a.dataHora).toLocaleString("pt-BR") : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
/* =========================================================
   PARTE 3 / 3 — Inicialização, API Helper, Menu Mobile,
   Controle de Perfil (Admin/Driver), Exportar Excel,
   Logout e Eventos Finais
========================================================= */

/* =========================
   Helpers de API (fetch)
========================= */
async function api(url, options = {}) {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      let msg = res.statusText || "Erro";
      try {
        const j = await res.json();
        msg = j.error || msg;
      } catch {}
      throw new Error(msg);
    }

    // Alguns endpoints retornam blob (Excel)
    const ct = res.headers.get("Content-Type") || "";
    if (ct.includes("application/vnd.openxmlformats-officedocument")) {
      return res;
    }

    return res.json();
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}

/* =========================
   Carregar Minhas OS
========================= */
async function loadMyOsHistory() {
  const cont = document.getElementById("tabela-minhas-os");
  if (!cont) return;
  cont.innerHTML = "Carregando...";

  try {
    const data = await api("/api/os?mine=1");
    const lista = Array.isArray(data?.items) ? data.items : [];

    cont.innerHTML =
      lista.length
        ? gerarTabelaMinhasOS(lista)
        : `<div class="empty-state">Você ainda não abriu nenhuma OS.</div>`;
  } catch (err) {
    cont.innerHTML = `<div class="empty-state">Erro ao carregar suas OS.</div>`;
  }
}

function gerarTabelaMinhasOS(lista) {
  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Garagem</th>
            <th>Frota</th>
            <th>KM</th>
            <th>Serviço</th>
            <th>Status</th>
            <th>Abertura</th>
          </tr>
        </thead>
        <tbody>
          ${lista
            .map(
              (os) => `
            <tr>
              <td>${escapeHTML(os.id || "")}</td>
              <td>${escapeHTML(os.garagem || "")}</td>
              <td>${escapeHTML(os.frota || "")}</td>
              <td>${escapeHTML(os.km || "")}</td>
              <td>${escapeHTML(os.tipoServico || "")}</td>
              <td>${escapeHTML(os.status || "")}</td>
              <td>${new Date(os.openedAt || os.createdAt || "").toLocaleString(
                "pt-BR"
              )}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================
   MENU MOBILE (abrir/fechar)
========================= */
function configurarMenuMobile() {
  const btnMenu = document.getElementById("btnMobileMenu");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  if (!btnMenu || !sidebar || !backdrop) return;

  btnMenu.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  backdrop.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
  });
}

/* =========================
   LOGOUT
========================= */
async function executarLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  window.location.href = "/auth";
}

/* =========================
   INICIALIZAÇÃO PRINCIPAL
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Triunfo System — script.js carregado (PARTE 3)");

  /* ---- MENU MOBILE ---- */
  configurarMenuMobile();

  /* ---- Uniformizar selects ---- */
  popularSelect("selectGaragem", bancoDeDados.garagens, "Selecione a garagem...");
  popularTipoServico();
  popularSelectsRequisicao();
  popularSelect("selectGaragemReq", bancoDeDados.garagens);

  /* ---- Eventos de atualização por garagem ---- */
  const sGar = document.getElementById("selectGaragem");
  if (sGar) sGar.addEventListener("change", atualizarCamposPorGaragem);

  const sGarReq = document.getElementById("selectGaragemReq");
  if (sGarReq) sGarReq.addEventListener("change", atualizarCamposReqPorGaragem);

  /* ---- Botão Abrir OS ---- */
  const btnsOS = document.querySelectorAll("[data-open-modal='os']");
  btnsOS.forEach((b) => b.addEventListener("click", abrirModal));

  /* ---- Botão Abrir Requisição ---- */
  const btnsREQ = document.querySelectorAll("[data-open-modal='req']");
  btnsREQ.forEach((b) => b.addEventListener("click", abrirModalRequisicao));

  /* ---- Botão Abrir Abastecimento ---- */
  const btnsABAST = document.querySelectorAll("[data-open-modal='abast']");
  btnsABAST.forEach((b) => b.addEventListener("click", abrirModalAbastecimento));

  /* ---- Fechar Modais ---- */
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      fecharModal();
      fecharModalRequisicao();
      fecharModalAbastecimento();
    });
  });

  /* ---- Submit OS ---- */
  const btnSubmitOS = document.querySelector("[data-submit-os]");
  if (btnSubmitOS) btnSubmitOS.addEventListener("click", salvarOS);

  /* ---- Submit REQ ---- */
  const btnSubmitREQ = document.querySelector("[data-submit-req]");
  if (btnSubmitREQ) btnSubmitREQ.addEventListener("click", salvarRequisicao);

  /* ---- Submit Abastecimento ---- */
  const btnSubmitABAST = document.querySelector("[data-submit-abast]");
  if (btnSubmitABAST)
    btnSubmitABAST.addEventListener("click", salvarAbastecimento);

  /* ---- Logout ---- */
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", executarLogout);

  /* ---- Descobrir perfil do usuário ---- */
  let perfil = "driver";
  try {
    const me = await api("/api/auth/me");
    perfil = me?.user?.role || "driver";
  } catch {
    return (window.location.href = "/auth");
  }

  /* ---- Ajustar o body para ADMIN ---- */
  if (perfil === "admin") {
    document.body.classList.add("admin");
  }

  /* ---- Navegação inicial ---- */
  if (perfil === "admin") {
    alternarTelas("dashboard");
    await loadDashboard();
  } else {
    alternarTelas("minhas-os");
    await loadMyOsHistory();
  }

  /* ---- Pesquisa / Buscas ---- */
  document.getElementById("busca-os")?.addEventListener("input", () => {
    renderizarTabelaOSCompleta();
  });

  document.getElementById("busca-req")?.addEventListener("input", () => {
    renderizarTabelaREQCompleta();
  });

  document.getElementById("busca-abast")?.addEventListener("input", () => {
    renderizarTabelaAbastecimentoCompleta();
  });

  /* ---- NAVEGAÇÃO PELO MENU ---- */
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const destino = btn.getAttribute("data-nav-target");
      alternarTelas(destino);

      if (destino === "minhas-os") loadMyOsHistory();
      if (destino === "dashboard") loadDashboard();
    });
  });

  /* =========================
       🔥 EXPORTAR EXCEL (ADMIN)
     ========================= */
  const btnExportExcel = document.getElementById("btnExportExcelOS");

  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", () => {
      // Admin força o download
      window.location.href = "/api/os/export.xlsx";
    });
  }

}); // FIM do DOMContentLoaded