// public/js/minhas-os.js
// Este arquivo cria uma UI profissional para "Minhas OS" (driver e admin)
// Reusa api() e alternarTelas() definidos em /script.js

(function(){
  // --- CSS injetado (apenas para a seção Minhas OS) ---
  function injectMyOsStyles() {
    if (document.getElementById('myos-styles')) return;
    const css = `
      /* Toolbar */
      .myos-toolbar{
        display:flex; gap:12px; align-items:center; margin-bottom:12px; flex-wrap:wrap;
      }
      .myos-toolbar .field{ display:flex; gap:6px; align-items:center; }
      .myos-toolbar input[type="search"], .myos-toolbar select{
        height:34px; padding:6px 10px; border:1px solid #c6cbd1; border-radius:6px; background:#fff;
      }
      .myos-toolbar .btn{
        height:34px; padding:6px 12px; border-radius:6px; border:1px solid #c6cbd1; background:#fff; cursor:pointer;
      }
      .myos-toolbar .btn.active{ background:#0d6efd; border-color:#0d6efd; color:#fff; }
      .myos-toolbar .muted{ color:#6b6f76; font-size:12px; }

      /* Tabela */
      .myos-table-wrap{ overflow:auto; border-radius:8px; border:1px solid #e6e8eb; background:#fff; }
      table.myos-table{ width:100%; border-collapse:collapse; font-size:14px; }
      .myos-table thead th{
        text-align:left; padding:10px; background:#f6f8fa; border-bottom:1px solid #e6e8eb; white-space:nowrap;
        position:sticky; top:0; z-index:1;
      }
      .myos-table tbody td{ padding:10px; border-bottom:1px solid #f0f2f4; vertical-align:top; }
      .myos-table tbody tr:hover{ background:#fafbfc; }

      /* Pílulas de status */
      .pill{
        display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600;
      }
      .pill.open      { background:#e8f1ff; color:#0d6efd; }
      .pill.working   { background:#fff2cd; color:#a87b00; }
      .pill.waiting   { background:#ffe5ea; color:#b02a37; }
      .pill.done      { background:#e7f6ec; color:#157347; }

      /* Descrição truncada (expansível) */
      .desc{ color:#4b4f56; max-width:460px; }
      .desc .more{ color:#0d6efd; cursor:pointer; margin-left:6px; }

      /* Rodapé/paginação */
      .myos-footer{
        display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:10px;
      }
      .myos-footer .pager{ display:flex; gap:8px; align-items:center; }
      .myos-footer .pager button{
        padding:6px 10px; border:1px solid #c6cbd1; background:#fff; border-radius:6px; cursor:pointer;
      }
      .myos-footer .pager button:disabled{ opacity:.5; cursor:not-allowed; }
      .myos-footer .total{ color:#6b6f76; font-size:13px; }
    `;
    const style = document.createElement('style');
    style.id = 'myos-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- Utilitários ---
  function fmtDateTimeBR(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch{ return ''; }
  }

  function statusPill(status){
    // back usa: aberta | andamento | aguardando | concluida
    const s = String(status||'').toLowerCase();
    if (s === 'andamento') return `<span class="pill working">em andamento</span>`;
    if (s === 'aguardando') return `<span class="pill waiting">aguardando</span>`;
    if (s === 'concluida')  return `<span class="pill done">concluída</span>`;
    return `<span class="pill open">aberta</span>`;
  }

  function highlight(text, query){
    if (!query) return text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${q})`, 'ig'), '<mark>$1</mark>');
  }

  // --- Estado e cache leve ---
  const state = {
    me: null,
    role: null,
    status: '',      // filtro
    q: '',           // busca
    mine: false,     // admin: somente minhas
    page: 1,
    limit: 25,
    total: 0,
    items: []
  };

  async function fetchMe(){
    if (state.me) return state.me;
    const me = await api('/api/auth/me');
    state.me = me?.user || null;
    state.role = state.me?.role || null;
    return state.me;
  }

  // --- Busca na API /api/os (back já filtra driver por createdBy) ---
  async function fetchMyOs(){
    const params = new URLSearchParams();
    if (state.status) params.set('status', state.status);
    params.set('limit', String(state.limit || 25));
    params.set('page', String(state.page || 1));
    if (state.role === 'admin' && state.mine) params.set('mine', '1');

    const res = await api(`/api/os?${params.toString()}`);
    state.total = Number(res?.total || 0);
    let items = res?.items || [];

    // Filtro de busca (no front, para não multiplicar endpoints)
    if (state.q) {
      const qn = state.q.toLowerCase();
      items = items.filter(r => {
        const fields = [
          r.id, r.frota, r.garagem, r.tipoServico, r.descricao, r.openedByName
        ].map(v => String(v || '').toLowerCase());
        return fields.some(f => f.includes(qn));
      });
    }
    state.items = items;
    return items;
  }

  // --- Render da UI ---
  function buildToolbar(container){
    const wrap = document.createElement('div');
    wrap.className = 'myos-toolbar';
    wrap.innerHTML = `
      <div class="field">
        <label class="muted" for="filter-status">Status:</label>
        <select id="filter-status">
          <option value="">Todos</option>
          <option value="aberta">Aberta</option>
          <option value="andamento">Em andamento</option>
          <option value="aguardando">Aguardando</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      <div class="field">
        <label class="muted" for="filter-q">Buscar:</label>
        <input id="filter-q" type="search" placeholder="ID, frota, garagem, tipo, texto..." />
      </div>

      <div class="field">
        <label class="muted" for="filter-limit">Por página:</label>
        <select id="filter-limit">
          <option value="10">10</option>
          <option value="25" selected>25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <div class="field" id="field-mine" style="display:none;">
        <button id="btn-mine" class="btn" type="button">Somente minhas</button>
      </div>
    `;
    container.appendChild(wrap);

    // Eventos
    const selStatus = wrap.querySelector('#filter-status');
    const inpQ      = wrap.querySelector('#filter-q');
    const selLimit  = wrap.querySelector('#filter-limit');
    const mineWrap  = wrap.querySelector('#field-mine');
    const btnMine   = wrap.querySelector('#btn-mine');

    // Mostrar/ocultar "Somente minhas" para admin
    if (state.role === 'admin') {
      mineWrap.style.display = '';
      btnMine.addEventListener('click', async () => {
        state.mine = !state.mine;
        btnMine.classList.toggle('active', state.mine);
        state.page = 1;
        await loadMyOsHistory();
      });
    }

    selStatus.value = state.status;
    selStatus.addEventListener('change', async () => {
      state.status = selStatus.value;
      state.page = 1;
      await loadMyOsHistory();
    });

    selLimit.value = String(state.limit);
    selLimit.addEventListener('change', async () => {
      state.limit = Number(selLimit.value || 25);
      state.page = 1;
      await loadMyOsHistory();
    });

    // Debounce leve para a busca
    let t=null;
    inpQ.value = state.q;
    inpQ.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        state.q = inpQ.value.trim();
        state.page = 1;
        await loadMyOsHistory();
      }, 250);
    });

    // Botão "Somente minhas" ativo?
    if (state.role === 'admin') {
      btnMine.classList.toggle('active', state.mine);
    }
  }

  function buildTable(container){
    const wrap = document.createElement('div');
    wrap.className = 'myos-table-wrap';

    const table = document.createElement('table');
    table.className = 'myos-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="min-width:120px;">Nº OS</th>
          <th style="min-width:150px;">Abertura</th>
          <th style="min-width:120px;">Garagem</th>
          <th style="min-width:90px;">Frota</th>
          <th style="min-width:140px;">Tipo</th>
          <th style="min-width:260px;">Descrição</th>
          <th style="min-width:160px;">Aberta por</th>
          <th style="min-width:120px;">Status</th>
        </tr>
      </thead>
      <tbody id="myos-tbody">
        <tr><td colspan="8">Carregando...</td></tr>
      </tbody>
    `;
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function buildFooter(container){
    const foot = document.createElement('div');
    foot.className = 'myos-footer';
    foot.innerHTML = `
      <div class="total" id="myos-total"></div>
      <div class="pager">
        <button id="pg-prev" type="button">&laquo; Anterior</button>
        <span id="pg-info" class="muted"></span>
        <button id="pg-next" type="button">Próxima &raquo;</button>
      </div>
    `;
    container.appendChild(foot);

    const prev = foot.querySelector('#pg-prev');
    const next = foot.querySelector('#pg-next');

    prev.addEventListener('click', async () => {
      if (state.page > 1) {
        state.page--;
        await loadMyOsHistory();
      }
    });
    next.addEventListener('click', async () => {
      const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
      if (state.page < maxPage) {
        state.page++;
        await loadMyOsHistory();
      }
    });
  }

  function renderRows(container){
    const tbody = container.querySelector('#myos-tbody');
    const totalEl = container.querySelector('#myos-total');
    const infoEl  = container.querySelector('#pg-info');

    const items = state.items || [];
    tbody.innerHTML = '';

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="8">Sem registros</td></tr>`;
    } else {
      items.forEach(r => {
        const tr = document.createElement('tr');

        const id = highlight(escapeHTML(String(r.id || '')), state.q);
        const dt = fmtDateTimeBR(r.openedAt || r.createdAt);
        const gar = highlight(escapeHTML(String(r.garagem || '-')), state.q);
        const fro = highlight(escapeHTML(String(r.frota || '-')), state.q);
        const tipo = highlight(escapeHTML(String(r.tipoServico || '-')), state.q);

        const descRaw = String(r.descricao || '');
        const descShort = descRaw.length > 160 ? escapeHTML(descRaw.slice(0,160)) + '...' : escapeHTML(descRaw);
        const descHtml = highlight(descShort, state.q);
        const by = highlight(escapeHTML(String(r.openedByName || '-')), state.q);
        const st = statusPill(r.status);

        tr.innerHTML = `
          <td>${id}</td>
          <td>${escapeHTML(dt)}</td>
          <td>${gar}</td>
          <td>${fro}</td>
          <td>${tipo}</td>
          <td class="desc">${descHtml}${descRaw.length>160?` <span class="more" data-full="${escapeHTML(descRaw)}">ver mais</span>`:''}</td>
          <td>${by}</td>
          <td>${st}</td>
        `;
        tbody.appendChild(tr);
      });

      // Expandir descrição "ver mais"
      tbody.querySelectorAll('.more').forEach(span => {
        span.addEventListener('click', () => {
          const full = span.getAttribute('data-full') || '';
          const cell = span.closest('.desc');
          if (!cell) return;
          cell.innerHTML = `<span>${full}</span> <span class="more">ver menos</span>`;
          const back = cell.querySelector('.more');
          back.addEventListener('click', () => {
            cell.innerHTML = `${full.length>160?escapeHTML(full.slice(0,160))+'...':escapeHTML(full)}`;
          });
        });
      });
    }

    // Totais e paginação
    totalEl.textContent = `Total: ${state.total} OS`;
    const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
    infoEl.textContent = `Página ${state.page} de ${maxPage}`;
    container.querySelector('#pg-prev').disabled = state.page <= 1;
    container.querySelector('#pg-next').disabled = state.page >= maxPage;
  }

  // --- API principal exportada ---
  async function loadMyOsHistory() {
    const box = document.getElementById('tabela-minhas-os');
    if (!box) return;

    box.innerHTML = 'Carregando...';
    injectMyOsStyles();
    await fetchMe();

    // Monta estrutura uma vez
    box.innerHTML = '';
    buildToolbar(box);
    buildTable(box);
    buildFooter(box);

    // Busca e render
    try {
      await fetchMyOs();
      renderRows(box);
    } catch (err) {
      console.error('[MinhasOS] erro:', err);
      box.innerHTML = `<div class="empty-state">Erro ao carregar suas OS: ${escapeHTML(err.message)}</div>`;
    }
  }

  // Expor função para o script principal chamar após abrir OS
  window.loadMyOsHistory = loadMyOsHistory;

  // Carrega a seção quando navegar para "Minhas OS"
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-nav-target]');
    if (!btn) return;
    if (btn.getAttribute('data-nav-target') === 'minhas-os') {
      setTimeout(() => loadMyOsHistory().catch(()=>{}), 0);
    }
  });

  // Se a seção for aberta por padrão pelo guard do motorista, carregue também
  document.addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('tela-minhas-os');
    if (sec && !sec.classList.contains('hidden')) {
      loadMyOsHistory().catch(()=>{});
    }
  });

})();