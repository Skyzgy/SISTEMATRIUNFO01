/* =========================================================
   Triunfo System - Gestão de Frota
   script.js (COMPLETO e ALINHADO ao HTML/CSS atuais)
   - Catálogos (garagens, motoristas, veículos)
   - Storage (localStorage)
   - Constantes de status
   - Utilitários (datas, escape, seleção, show/hide)
   - Inicialização (migração, selects, dashboard)
   - Eventos via data-* (sem onclick inline)
   - Modais (OS, Requisição, Abastecimento) com foco/ESC
   - Navegação entre telas (SPA leve)
   - Formulários: salvar OS/REQ/Abastecimento (validações)
   - Dashboard + listas compactas (Sem “Últimos Abastecimentos”)
   - Tabelas completas + Ações (status, concluir, remover)
   - Busca somente nas telas “Ver todos” (OS/REQ/Abast)
   - Exposição no window (compatibilidade)
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
   Persistência (localStorage)
========================= */
const STORAGE_KEYS = { OS: "triunfo_os", REQ: "triunfo_req", ABAST: "triunfo_abast" };
let ordensServico   = carregarLista(STORAGE_KEYS.OS);
let requisicoes     = carregarLista(STORAGE_KEYS.REQ);
let abastecimentos  = carregarLista(STORAGE_KEYS.ABAST);

/* =========================
   Status padronizados
========================= */
const STATUS = ["ABERTA", "EM ANDAMENTO", "AGUARDANDO", "CONCLUÍDA"];

/* =========================
   Utilitários diversos
========================= */
function carregarLista(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
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
  return `${yy}-${mm}-${dd}`; // YYYY-MM-DD (para <input type="date">)
}
function ISOparaBR(isoStr) {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
}
// Escape SEGURO para evitar XSS ao usar innerHTML
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function normalizarStatus(s) {
  if (!s) return "ABERTA";
  const base = s.toString().trim().toUpperCase();
  if (base === "FECHADA") return "CONCLUÍDA"; // retrocompat
  if (STATUS.includes(base)) return base;
  return "ABERTA";
}
function contarPorStatus(lista) {
  const mapa = { "ABERTA": 0, "EM ANDAMENTO": 0, "AGUARDANDO": 0, "CONCLUÍDA": 0 };
  (lista || []).forEach(item => { mapa[ normalizarStatus(item.status) ]++; });
  return mapa;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val ?? 0);
}
// Mostrar/ocultar (usa .hidden e também fallback por style.display)
function hideEl(el) {
  if (!el) return;
  if (el.classList) el.classList.add('hidden');
  if (el.style)     el.style.display = 'none';
}
function showEl(el) {
  if (!el) return;
  if (el.classList) el.classList.remove('hidden');
  if (el.style)     el.style.display = 'block';
}
// Combina todas as frotas (todas as garagens) em um único array útil para selects
function obterFrotasCombinadas() {
  const out = [];
  Object.entries(bancoDeDados.veiculos || {}).forEach(([garagem, lista]) => {
    (lista || []).forEach(v => {
      out.push({ garagem, prefixo: v.prefixo, placa: v.placa, modelo: v.modelo });
    });
  });
  return out;
}

/* =========================
   Variáveis de suporte (foco em modais)
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

  // Limpa campos do formulário
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

  // Foco
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

  // Foco
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

  // Preenche data/hora atual no formato local yyyy-mm-ddThh:mm
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

  // Foco
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
   Trap de foco dentro dos modais
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

  if (e.shiftKey && document.activeElement === first) {
    last.focus(); e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus(); e.preventDefault();
  }
}

/* =========================
   Navegação entre telas (SPA leve)
========================= */
function alternarTelas(tela) {
  const ids = ["dashboard", "listagem-os", "listagem-req", "listagem-abast"];
  ids.forEach(id => {
    const el = document.getElementById(`tela-${id}`);
    hideEl(el);
  });

  const destino = document.getElementById(`tela-${tela}`);
  showEl(destino);

  // Atualiza estado visual da sidebar
  document.querySelectorAll(".menu-items button").forEach(b => b.classList.remove("active"));
  const btnAtivo = document.querySelector(`[data-nav-target="${tela}"]`);
  if (btnAtivo) btnAtivo.classList.add("active");
  else if (tela === "dashboard") document.querySelector(".menu-items button")?.classList.add("active");

  // Render específicos ao entrar na tela
  if (tela === "listagem-os")    renderizarTabelaOSCompleta();
  if (tela === "listagem-req")   renderizarTabelaREQCompleta();
  if (tela === "listagem-abast") renderizarTabelaAbastecimentoCompleta();

  // Foco de acessibilidade
  document.getElementById("conteudo")?.focus({ preventScroll: true });
}

/* =========================
   População de selects
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
  // Preenche somente GARAGEM; FROTA e SOLICITANTE dependem da garagem
  popularSelect("selectGaragemReq", bancoDeDados.garagens, "Escolha uma garagem...");
  const sF = document.getElementById("selectFrotaReq");
  const sS = document.getElementById("selectSolicitanteReq");
  if (sF) sF.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
  if (sS) sS.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
}

/* =========================
   Atualização por GARAGEM (OS)
========================= */
function atualizarCamposPorGaragem() {
  const g = document.getElementById("selectGaragem").value;
  const sMot = document.getElementById("selectMotorista");
  const sFrota = document.getElementById("selectFrota");

  if (!g) {
    if (sMot) sMot.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
    if (sFrota) sFrota.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
    return;
  }

  const motoristas = bancoDeDados.motoristas[g] || [];
  const frotas = bancoDeDados.veiculos[g] || [];

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

/* =========================
   Atualização por GARAGEM (Requisição)
========================= */
function atualizarCamposReqPorGaragem() {
  const g = document.getElementById("selectGaragemReq").value;
  const sFrota = document.getElementById("selectFrotaReq");
  const sSol   = document.getElementById("selectSolicitanteReq");

  if (!g) {
    if (sFrota) sFrota.innerHTML = `<option value="">Selecione a garagem primeiro...</option>`;
    if (sSol)   sSol.innerHTML   = `<option value="">Selecione a garagem primeiro...</option>`;
    return;
  }

  const frotas = bancoDeDados.veiculos[g] || [];
  if (sFrota) {
    sFrota.innerHTML =
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
   Salvar OS (validações)
========================= */
function salvarOS() {
  const garagem   = document.getElementById("selectGaragem").value;
  const motorista = document.getElementById("selectMotorista").value;
  const frota     = document.getElementById("selectFrota").value;
  const km        = document.getElementById("inputKM").value.trim();
  const servico   = document.getElementById("selectTipoServico").value;
  const descricao = document.getElementById("textoDescricao").value.trim();

  const erros = [];
  if (!garagem) erros.push("Selecione a garagem.");
  if (!motorista) erros.push("Selecione o motorista.");
  if (!frota) erros.push("Selecione a frota.");
  if (km === "" || Number.isNaN(Number(km)) || Number(km) < 0) erros.push("Informe um KM válido (>= 0).");
  if (!servico) erros.push("Selecione o tipo de serviço.");
  if (!descricao) erros.push("Descreva o problema.");

  if (erros.length) {
    alert("Verifique os campos:\n- " + erros.join("\n- "));
    // Foco no primeiro campo inválido
    const ordem = ["selectGaragem","selectMotorista","selectFrota","inputKM","selectTipoServico","textoDescricao"];
    for (const id of ordem) {
      const el = document.getElementById(id);
      if (id === "inputKM") {
        if (km === "" || Number.isNaN(Number(km)) || Number(km) < 0) { el?.focus(); break; }
      } else if (!el?.value) { el?.focus(); break; }
    }
    return;
  }

  const id = gerarId("OS");
  const now = new Date();
  const registro = {
    id,
    data: now.toISOString(),
    dataBR: formatarDataBR(now),
    garagem, motorista, frota,
    km: Number(km),
    servico, descricao,
    status: "ABERTA"
  };

  ordensServico.unshift(registro);
  salvarLista(STORAGE_KEYS.OS, ordensServico);

  fecharModal();
  atualizarDashboard();
  alert(`OS ${id} aberta com sucesso!`);
}

/* =========================
   Salvar Requisição (validações)
========================= */
function salvarRequisicao() {
  const material     = document.getElementById("inputMaterial").value.trim();
  const quantidadeEl = document.getElementById("inputQuantidade");
  const quantidade   = quantidadeEl ? quantidadeEl.value.trim() : "";
  const garagem      = document.getElementById("selectGaragemReq").value;
  const frota        = document.getElementById("selectFrotaReq").value;
  const solicitante  = document.getElementById("selectSolicitanteReq").value;
  const dataISO      = document.getElementById("inputDataReq").value;
  const dataBR       = ISOparaBR(dataISO) || formatarDataBR();
  const codigo       = document.getElementById("inputCodigoReq").value.trim();
  const descricao    = document.getElementById("textoDescricaoReq").value.trim();

  const erros = [];
  if (!material) erros.push("Informe o material.");
  if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (número > 0).");
  if (!garagem) erros.push("Selecione a garagem.");
  if (!frota) erros.push("Selecione a frota.");
  if (!solicitante) erros.push("Selecione o solicitante.");
  if (!dataISO) erros.push("Selecione a data.");
  if (!codigo) erros.push("Informe o código.");
  if (!descricao) erros.push("Informe a descrição.");

  if (erros.length) {
    alert("Verifique os campos:\n- " + erros.join("\n- "));
    const ordem = ["inputMaterial","inputQuantidade","selectGaragemReq","selectFrotaReq","selectSolicitanteReq","inputDataReq","inputCodigoReq","textoDescricaoReq"];
    for (const id of ordem) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (id === "inputQuantidade") {
        if (!quantidade || Number(quantidade) <= 0) { el.focus(); break; }
      } else if (!el.value) { el.focus(); break; }
    }
    return;
  }

  const id = gerarId("REQ");
  const registro = {
    id, dataBR, material,
    quantidade: Number(quantidade),
    garagem, frota, solicitante, codigo, descricao,
    status: "ABERTA"
  };

  requisicoes.unshift(registro);
  salvarLista(STORAGE_KEYS.REQ, requisicoes);

  fecharModalRequisicao();
  atualizarDashboard();
  alert(`Requisição ${id} registrada!`);
}

/* =========================
   Salvar Abastecimento (validações)
========================= */
function salvarAbastecimento() {
  const dataHoraISO = document.getElementById("inputDataHoraAbast").value; // yyyy-mm-ddThh:mm
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
  if (!Number.isNaN(nIni) && !Number.isNaN(nFim) && nFim < nIni) erros.push("KM final da bomba deve ser maior ou igual ao inicial.");
  if (!quantidade || Number(quantidade) <= 0) erros.push("Informe a quantidade (litros > 0).");

  if (erros.length) {
    alert("Verifique os campos:\n- " + erros.join("\n- "));
    const ordem = ["inputDataHoraAbast","selectFrotaAbast","inputKMVeiculoAbast","inputKMInicioBomba","inputKMFimBomba","inputQuantidadeLitros"];
    for (const id of ordem) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (id === "inputKMFimBomba" && (!kmFim || Number(kmFim) < Number(kmIni))) { el.focus(); break; }
      if (id === "inputQuantidadeLitros" && (!quantidade || Number(quantidade) <= 0)) { el.focus(); break; }
      if (!el.value) { el.focus(); break; }
    }
    return;
  }

  // Buscar placa/garagem do prefixo (para exibir nas listas)
  const frotas = obterFrotasCombinadas();
  const meta = frotas.find(f => f.prefixo === frota) || {};

  // Monta registro
  const id = gerarId("ABAST");
  const dataObj = new Date(dataHoraISO);
  const dd = String(dataObj.getDate()).padStart(2,"0");
  const mm = String(dataObj.getMonth()+1).padStart(2,"0");
  const yy = dataObj.getFullYear();
  const hh = String(dataObj.getHours()).padStart(2,"0");
  const mi = String(dataObj.getMinutes()).padStart(2,"0");
  const dataBR = `${dd}/${mm}/${yy} ${hh}:${mi}`;

  const registro = {
    id,
    dataISO: dataObj.toISOString(),
    dataBR,
    frota,
    placa: meta.placa || "",
    garagem: meta.garagem || "",
    kmVeiculo: Number(kmVeiculo),
    kmBombaIni: Number(kmIni),
    kmBombaFim: Number(kmFim),
    quantidade: Number(quantidade)
  };

  abastecimentos.unshift(registro);
  salvarLista(STORAGE_KEYS.ABAST, abastecimentos);

  fecharModalAbastecimento();
  atualizarDashboard();
  alert(`Abastecimento ${id} registrado!`);
}

/* =========================
   Dashboard + Listas compactas
   (Sem "Últimos Abastecimentos")
========================= */
function atualizarDashboard() {
  // OS
  const cOS = contarPorStatus(ordensServico);
  setText("os-count-aberta", cOS["ABERTA"]);
  setText("os-count-em-andamento", cOS["EM ANDAMENTO"]);
  setText("os-count-aguardando", cOS["AGUARDANDO"]);
  setText("os-count-concluida", cOS["CONCLUÍDA"]);

  // Requisições
  const cRQ = contarPorStatus(requisicoes);
  setText("req-count-aberta", cRQ["ABERTA"]);
  setText("req-count-em-andamento", cRQ["EM ANDAMENTO"]);
  setText("req-count-aguardando", cRQ["AGUARDANDO"]);
  setText("req-count-concluida", cRQ["CONCLUÍDA"]);

  // Últimas listas (somente OS e REQ)
  renderUltimasOS(document.getElementById("lista-vazia"), ordensServico);
  renderUltimasREQ(document.getElementById("lista-requisicoes"), requisicoes);
}

function renderUltimasOS(container, dados) {
  if (!container) return;
  container.innerHTML = "";
  if (!dados.length) {
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

function renderUltimasREQ(container, dados) {
  if (!container) return;
  container.innerHTML = "";
  if (!dados.length) {
    container.classList.add("empty-state");
    container.textContent = "Sem registros";
    return;
  }
  container.classList.remove("empty-state");

  const ul = document.createElement("ul");
  ul.className = "list-simples";

  dados.slice(0, 5).forEach(req => {
    const qtd = (req.quantidade ?? req.unidade ?? "-");
    const desc = req.descricao ? escapeHTML(req.descricao) : "";
    const material = req.material ? escapeHTML(req.material) : "";
    const resumoDesc = desc ? (desc.length > 140 ? desc.slice(0, 140) + "..." : desc) : "";

    const li = document.createElement("li");
    li.innerHTML = `
      <div><strong>${escapeHTML(req.id)}</strong> • ${escapeHTML(req.dataBR || "")} • ${material} (${escapeHTML(String(qtd))})</div>
      <div class="meta">Garagem: ${escapeHTML(req.garagem || "-")} • Frota: ${escapeHTML(req.frota || "")} • Solicitante: ${escapeHTML(req.solicitante || "")} • Status: ${escapeHTML(req.status || "")}</div>
      ${resumoDesc ? `<div class="desc">${resumoDesc}</div>` : ""}
    `;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

/* =========================
   Tabelas completas
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

function renderizarTabelaREQCompleta() {
  const wrap = document.getElementById("tabela-completa-req");
  if (!wrap) return;

  if (!requisicoes.length) {
    wrap.innerHTML = `<div class="empty-state">Sem registros</div>`;
    return;
  }

  const rows = requisicoes.map((req, idx) => `
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

function renderizarTabelaAbastecimentoCompleta() {
  const wrap = document.getElementById("tabela-completa-abast");
  if (!wrap) return;

  if (!abastecimentos.length) {
    wrap.innerHTML = `<div class="empty-state">Sem registros</div>`;
    return;
  }

  const rows = abastecimentos.map((a, idx) => `
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

/* =========================
   Ações (status / concluir / remover)
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
function concluirOS(id, indexFallback = -1) {
  alterarStatusOS(id, "CONCLUÍDA", indexFallback);
}
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
function concluirREQ(id, indexFallback = -1) {
  alterarStatusREQ(id, "CONCLUÍDA", indexFallback);
}
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
   BUSCA nas telas "Ver todos" (OS, REQ, ABAST)
========================= */
// Estado dos termos de busca por tela
const BUSCA_STATE = { os: "", req: "", abast: "" };

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ---- OS (filtrada) ---- */
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

/* ---- REQ (filtrada) ---- */
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

/* ---- ABAST (filtrada) ---- */
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

  if (iOS) {
    iOS.value = BUSCA_STATE.os;
    iOS.addEventListener("input", () => {
      BUSCA_STATE.os = iOS.value;
      renderizarTabelaOSFiltrada();
    });
  }
  if (iREQ) {
    iREQ.value = BUSCA_STATE.req;
    iREQ.addEventListener("input", () => {
      BUSCA_STATE.req = iREQ.value;
      renderizarTabelaREQFiltrada();
    });
  }
  if (iABAST) {
    iABAST.value = BUSCA_STATE.abast;
    iABAST.addEventListener("input", () => {
      BUSCA_STATE.abast = iABAST.value;
      renderizarTabelaAbastecimentoFiltrada();
    });
  }
});

/* ---- Substitui render padrão pelas versões com filtro quando houver termo ---- */
const _renderOSOriginal    = typeof renderizarTabelaOSCompleta === "function"    ? renderizarTabelaOSCompleta    : null;
const _renderREQOriginal   = typeof renderizarTabelaREQCompleta === "function"   ? renderizarTabelaREQCompleta   : null;
const _renderABASTOriginal = typeof renderizarTabelaAbastecimentoCompleta === "function" ? renderizarTabelaAbastecimentoCompleta : null;

window.renderizarTabelaOSCompleta = function() {
  if (BUSCA_STATE.os) return renderizarTabelaOSFiltrada();
  if (_renderOSOriginal) return _renderOSOriginal();
};
window.renderizarTabelaREQCompleta = function() {
  if (BUSCA_STATE.req) return renderizarTabelaREQFiltrada();
  if (_renderREQOriginal) return _renderREQOriginal();
};
window.renderizarTabelaAbastecimentoCompleta = function() {
  if (BUSCA_STATE.abast) return renderizarTabelaAbastecimentoFiltrada();
  if (_renderABASTOriginal) return _renderABASTOriginal();
};

/* =========================
   Event wiring (sem onclick inline)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Nav por data-nav-target
  document.querySelectorAll("[data-nav-target]").forEach(btn => {
    btn.addEventListener("click", () => alternarTelas(btn.dataset.navTarget));
  });

  // Abrir modais por data-open-modal
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.openModal;
      if (tipo === "os")    abrirModal();
      if (tipo === "req")   abrirModalRequisicao();
      if (tipo === "abast") abrirModalAbastecimento();
    });
  });

  // Fechar modais por data-close-modal
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

  // Trap de foco (Tab/Shift+Tab) dentro dos modais
  ["modalOS", "modalRequisicao", "modalAbastecimento"].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Tab") trapFocus(modal, e);
    });
  });

  // Submits por Enter dentro dos modais (evita quando foco está em select/textarea)
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

  // Hooks dependentes de garagem (OS/REQ)
  document.getElementById("selectGaragem")?.addEventListener("change", atualizarCamposPorGaragem);
  document.getElementById("selectGaragemReq")?.addEventListener("change", atualizarCamposReqPorGaragem);

  // Hook dos botões submit dos modais
  document.querySelector("[data-submit-os]")?.addEventListener("click", salvarOS);
  document.querySelector("[data-submit-req]")?.addEventListener("click", salvarRequisicao);
  document.querySelector("[data-submit-abast]")?.addEventListener("click", salvarAbastecimento);
});

/* =========================
   Inicialização (migração, selects, dashboard, tela)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Migração (IDs, status e unidade->quantidade para REQ)
  let migrated = false;

  ordensServico = (ordensServico || []).map((o) => {
    const n = { ...o };
    if (!n.id) { n.id = gerarId("OS"); migrated = true; }
    n.status = normalizarStatus(n.status);
    if (!n.dataBR && n.data) {
      try { n.dataBR = formatarDataBR(new Date(n.data)); } catch {}
    }
    return n;
  });

  requisicoes = (requisicoes || []).map((r) => {
    const n = { ...r };
    if (!n.id) { n.id = gerarId("REQ"); migrated = true; }
    n.status = normalizarStatus(n.status);
    // migra unidade -> quantidade se existir (retrocompat)
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

  // Selects iniciais (OS e REQ)
  popularSelect("selectGaragem", bancoDeDados.garagens, "Escolha uma garagem...");
  popularTipoServico();
  popularSelectsRequisicao(); // preenche apenas a garagem de REQ

  // DATA do modal de Requisição: hoje por padrão
  const inputDataReq = document.getElementById("inputDataReq");
  if (inputDataReq && !inputDataReq.value) inputDataReq.value = toISODateString(new Date());

  // Popular select de Frota no modal de Abastecimento
  (function popularSelectFrotaAbastecimento() {
    const s = document.getElementById("selectFrotaAbast");
    if (!s) return;
    const frotas = obterFrotasCombinadas();
    s.innerHTML = `<option value="">Selecione...</option>` +
      frotas.map(f => `<option value="${f.prefixo}">${f.prefixo} • ${f.placa} • ${f.garagem}</option>`).join("");
  })();

  // Pinta dashboard
  atualizarDashboard();

  // Tela inicial
  alternarTelas('dashboard');
});

/* =========================
   Expor no window (compat)
========================= */
// SPA / Navegação
window.alternarTelas = alternarTelas;

// Modais OS
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;

// Modais Requisição
window.abrirModalRequisicao = abrirModalRequisicao;
window.fecharModalRequisicao = fecharModalRequisicao;

// Modais Abastecimento
window.abrirModalAbastecimento = abrirModalAbastecimento;
window.fecharModalAbastecimento = fecharModalAbastecimento;

// Dependentes de garagem
window.atualizarCamposPorGaragem = atualizarCamposPorGaragem;
window.atualizarCamposReqPorGaragem = atualizarCamposReqPorGaragem;

// Submits
window.salvarOS = salvarOS;
window.salvarRequisicao = salvarRequisicao;
window.salvarAbastecimento = salvarAbastecimento;

// Tabelas e ações
window.renderizarTabelaOSCompleta = window.renderizarTabelaOSCompleta; // wrappers já ajustados pela busca
window.renderizarTabelaREQCompleta = window.renderizarTabelaREQCompleta;
window.renderizarTabelaAbastecimentoCompleta = window.renderizarTabelaAbastecimentoCompleta;

window.alterarStatusOS = alterarStatusOS;
window.concluirOS = concluirOS;
window.removerOS = removerOS;

window.alterarStatusREQ = alterarStatusREQ;
window.concluirREQ = concluirREQ;
window.removerREQ = removerREQ;

window.removerAbastecimento = removerAbastecimento;