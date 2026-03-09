// public/js/admin-os.js
// Histórico completo de OS (ADMIN) via API
// Reusa api() e alternarTelas() definidos em /script.js e o CSS de /css/myos.css

(function(){
  // ---------- Estado ----------
  const state = {
    me: null,
    role: null,     // 'admin' ou 'driver'
    status: '',     // filtro de status
    q: '',          // busca por texto (id, frota, garagem, tipo, descrição, openedByName)
    mine: false,    // somente minhas (útil para admin)
    page: 1,
    limit: 25,
    total: 0,
    items: []
  };

  // ---------- Utils ----------
  function fmtDateTimeBR(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch{ return ''; }
  }
  function escapeHTML(str){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
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
    if (state.me) return state.me;
    const me = await api('/api/auth/me');
    state.me = me?.user || null;
    state.role = state.me?.role || null;
    return state.me;
  }

  // ---------- API ----------
  async function fetchOs(){
    const params = new URLSearchParams();
    if (state.status) params.set('status', state.status);
    params.set('limit', String(state.limit || 25));
    params.set('page', String(state.page || 1));
    // Para ADMIN: “somente minhas”
    if (state.role === 'admin' && state.mine) params.set('mine', '1');

    const res = await api(`/api/os?${params.toString()}`);
    state.total = Number(res?.total || 0);
    let items = res?.items || [];

    // Filtro de busca (front): id, frota, garagem, tipo, descrição, openedByName
    if (state.q) {
      const qn = state.q.toLowerCase();
      items = items.filter(r => {
        const fields = [r.id, r.frota, r.garagem, r.tipoServico, r.descricao, r.openedByName]
          .map(v => String(v || '').toLowerCase());
        return fields.some(f => f.includes(qn));
      });
    }

    state.items = items;
    return items;
  }

  async function patchStatus(osId, newStatus){
    await api(`/api/os/${encodeURIComponent(osId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
  }

  // ---------- UI (aproveita CSS de myos.css) ----------
  function buildToolbar(container){
    const wrap = document.createElement('div');
    wrap.className = 'myos-toolbar';
    wrap.innerHTML = `
      <div class="field">
        <label class="muted" for="aos-status">Status:</label>
        <select id="aos-status">
          <option value="">Todos</option>
          <option value="aberta">Aberta</option>
          <option value="andamento">Em andamento</option>
          <option value="aguardando">Aguardando</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      <div class="field">
        <label class="muted" for="aos-q">Buscar:</label>
        <input id="aos-q" type="search" placeholder="ID, frota, garagem, tipo, texto..." />
      </div>

      <div class="field">
        <label class="muted" for="aos-limit">Por página:</label>
        <select id="aos-limit">
          <option value="10">10</option>
          <option value="25" selected>25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <div class="field" id="aos-mine-wrap" style="display:none;">
        <button id="aos-mine" class="btn" type="button">Somente minhas</button>
      </div>
    `;
    container.appendChild(wrap);

    // Eventos
    const selStatus = wrap.querySelector('#aos-status');
    const inpQ      = wrap.querySelector('#aos-q');
    const selLimit  = wrap.querySelector('#aos-limit');
    const mineWrap  = wrap.querySelector('#aos-mine-wrap');
    const btnMine   = wrap.querySelector('#aos-mine');

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
        await loadAdminOs();
      });
    }

    selStatus.addEventListener('change', async () => {
      state.status = selStatus.value;
      state.page = 1;
      await loadAdminOs();
    });

    selLimit.addEventListener('change', async () => {
      state.limit = Number(selLimit.value || 25);
      state.page = 1;
      await loadAdminOs();
    });

    let t=null;
    inpQ.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        state.q = inpQ.value.trim();
        state.page = 1;
        await loadAdminOs();
      }, 250);
    });
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
          <th style="min-width:130px;">Status</th>
          <th style="min-width:130px;">Ação</th>
        </tr>
      </thead>
      <tbody id="aos-tbody">
        <tr><td colspan="9">Carregando...</td></tr>
      </tbody>
    `;
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function buildFooter(container){
    const foot = document.createElement('div');
    foot.className = 'myos-footer';
    foot.innerHTML = `
      <div class="total" id="aos-total"></div>
      <div class="pager">
        <button id="aos-prev" type="button">&laquo; Anterior</button>
        <span id="aos-info" class="muted"></span>
        <button id="aos-next" type="button">Próxima &raquo;</button>
      </div>
    `;
    container.appendChild(foot);

    const prev = foot.querySelector('#aos-prev');
    const next = foot.querySelector('#aos-next');
    prev.addEventListener('click', async () => {
      if (state.page > 1) { state.page--; await loadAdminOs(); }
    });
    next.addEventListener('click', async () => {
      const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
      if (state.page < maxPage) { state.page++; await loadAdminOs(); }
    });
  }

  function renderRows(container){
    const tbody = container.querySelector('#aos-tbody');
    const totalEl = container.querySelector('#aos-total');
    const infoEl  = container.querySelector('#aos-info');

    const items = state.items || [];
    tbody.innerHTML = '';

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="9">Sem registros</td></tr>`;
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
        const pill = statusPill(r.status);

        tr.innerHTML = `
          <td>${id}</td>
          <td>${escapeHTML(dt)}</td>
          <td>${gar}</td>
          <td>${fro}</td>
          <td>${tipo}</td>
          <td class="desc">${descHtml}${descRaw.length>160?` <span class="more" data-full="${escapeHTML(descRaw)}">ver mais</span>`:''}</td>
          <td>${by}</td>
          <td>${pill}</td>
          <td>
            <select class="aos-status-change" data-id="${escapeHTML(String(r.id))}">
              <option value="aberta"    ${r.status==='aberta'?'selected':''}>Aberta</option>
              <option value="andamento" ${r.status==='andamento'?'selected':''}>Em andamento</option>
              <option value="aguardando"${r.status==='aguardando'?'selected':''}>Aguardando</option>
              <option value="concluida" ${r.status==='concluida'?'selected':''}>Concluída</option>
            </select>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Expandir/contrair descrição
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

      // Alteração de status
      tbody.querySelectorAll('.aos-status-change').forEach(sel => {
        sel.addEventListener('change', async () => {
          const newStatus = sel.value;
          const osId = sel.getAttribute('data-id');
          sel.disabled = true;
          try {
            await patchStatus(osId, newStatus);
            await loadAdminOs(); // atualiza lista após o patch
          } catch (err) {
            alert('Erro ao alterar status: ' + err.message);
          } finally {
            sel.disabled = false;
          }
        });
      });
    }

    // Totais/paginação
    totalEl.textContent = `Total: ${state.total} OS`;
    const maxPage = Math.max(1, Math.ceil(state.total / state.limit));
    infoEl.textContent = `Página ${state.page} de ${maxPage}`;
    container.querySelector('#aos-prev').disabled = state.page <= 1;
    container.querySelector('#aos-next').disabled = state.page >= maxPage;
  }

  // ---------- Função principal ----------
  async function loadAdminOs() {
    const box = document.getElementById('tabela-completa-os');
    if (!box) return;

    // Seção pode ser chamada várias vezes — sempre reconstrua para manter limpo
    box.innerHTML = 'Carregando...';

    // Garante role
    await fetchMe();
    if (state.role !== 'admin') {
      box.innerHTML = `<div class="empty-state">Apenas administradores podem acessar o histórico completo de OS.</div>`;
      return;
    }

    // Monta UI
    box.innerHTML = '';
    buildToolbar(box);
    buildTable(box);
    buildFooter(box);

    // Busca e render
    try {
      await fetchOs();
      renderRows(box);
    } catch (err) {
      console.error('[Admin OS] erro:', err);
      box.innerHTML = `<div class="empty-state">Erro ao carregar OS: ${escapeHTML(err.message)}</div>`;
    }
  }

  // Exporta para uso externo (se quiser chamar manualmente)
  window.loadAdminOs = loadAdminOs;

  // Quando navegar para “Histórico completo de OS”, renderize
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-nav-target]');
    if (!btn) return;
    if (btn.getAttribute('data-nav-target') === 'listagem-os') {
      setTimeout(() => loadAdminOs().catch(()=>{}), 0);
    }
  });

  // Se a seção já estiver visível por algum motivo, renderize
  document.addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('tela-listagem-os');
    if (sec && !sec.classList.contains('hidden')) {
      loadAdminOs().catch(()=>{});
    }
  });

})();
