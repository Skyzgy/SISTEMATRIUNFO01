// DEBUG VERSION
(function(){
  console.log('[admin-requisicoes] Script carregado');

  const state = {
    me: null,
    role: null,
    status: '',
    q: '',
    mine: false,
    page: 1,
    limit: 25,
    total: 0,
    items: []
  };

  function fmtDateTimeBR(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch{ return ''; }
  }

  function escapeHTML(str){ 
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); 
  }

  function highlight(text, query){
    if (!query) return text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${q})`, 'ig'), '<mark>$1</mark>');
  }

  function statusPill(status){
    const s = String(status||'').toLowerCase();
    if (s === 'andamento') return `<span class="pill working">em andamento</span>`;
    if (s === 'aguardando') return `<span class="pill waiting">aguardando</span>`;
    if (s === 'concluida')  return `<span class="pill done">concluída</span>`;
    return `<span class="pill open">aberta</span>`;
  }

  async function fetchMe(){
    console.log('[fetchMe] Iniciando...');
    if (state.me) return state.me;
    try {
      const me = await api('/api/auth/me');
      console.log('[fetchMe] Resposta:', me);
      state.me = me?.user || null;
      state.role = state.me?.role || null;
      console.log('[fetchMe] Role definido como:', state.role);
    } catch(e) {
      console.error('[fetchMe] Erro:', e);
    }
    return state.me;
  }

  async function fetchReq(){
    console.log('[fetchReq] Iniciando...');
    try {
      const params = new URLSearchParams();
      if (state.status) params.set('status', state.status);
      params.set('limit', String(state.limit || 25));
      params.set('page', String(state.page || 1));
      if (state.role === 'admin' && state.mine) params.set('mine', '1');

      const url = `/api/req?${params.toString()}`;
      console.log('[fetchReq] URL:', url);
      
      const res = await api(url);
      console.log('[fetchReq] Resposta:', res);
      
      state.total = Number(res?.total || 0);
      let items = res?.items || [];

      if (state.q) {
        const qn = state.q.toLowerCase();
        items = items.filter(r => {
          const fields = [r.id, r.frota, r.garagem, r.material, r.solicitante, r.codigo]
            .map(v => String(v || '').toLowerCase());
          return fields.some(f => f.includes(qn));
        });
      }

      state.items = items;
      console.log('[fetchReq] Items carregados:', items.length);
      return items;
    } catch(e) {
      console.error('[fetchReq] Erro:', e);
      return [];
    }
  }

  async function patchStatusReq(reqId, newStatus){
    try {
      await api(`/api/req/${encodeURIComponent(reqId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch(e) {
      console.error('Erro ao alterar status:', e);
      throw e;
    }
  }

  function buildToolbar(container){
    console.log('[buildToolbar] Criando toolbar');
    const wrap = document.createElement('div');
    wrap.className = 'myos-toolbar';
    wrap.innerHTML = `
      <div class="field">
        <label class="muted" for="areq-status">Status:</label>
        <select id="areq-status">
          <option value="">Todos</option>
          <option value="aberta">Aberta</option>
          <option value="andamento">Em andamento</option>
          <option value="aguardando">Aguardando</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      <div class="field">
        <label class="muted" for="areq-q">Buscar:</label>
        <input id="areq-q" type="search" placeholder="ID, frota, garagem, material, solicitante, código..." />
      </div>

      <div class="field">
        <label class="muted" for="areq-limit">Por página:</label>
        <select id="areq-limit">
          <option value="10">10</option>
          <option value="25" selected>25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <div class="field" id="areq-mine-wrap" style="display:none;">
        <button id="areq-mine" class="btn" type="button">Somente minhas</button>
      </div>
    `;
    container.appendChild(wrap);

    const selStatus = wrap.querySelector('#areq-status');
    const inpQ      = wrap.querySelector('#areq-q');
    const selLimit  = wrap.querySelector('#areq-limit');
    const mineWrap  = wrap.querySelector('#areq-mine-wrap');
    const btnMine   = wrap.querySelector('#areq-mine');

    selStatus.value = state.status;
    selLimit.value  = String(state.limit);
    inpQ.value      = state.q;

    if (state.role === 'admin') {
      mineWrap.style.display = '';
      btnMine.classList.toggle('active', state.mine);
      btnMine.addEventListener('click', async () => {
        state.mine = !state.mine;
        btnMine.classList.toggle('active', state.mine);
        state.page = 1;
        await loadAdminReq();
      });
    }

    selStatus.addEventListener('change', async () => {
      state.status = selStatus.value;
      state.page = 1;
      await loadAdminReq();
    });

    selLimit.addEventListener('change', async () => {
      state.limit = Number(selLimit.value || 25);
      state.page = 1;
      await loadAdminReq();
    });

    let t=null;
    inpQ.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        state.q = inpQ.value.trim();
        state.page = 1;
        await loadAdminReq();
      }, 250);
    });
  }

  function buildTable(container){
    console.log('[buildTable] Criando tabela');
    const wrap = document.createElement('div');
    wrap.className = 'myos-table-wrap';

    const table = document.createElement('table');
    table.className = 'myos-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="min-width:100px;">ID</th>
          <th style="min-width:150px;">Abertura</th>
          <th style="min-width:120px;">Garagem</th>
          <th style="min-width:90px;">Frota</th>
          <th style="min-width:120px;">Material</th>
          <th style="min-width:80px;">Qtd</th>
          <th style="min-width:120px;">Solicitante</th>
          <th style="min-width:100px;">Código</th>
          <th style="min-width:130px;">Status</th>
          <th style="min-width:130px;">Ação</th>
        </tr>
      </thead>
      <tbody id="areq-tbody">
        <tr><td colspan="10">Carregando...</td></tr>
      </tbody>
    `;
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function buildFooter(container){
    console.log('[buildFooter] Criando rodapé');
    const foot = document.createElement('div');
    foot.className = 'myos-footer';
    foot.innerHTML = `
      <div class="total" id="areq-total"></div>
      <div class="pager">
        <button id="areq-prev" type="button">&laquo; Anterior</button>
        <span id="areq-info" class="muted"></span>
        <button id="areq-next" type="button">Próxima &raquo;</button>
      </div>
    `;
    container.appendChild(foot);

    const prev = foot.querySelector('#areq-prev');
    const next = foot.querySelector('#areq-next');
    prev.addEventListener('click', async () => {
      if (state.page > 1) { state.page--; await loadAdminReq(); }
    });
    next.addEventListener('click', async () => {
      const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
      if (state.page < maxPage) { state.page++; await loadAdminReq(); }
    });
  }

  function renderRows(container){
    console.log('[renderRows] Renderizando linhas:', state.items.length);
    const tbody = container.querySelector('#areq-tbody');
    const totalEl = container.querySelector('#areq-total');
    const infoEl  = container.querySelector('#areq-info');

    const items = state.items || [];
    tbody.innerHTML = '';

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="10">Sem requisições encontradas</td></tr>`;
    } else {
      items.forEach(r => {
        const tr = document.createElement('tr');

        const id = highlight(escapeHTML(String(r.id || '')), state.q);
        const dt = fmtDateTimeBR(r.createdAt);
        const gar = highlight(escapeHTML(String(r.garagem || '-')), state.q);
        const fro = highlight(escapeHTML(String(r.frota || '-')), state.q);
        const mat = highlight(escapeHTML(String(r.material || '-')), state.q);
        const qtd = r.quantidade || 0;
        const sol = highlight(escapeHTML(String(r.solicitante || '-')), state.q);
        const cod = highlight(escapeHTML(String(r.codigo || '-')), state.q);
        const pill = statusPill(r.status);

        tr.innerHTML = `
          <td>${id}</td>
          <td>${escapeHTML(dt)}</td>
          <td>${gar}</td>
          <td>${fro}</td>
          <td>${mat}</td>
          <td>${qtd}</td>
          <td>${sol}</td>
          <td>${cod}</td>
          <td>${pill}</td>
          <td>
            <select class="areq-status-change" data-id="${escapeHTML(String(r.id))}">
              <option value="aberta"    ${r.status==='aberta'?'selected':''}>Aberta</option>
              <option value="andamento" ${r.status==='andamento'?'selected':''}>Em andamento</option>
              <option value="aguardando"${r.status==='aguardando'?'selected':''}>Aguardando</option>
              <option value="concluida" ${r.status==='concluida'?'selected':''}>Concluída</option>
            </select>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.areq-status-change').forEach(sel => {
        sel.addEventListener('change', async () => {
          const newStatus = sel.value;
          const reqId = sel.getAttribute('data-id');
          sel.disabled = true;
          try {
            await patchStatusReq(reqId, newStatus);
            await loadAdminReq();
          } catch (err) {
            alert('Erro ao alterar status: ' + err.message);
          } finally {
            sel.disabled = false;
          }
        });
      });
    }

    totalEl.textContent = `Total: ${state.total} requisições`;
    const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
    infoEl.textContent = `Página ${state.page} de ${maxPage}`;
    container.querySelector('#areq-prev').disabled = state.page <= 1;
    container.querySelector('#areq-next').disabled = state.page >= maxPage;
  }

  async function loadAdminReq() {
    console.log('[loadAdminReq] INICIANDO');
    
    const box = document.getElementById('tabela-completa-req');
    console.log('[loadAdminReq] Container encontrado?', !!box);
    
    if (!box) {
      console.error('[loadAdminReq] Container #tabela-completa-req NÃO ENCONTRADO!');
      return;
    }

    box.innerHTML = 'Carregando...';

    try {
      await fetchMe();
      console.log('[loadAdminReq] Role:', state.role);
      
      if (state.role !== 'admin') {
        box.innerHTML = `<div class="empty-state">Apenas administradores podem acessar.</div>`;
        return;
      }

      box.innerHTML = '';
      buildToolbar(box);
      buildTable(box);
      buildFooter(box);

      await fetchReq();
      renderRows(box);
      
      console.log('[loadAdminReq] CONCLUÍDO COM SUCESSO');
    } catch (err) {
      console.error('[loadAdminReq] ERRO:', err);
      box.innerHTML = `<div class="empty-state">Erro: ${escapeHTML(err.message)}</div>`;
    }
  }

  window.loadAdminReq = loadAdminReq;

  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-nav-target]');
    if (btn && btn.getAttribute('data-nav-target') === 'tela-listagem-req') {
      console.log('[EVENT] Clicou em "Ver todas"');
      setTimeout(() => loadAdminReq().catch(console.error), 0);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    console.log('[DOMContentLoaded] Verificando se seção está visível');
    const sec = document.getElementById('tela-listagem-req');
    if (sec && !sec.classList.contains('hidden')) {
      console.log('[DOMContentLoaded] Seção visível, carregando');
      loadAdminReq().catch(console.error);
    }
  });

})();