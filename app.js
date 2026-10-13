// ========================================================
// ANALISA RKO — APP.JS (gabungan semua modul)
// ========================================================

// ---------- 1. SUPABASE CLIENT ----------
const sb = supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);
window.sb = sb;

// ---------- 2. UTILS ----------
function toast(msg, type = 'info') {
  const colors = { info:'bg-slate-900', success:'bg-green-700', error:'bg-red-700' };
  const t = document.createElement('div');
  t.className = `fixed bottom-6 right-6 ${colors[type]} text-white px-4 py-2 rounded shadow-lg text-sm z-[100]`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function fmtNum(n, dec = 2) {
  if (n == null || isNaN(n)) return '';
  return Number(n).toLocaleString('id-ID', {
    minimumFractionDigits: dec, maximumFractionDigits: dec
  });
}
function fmtInt(n) { return fmtNum(n, 0); }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---------- 3. PERIODE GLOBAL ----------
const Period = {
  list: [], current: null,
  async load() {
    const { data, error } = await sb.from('periods')
      .select('*').order('tahun', { ascending: false }).order('bulan', { ascending: false });
    if (error) throw error;
    Period.list = data || [];
    const open = Period.list.find(p => p.status === 'open');
    Period.current = open || Period.list[0] || null;
    window.activePeriodId = Period.current?.id || null;
    window.activePeriod   = Period.current;
    Period.renderInfo();
    return Period.list;
  },
  label(id) {
    const p = Period.list.find(x => x.id === id);
    if (!p) return '';
    const m = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${m[p.bulan]} ${p.tahun}`;
  },
  renderInfo() {
    const el = document.getElementById('period-info');
    if (el && Period.current) {
      el.innerHTML = `Periode aktif: <b>${Period.label(Period.current.id)}</b>
        <span class="ml-1 text-xs px-2 py-0.5 rounded ${Period.current.status==='open'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-600'}">
          ${Period.current.status}
        </span>`;
    } else if (el) {
      el.innerHTML = '<span class="text-amber-600">Belum ada periode</span>';
    }
  }
};

// ---------- 4. AUTH ----------
const Auth = {
  async getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },
  async login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },
  async logout() { await sb.auth.signOut(); location.reload(); },
  showLogin() {
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('page-app').classList.add('hidden');
  },
  showApp(user) {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('page-app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user?.email || '';
  },
  bindLoginForm() {
    const form = document.getElementById('form-login');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl    = document.getElementById('login-error');
      errEl.textContent = 'Memproses...';
      try {
      await Auth.login(email, password);
      errEl.textContent = 'Berhasil! Memuat...';
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      errEl.textContent = 'Login gagal: ' + err.message;
    }
    });
    document.getElementById('btn-logout').onclick = () => {
      if (confirm('Logout dari aplikasi?')) Auth.logout();
    };
  }
};

// ---------- 5. ROUTER ----------
const Routes = {};
const Router = {
  register(path, handler) { Routes[path] = handler; },
  async navigate() {
    const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [path] = hash.split('/');
    const handler = Routes[path] || Routes['dashboard'];
    if (!handler) return;
    document.querySelectorAll('.nav').forEach(a => {
      a.classList.toggle('nav-active', a.getAttribute('href') === '#/' + path);
    });
    document.getElementById('page-title').textContent = handler.title || path;
    try {
      await handler.render();
    } catch (err) {
      document.getElementById('page-content').innerHTML =
        `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded">${esc(err.message)}</div>`;
    }
  },
  start() {
    window.addEventListener('hashchange', () => Router.navigate());
    if (!location.hash) location.hash = '#/dashboard';
    else Router.navigate();
  }
};

// ---------- 6. PASTE MODAL ----------
const PasteModal = (() => {
  function parseClipboard(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                       .replace(/\n+$/,'').split('\n');
    if (!lines.length) return [];
    const first = lines[0];
    let delim = '\t';
    if (!first.includes('\t')) {
      delim = (first.split(';').length > first.split(',').length) ? ';' : ',';
    }
    return lines.map(line => {
      const cells = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i+1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (c === delim && !inQ) { cells.push(cur); cur = ''; }
        else cur += c;
      }
      cells.push(cur);
      return cells.map(s => s.trim());
    });
  }

  function parseNumber(s) {
    if (s === '' || s == null) return null;
    let t = String(s).replace(/\s/g, '');
    const ld = t.lastIndexOf('.'), lc = t.lastIndexOf(',');
    if (ld > -1 && lc > -1) {
      t = (ld > lc) ? t.replace(/,/g,'') : t.replace(/\./g,'').replace(',', '.');
    } else if (lc > -1) {
      const after = t.length - lc - 1;
      t = (after === 3 && t.split(',').length > 1) ? t.replace(/,/g,'') : t.replace(',', '.');
    }
    const n = Number(t);
    return isNaN(n) ? null : n;
  }

  function parseDate(s) {
    if (!s) return null;
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (n > 20000 && n < 60000) {
        const d = new Date(Date.UTC(1899,11,30) + n*86400000);
        return d.toISOString().slice(0,10);
      }
    }
    return null;
  }

  async function open(config) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
          <div class="px-6 py-4 border-b flex items-start justify-between">
            <div>
              <h3 class="text-lg font-bold">${config.title}</h3>
              <p class="text-xs text-slate-500 mt-1">${config.hint || 'Copy sel dari Excel, lalu paste (Ctrl+V) di area di bawah.'}</p>
            </div>
            <button data-close class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
          </div>
          <div class="p-4 border-b bg-slate-50">
            <div class="text-xs mb-2 text-slate-600">
              Urutan kolom:
              ${config.columns.map(c => `<span class="inline-block bg-white border rounded px-2 py-0.5 mr-1 mb-1">${c.label}${c.required ? ' *' : ''}</span>`).join('')}
            </div>
            <textarea data-input rows="7" placeholder="Paste dari Excel di sini (Ctrl+V)..."
              class="w-full border rounded-lg p-3 font-mono text-xs"></textarea>
            <div class="mt-2 flex items-center gap-3">
              <button data-validate class="btn btn-primary">Validasi & Preview</button>
              <button data-clear class="text-slate-600 hover:text-slate-900 text-sm">Bersihkan</button>
              <span data-status class="text-sm text-slate-500"></span>
            </div>
          </div>
          <div data-preview class="flex-1 overflow-auto p-4 hidden"></div>
          <div class="px-6 py-3 border-t flex items-center justify-between">
            <div data-summary class="text-sm text-slate-600"></div>
            <div class="flex gap-2">
              <button data-close class="btn btn-gray">Batal</button>
              <button data-commit disabled class="btn btn-success">Simpan ke Database</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const $ = (s) => modal.querySelector(s);
      let validRows = [];

      modal.querySelectorAll('[data-close]').forEach(b =>
        b.onclick = () => { modal.remove(); resolve(null); });

      $('[data-input]').addEventListener('paste', () =>
        setTimeout(() => $('[data-validate]').click(), 60));

      $('[data-clear]').onclick = () => {
        $('[data-input]').value = '';
        $('[data-preview]').classList.add('hidden');
        $('[data-preview]').innerHTML = '';
        $('[data-commit]').disabled = true;
        $('[data-summary]').textContent = '';
        $('[data-status]').textContent = '';
        validRows = [];
      };

      $('[data-validate]').onclick = async () => {
        const text = $('[data-input]').value;
        if (!text.trim()) { $('[data-status]').textContent = 'Data kosong.'; return; }
        $('[data-status]').textContent = 'Memvalidasi...';
        $('[data-commit]').disabled = true;

        const raw = parseClipboard(text);
        const firstRow = raw[0] || [];
        const headerLike = firstRow.some((cell, i) => {
          const col = config.columns[i]; if (!col || !cell) return false;
          const w = col.label.toLowerCase().split(' ')[0];
          return cell.toLowerCase().includes(w);
        });
        const dataRows = headerLike ? raw.slice(1) : raw;

        let result;
        try {
          result = await config.validate(dataRows, { parseNumber, parseDate });
        } catch (e) {
          $('[data-status]').textContent = 'Error validasi: ' + e.message;
          return;
        }

        validRows = result.rows;
        renderPreview(result, config);
        $('[data-status]').textContent = `${dataRows.length} baris diproses`;
        $('[data-commit]').disabled = validRows.length === 0;
        $('[data-summary]').innerHTML =
          `<span class="text-green-700 font-medium">${validRows.length} valid</span>` +
          (result.errors.length
            ? ` · <span class="text-red-600 font-medium">${result.errors.length} error</span>`
            : '');
      };

      $('[data-commit]').onclick = async () => {
        if (!validRows.length) return;
        $('[data-commit]').disabled = true;
        $('[data-commit]').textContent = 'Menyimpan...';
        try {
          await config.onCommit(validRows);
          modal.remove();
          resolve(validRows.length);
        } catch (err) {
          alert('Gagal menyimpan: ' + err.message);
          $('[data-commit]').disabled = false;
          $('[data-commit]').textContent = 'Simpan ke Database';
        }
      };
    });
  }

  function renderPreview(result, config) {
    const p = document.querySelector('[data-preview]');
    p.classList.remove('hidden');
    const cols = config.columns;
    let html = '<table class="w-full text-xs border-collapse"><thead class="bg-slate-100 sticky top-0">';
    html += '<tr><th class="border px-2 py-1">#</th><th class="border px-2 py-1">Status</th>';
    cols.forEach(c => html += `<th class="border px-2 py-1 text-left">${c.label}</th>`);
    html += '</tr></thead><tbody>';

    const rows = [
      ...result.rows.map(r => ({ ...r, __ok:true })),
      ...result.errors.map(e => ({ ...e.raw, __ok:false, __err:e.msg, __rowNum:e.rowNum }))
    ].sort((a,b) => (a.__rowNum||9999) - (b.__rowNum||9999));

    rows.forEach((r, idx) => {
      html += `<tr class="${r.__ok ? '' : 'bg-red-50'}">`;
      html += `<td class="border px-2 py-1 text-center">${r.__rowNum || idx+1}</td>`;
      html += `<td class="border px-2 py-1 text-center">${r.__ok
        ? '<span class="text-green-700">&#10003;</span>'
        : `<span class="text-red-600" title="${r.__err}">&#10007; ${r.__err}</span>`}</td>`;
      cols.forEach(c => {
        const v = r[c.key];
        html += `<td class="border px-2 py-1">${v == null ? '' : esc(v)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    p.innerHTML = html;
  }

  async function bulkUpsert(table, rows, conflictCols) {
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await sb.from(table).upsert(slice, {
        onConflict: conflictCols.join(','), ignoreDuplicates: false
      });
      if (error) throw error;
    }
  }

  async function bulkInsert(table, rows) {
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await sb.from(table).insert(slice);
      if (error) throw error;
    }
  }

  return { open, bulkUpsert, bulkInsert, parseNumber, parseDate, parseClipboard };
})();

// ---------- 7. TRX PAGE ENGINE ----------
const TrxPage = (() => {
  const _cache = { items:null, units:null };

  async function loadItems() {
    if (_cache.items) return _cache.items;
    const { data, error } = await sb.from('items')
      .select('id,kode,nama,satuan,kategori')
      .limit(50000);
    if (error) throw error;
    _cache.items = data || [];
    return _cache.items;
  }
  async function loadUnits() {
    if (_cache.units) return _cache.units;
    const { data } = await sb.from('units').select('id,kode,nama,tipe,kategori');
    _cache.units = data || [];
    return _cache.units;
  }
  function mapByKode(arr) {
    const m = new Map(); arr.forEach(x => m.set(x.kode.toUpperCase(), x)); return m;
  }
  function clearCache() { _cache.items = null; _cache.units = null; }

  async function render(cfg) {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm text-slate-600">
          Periode: <span class="font-medium">${Period.label(cfg.periodId) || '-'}</span>
        </div>
        <div class="flex gap-2">
          <button id="btn-paste" class="btn btn-indigo">&#128203; Paste dari Excel</button>
          <button id="btn-add" class="btn btn-primary">+ Tambah Baris</button>
          <button id="btn-export" class="btn btn-success">&#11015; Export Excel</button>
        </div>
      </div>
    `;

    if (!cfg.periodId) {
      document.getElementById('trx-table').innerHTML =
        '<div class="p-4 text-amber-700 bg-amber-50">Belum ada periode aktif. Buat periode di menu <a class="underline" href="#/periode">Periode</a>.</div>';
      return;
    }

    await refresh(cfg);

    document.getElementById('btn-paste').onclick = async () => {
      const n = await PasteModal.open(buildPasteConfig(cfg));
      if (n) { toast(`${n} baris tersimpan`, 'success'); await refresh(cfg); }
    };
    document.getElementById('btn-add').onclick = () => addRow(cfg);
    document.getElementById('btn-export').onclick = () => exportData(cfg);
  }

  function buildPasteConfig(cfg) {
    return {
      title: `Paste Data — ${cfg.title}`,
      columns: cfg.columns.filter(c => c.key !== 'id').map(c => ({
        key: c.key, label: c.label || c.key, required: !!c.required
      })),
      validate: async (rows, { parseNumber, parseDate }) => {
        const [items, units] = await Promise.all([loadItems(), loadUnits()]);
        const iMap = mapByKode(items), uMap = mapByKode(units);
        const out = { rows: [], errors: [] };
        rows.forEach((cells, i) => {
          const rowNum = i + 1;
          const raw = {};
          cfg.columns.forEach((c, idx) => { raw[c.key] = cells[idx] ?? ''; });
          const parsed = { period_id: cfg.periodId };
          let err = null;

          for (const c of cfg.columns) {
            const v = raw[c.key];
            if (c.type === 'item_code') {
              const it = iMap.get(String(v).toUpperCase());
              if (!it) { err = err || `Kode item "${v}" tidak ditemukan`; break; }
              parsed.item_id = it.id; parsed._item = it;
            } else if (c.type === 'unit_code') {
              const un = uMap.get(String(v).toUpperCase());
              if (!un) { err = err || `Kode unit "${v}" tidak ditemukan`; break; }
              const idKey = c.idKey || 'unit_id';
              parsed[idKey] = un.id;
              parsed['_'+c.key] = un;
            } else if (c.type === 'number') {
              const n = parseNumber(v);
              parsed[c.key] = (n == null ? (c.default ?? 0) : n);
              if (c.required && n == null) { err = err || `${c.label} wajib`; break; }
            } else if (c.type === 'date') {
              const d = parseDate(v);
              if (!d && c.required) { err = err || `${c.label} tidak valid`; break; }
              parsed[c.key] = d;
            } else {
              parsed[c.key] = v === '' ? null : v;
            }
          }
          if (!err && cfg.postValidate) err = cfg.postValidate(parsed, { iMap, uMap });
          if (err) out.errors.push({ rowNum, raw, msg: err });
          else out.rows.push(parsed);
        });
        return out;
      },
      onCommit: async (rows) => {
        const TABLE_FIELDS = {
          rko:         ['period_id','item_id','qty_rko','harga_rko','ket'],
          penerimaan:  ['period_id','item_id','tanggal','no_faktur','supplier','qty','harga','jenis','ket'],
          mutasi:      ['period_id','item_id','unit_asal_id','unit_tujuan_id','qty','harga','jenis','tanggal','no_dokumen','ket'],
          pemakaian:   ['period_id','item_id','unit_id','qty','ket'],
          penyesuaian: ['period_id','item_id','unit_id','qty','alasan'],
        };
        const fields = TABLE_FIELDS[cfg.table];
        const clean = rows.map(r => {
          const o = {};
          if (fields) {
            fields.forEach(f => { if (r[f] !== undefined) o[f] = r[f]; });
          } else {
            Object.assign(o, r);
            Object.keys(o).forEach(k => { if (k.startsWith('_')) delete o[k]; });
          }
          Object.assign(o, cfg.defaults || {});
          return o;
        });
        if (cfg.upsert) await PasteModal.bulkUpsert(cfg.table, clean, cfg.upsert);
        else            await PasteModal.bulkInsert(cfg.table, clean);
      }
    };
  }

  async function refresh(cfg) {
    const div = document.getElementById('trx-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    const { data, error } = await cfg.query(cfg.periodId);
    if (error) { div.innerHTML = `<div class="p-4 text-red-600 text-sm">${error.message}</div>`; return; }
    cfg._data = data || [];

    const cols = cfg.columns;
    let html = '<table class="w-full text-xs"><thead class="text-left">';
    html += '<tr><th class="px-2 py-2 w-10">#</th>';
    cols.forEach(c => html += `<th class="px-2 py-2">${c.label}</th>`);
    html += '<th class="px-2 py-2 w-16">Aksi</th></tr></thead><tbody>';

    cfg._data.forEach((r, i) => {
      html += `<tr class="border-t hover:bg-slate-50"><td class="px-2 py-1 text-slate-400">${i+1}</td>`;
      cols.forEach(c => {
        const v = r[c.key];
        html += `<td class="px-2 py-1">${v == null ? '' : esc(v)}</td>`;
      });
      html += `<td class="px-2 py-1">
        <button data-del="${r.id}" class="text-red-600 hover:underline">hapus</button>
      </td></tr>`;
    });
    if (!cfg._data.length) {
      html += `<tr><td colspan="${cols.length+2}" class="px-2 py-8 text-center text-slate-400">
        Belum ada data. Klik "Paste dari Excel" untuk mulai.
      </td></tr>`;
    }
    html += '</tbody></table>';
    div.innerHTML = html;

    div.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Hapus baris ini?')) return;
      const { error } = await sb.from(cfg.table).delete().eq('id', b.dataset.del);
      if (error) return alert(error.message);
      await refresh(cfg);
    });
  }

  async function addRow(cfg) {
    const { error } = await sb.from(cfg.table)
      .insert([{ period_id: cfg.periodId, ...cfg.defaults }]);
    if (error) return alert(error.message);
    await refresh(cfg);
  }

  function exportData(cfg) {
    if (!cfg._data?.length) return alert('Tidak ada data untuk diexport.');
    const rows = cfg._data.map(r => {
      const o = {};
      cfg.columns.forEach(c => { o[c.label] = r[c.key]; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.title.slice(0, 30));
    XLSX.writeFile(wb, `${cfg.table}-${Period.label(cfg.periodId) || ''}.xlsx`);
  }

  return { render, loadItems, loadUnits, mapByKode, clearCache };
})();

// ========================================================
// HALAMAN-HALAMAN (PAGES)
// ========================================================

// ---------- PAGE: DASHBOARD ----------
async function pageDashboard() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow p-4">
        <div class="text-xs text-slate-500">Total Item Aktif</div>
        <div id="card-items" class="text-2xl font-bold text-blue-800 mt-1">-</div>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <div class="text-xs text-slate-500">Nilai Persediaan (Rp)</div>
        <div id="card-nilai" class="text-2xl font-bold text-green-700 mt-1">-</div>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <div class="text-xs text-slate-500">Item Stok Kritis</div>
        <div id="card-kritis" class="text-2xl font-bold text-red-600 mt-1">-</div>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <div class="text-xs text-slate-500">Capaian RKO Bulan Ini</div>
        <div id="card-rko" class="text-2xl font-bold text-indigo-700 mt-1">-</div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl shadow p-4">
        <div class="font-semibold text-sm text-slate-700 mb-2">Top 10 Pemakaian Bulan Ini</div>
        <canvas id="chart-top" height="220"></canvas>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <div class="font-semibold text-sm text-slate-700 mb-2">Tren Capaian RKO 6 Bulan</div>
        <canvas id="chart-tren" height="220"></canvas>
      </div>
    </div>
  `;

  const pid = window.activePeriodId;
  if (!pid) return;

  const { count: itemCount } = await sb.from('items')
    .select('id', { count:'exact', head:true }).eq('aktif', true);
  document.getElementById('card-items').textContent = itemCount ?? 0;

  const { data: stokData } = await sb.from('v_stok')
    .select('item_id,item_kode,item_nama,satuan,harga_default,min_stok,stok_akhir,unit_tipe')
    .eq('period_id', pid);
  const rows = stokData || [];
  let nilai = 0; const kritisSet = new Set();
  rows.forEach(r => {
    nilai += (r.stok_akhir || 0) * (r.harga_default || 0);
    if (r.unit_tipe === 'gudang_farmasi' && r.stok_akhir < (r.min_stok || 0)) kritisSet.add(r.item_id);
  });
  document.getElementById('card-nilai').textContent = 'Rp ' + fmtInt(nilai);
  document.getElementById('card-kritis').textContent = kritisSet.size;

  const { data: rkoData } = await sb.from('v_analisa_rko')
    .select('capaian_persen').eq('period_id', pid);
  const totalCapaian = (rkoData || []).length
    ? (rkoData.reduce((s, r) => s + Number(r.capaian_persen || 0), 0) / rkoData.length)
    : 0;
  document.getElementById('card-rko').textContent = totalCapaian.toFixed(1) + '%';

  const { data: topData } = await sb.from('pemakaian')
    .select('qty, items(nama)').eq('period_id', pid);
  const aggTop = {};
  (topData || []).forEach(r => {
    const n = r.items?.nama || '(?)';
    aggTop[n] = (aggTop[n] || 0) + Number(r.qty || 0);
  });
  const top10 = Object.entries(aggTop).sort((a,b) => b[1]-a[1]).slice(0,10);

  new Chart(document.getElementById('chart-top'), {
    type: 'bar',
    data: {
      labels: top10.map(x => x[0].length > 25 ? x[0].slice(0,25)+'…' : x[0]),
      datasets: [{ label:'Qty', data: top10.map(x => x[1]), backgroundColor:'#1d4ed8' }]
    },
    options: { indexAxis:'y', plugins:{ legend:{ display:false } }, maintainAspectRatio:false }
  });

  const { data: allRko } = await sb.from('v_analisa_rko')
    .select('tahun,bulan,capaian_persen')
    .order('tahun', { ascending:true }).order('bulan', { ascending:true });
  const aggTren = {};
  (allRko || []).forEach(r => {
    const key = `${r.tahun}-${String(r.bulan).padStart(2,'0')}`;
    if (!aggTren[key]) aggTren[key] = { sum:0, n:0 };
    aggTren[key].sum += Number(r.capaian_persen || 0);
    aggTren[key].n   += 1;
  });
  const keys = Object.keys(aggTren).sort().slice(-6);

  new Chart(document.getElementById('chart-tren'), {
    type: 'line',
    data: {
      labels: keys,
      datasets: [{
        label:'Capaian %',
        data: keys.map(k => (aggTren[k].sum / aggTren[k].n).toFixed(2)),
        borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,.1)', fill:true, tension:.3
      }]
    },
    options: { plugins:{ legend:{ display:false } }, maintainAspectRatio:false }
  });
}

// ---------- PAGE: STOK ----------
async function pageStok() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="text-xs text-slate-500">Unit</label>
          <select id="f-unit" class="w-full border rounded px-2 py-1 text-sm"></select>
        </div>
        <div>
          <label class="text-xs text-slate-500">Kategori Item</label>
          <select id="i-kat" class="w-full border rounded px-2 py-1 text-sm">
  <option value="">Semua Grup</option>
  <option value="Obat">Obat</option>
  <option value="BMHP">BMHP</option>
  <option value="B3">B3</option>
  <option value="Nutrisi">Nutrisi Enteral</option>
  <option value="Program">Program</option>
</select>
        </div>
        <div>
          <label class="text-xs text-slate-500">Cari (kode/nama)</label>
          <input id="f-q" class="w-full border rounded px-2 py-1 text-sm" placeholder="ketik...">
        </div>
        <div class="flex items-end gap-2">
          <button id="f-apply" class="btn btn-primary flex-1">Terapkan</button>
          <button id="f-export" class="btn btn-success">Excel</button>
        </div>
      </div>
    </div>
    <div id="stok-table" class="bg-white rounded-xl shadow overflow-auto"></div>
  `;

  const units = await TrxPage.loadUnits();
  const selUnit = document.getElementById('f-unit');
  selUnit.innerHTML = '<option value="">Semua unit</option>' +
    units.map(u => `<option value="${u.id}">${esc(u.kode)} — ${esc(u.nama)}</option>`).join('');

  let currentData = [];

  async function load() {
    const div = document.getElementById('stok-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    let q = sb.from('v_stok').select('*').eq('period_id', window.activePeriodId);
    const uid = selUnit.value;
    const kat = document.getElementById('f-kat').value;
    const key = document.getElementById('f-q').value.trim();
    if (uid) q = q.eq('unit_id', uid);
    if (kat) q = q.eq('item_kategori', kat);
    if (key) q = q.or(`item_kode.ilike.%${key}%,item_nama.ilike.%${key}%`);
    const { data, error } = await q.order('item_nama').limit(2000);
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    currentData = data || [];

    let html = '<table class="w-full text-xs"><thead class="text-left"><tr>';
    ['Unit','Kode','Nama Item','Satuan','Awal','Masuk','Keluar','Pakai','Penyesuaian','Akhir','Min','Status']
      .forEach(h => html += `<th class="px-2 py-2">${h}</th>`);
    html += '</tr></thead><tbody>';
    currentData.forEach(r => {
      const kritis = Number(r.stok_akhir) < Number(r.min_stok || 0);
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1">${esc(r.unit_kode)}</td>
        <td class="px-2 py-1">${esc(r.item_kode)}</td>
        <td class="px-2 py-1">${esc(r.item_nama)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.stok_awal,0)}</td>
        <td class="px-2 py-1 text-right text-green-700">${fmtNum((r.total_penerimaan||0)+(r.total_mutasi_masuk||0),0)}</td>
        <td class="px-2 py-1 text-right text-orange-600">${fmtNum(r.total_mutasi_keluar,0)}</td>
        <td class="px-2 py-1 text-right text-red-600">${fmtNum(r.total_pemakaian,0)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.total_penyesuaian,0)}</td>
        <td class="px-2 py-1 text-right font-semibold">${fmtNum(r.stok_akhir,0)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.min_stok,0)}</td>
        <td class="px-2 py-1 text-center">${kritis
          ? '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">KRITIS</span>'
          : '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">OK</span>'}</td>
      </tr>`;
    });
    if (!currentData.length) html += `<tr><td colspan="12" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>`;
    html += '</tbody></table>';
    div.innerHTML = html;
  }

  document.getElementById('f-apply').onclick = load;
  document.getElementById('f-export').onclick = () => {
    if (!currentData.length) return alert('Tidak ada data.');
    const ws = XLSX.utils.json_to_sheet(currentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok');
    XLSX.writeFile(wb, `stok-${Period.label(window.activePeriodId)}.xlsx`);
  };
  document.getElementById('f-q').addEventListener('keydown', e => { if (e.key === 'Enter') load(); });

  await load();
}

// ---------- PAGE: ANALISA ----------
async function pageAnalisa() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow mb-4">
      <div class="flex border-b overflow-auto">
        <button data-tab="rko"   class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Capaian RKO</button>
        <button data-tab="cover" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Stock Cover</button>
        <button data-tab="dead"  class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Dead Stock</button>
        <button data-tab="nilai" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Nilai Persediaan</button>
      </div>
      <div id="tab-body" class="p-4"></div>
    </div>
  `;

  const pid = window.activePeriodId;
  const body = document.getElementById('tab-body');

  function setActive(name) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle('bg-blue-50', on);
      b.classList.toggle('text-blue-800', on);
      b.classList.toggle('border-b-2', on);
      b.classList.toggle('border-blue-700', on);
    });
  }

  async function renderTab(name) {
    setActive(name);
    body.innerHTML = '<div class="text-slate-500 text-sm">Memuat...</div>';

    if (name === 'rko') {
      const { data } = await sb.from('v_analisa_rko').select('*').eq('period_id', pid)
        .order('capaian_persen', { ascending:true }).limit(3000);
      body.innerHTML = tableHTML(data || [], [
        ['item_kode','Kode'], ['item_nama','Nama Item'], ['satuan','Satuan'],
        ['qty_rko','Qty RKO'], ['qty_realisasi','Realisasi'],
        ['capaian_persen','Capaian %'], ['harga_rko','Harga RKO'],
        ['harga_realisasi_avg','Harga Real Avg'],
        ['nilai_rko','Nilai RKO'], ['nilai_realisasi','Nilai Realisasi'],
      ], 'rko');
    }
    else if (name === 'cover') {
      const { data } = await sb.from('v_stok').select('*')
        .eq('period_id', pid).eq('unit_tipe','gudang_farmasi');
      const rows = (data || []).map(r => {
        const pakai = Number(r.total_pemakaian || 0) || 1;
        return { ...r, cover_bulan: (Number(r.stok_akhir || 0) / pakai).toFixed(2) };
      }).sort((a,b) => Number(a.cover_bulan) - Number(b.cover_bulan));
      body.innerHTML = tableHTML(rows, [
        ['item_kode','Kode'], ['item_nama','Nama Item'], ['satuan','Satuan'],
        ['stok_akhir','Stok Akhir'], ['total_pemakaian','Pemakaian'],
        ['cover_bulan','Cover (bulan)'],
      ], 'stock-cover');
    }
    else if (name === 'dead') {
      const { data } = await sb.from('v_stok').select('*')
        .eq('period_id', pid).gt('stok_akhir', 0).eq('total_pemakaian', 0);
      body.innerHTML = tableHTML(data || [], [
        ['unit_kode','Unit'], ['item_kode','Kode'], ['item_nama','Nama Item'],
        ['satuan','Satuan'], ['stok_akhir','Stok Akhir'],
        ['harga_default','Harga'], ['total_pemakaian','Pemakaian'],
      ], 'dead-stock');
    }
    else if (name === 'nilai') {
      const { data } = await sb.from('v_stok').select('*').eq('period_id', pid);
      const agg = {};
      (data || []).forEach(r => {
        const v = Number(r.stok_akhir || 0) * Number(r.harga_default || 0);
        const key = r.item_kode + '|' + r.item_nama + '|' + r.satuan;
        if (!agg[key]) agg[key] = { item_kode:r.item_kode, item_nama:r.item_nama, satuan:r.satuan, qty:0, nilai:0 };
        agg[key].qty += Number(r.stok_akhir || 0);
        agg[key].nilai += v;
      });
      const rows = Object.values(agg).sort((a,b) => b.nilai - a.nilai);
      body.innerHTML = tableHTML(rows, [
        ['item_kode','Kode'], ['item_nama','Nama Item'], ['satuan','Satuan'],
        ['qty','Total Qty'], ['nilai','Nilai (Rp)'],
      ], 'nilai-persediaan');
    }
  }

  function tableHTML(rows, cols, tag) {
    if (!rows.length) return '<div class="text-slate-400 text-sm">Tidak ada data.</div>';
    let html = `<div class="mb-2 flex justify-end">
      <button class="btn btn-success" data-export="${tag}">&#11015; Export Excel</button>
    </div>`;
    html += '<div class="overflow-auto"><table class="w-full text-xs"><thead><tr>';
    cols.forEach(c => html += `<th class="px-2 py-2 text-left">${c[1]}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(r => {
      html += '<tr class="border-t hover:bg-slate-50">';
      cols.forEach(c => {
        const v = r[c[0]];
        const isNum = typeof v === 'number' || (v !== '' && v !== null && !isNaN(v) && typeof v !== 'boolean');
        html += `<td class="px-2 py-1 ${isNum ? 'text-right' : ''}">${v == null ? '' : (isNum ? fmtNum(v) : esc(v))}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    setTimeout(() => {
      const btn = document.querySelector(`[data-export="${tag}"]`);
      if (btn) btn.onclick = () => {
        const obj = rows.map(r => {
          const o = {}; cols.forEach(c => o[c[1]] = r[c[0]]); return o;
        });
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, tag.slice(0,30));
        XLSX.writeFile(wb, `${tag}-${Period.label(pid) || ''}.xlsx`);
      };
    }, 0);

    return html;
  }

  document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => renderTab(b.dataset.tab));
  await renderTab('rko');
}

// ---------- PAGE: MASTER ITEM ----------
async function pageMasterItem() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs text-slate-500">Cari (kode/nama)</label>
          <input id="i-q" class="w-full border rounded px-2 py-1 text-sm" placeholder="ketik...">
        </div>
        <div>
          <label class="text-xs text-slate-500">Kategori</label>
          <select id="i-kat" class="w-full border rounded px-2 py-1 text-sm">
  <option value="">Semua Grup</option>
  <option value="Obat">Obat</option>
  <option value="BMHP">BMHP</option>
  <option value="B3">B3</option>
  <option value="Nutrisi">Nutrisi Enteral</option>
  <option value="Program">Program</option>
</select>
        </div>
        <div class="flex items-end">
          <button id="i-search" class="btn btn-primary w-full">Cari</button>
        </div>
        <div class="flex items-end gap-2">
          <button id="i-paste" class="btn btn-indigo flex-1">Paste Excel</button>
          <button id="i-export" class="btn btn-success flex-1">Export</button>
        </div>
      </div>
    </div>
      <div id="i-table"></div>
      <div id="i-pager" class="p-3 flex items-center justify-between border-t text-sm"></div>
    </div>
  `;

  let page = 1, pageSize = 50, total = 0;

  async function load() {
    const div = document.getElementById('i-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    const q = document.getElementById('i-q').value.trim();
    const kat = document.getElementById('i-kat').value;
    const from = (page-1) * pageSize;
    const to = from + pageSize - 1;

    let query = sb.from('items').select('*', { count:'exact' }).range(from, to).order('nama');
    if (q) query = query.or(`kode.ilike.%${q}%,nama.ilike.%${q}%`);
    if (kat) query = query.eq('kategori', kat);
    const { data, error, count } = await query;
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    total = count || 0;

    let html = '<table class="w-full text-xs"><thead><tr>';
    ['Kode','Nama','Kategori','Satuan','Harga','Min Stok','Aktif','Aksi'].forEach(h =>
      html += `<th class="px-2 py-2 text-left">${h}</th>`);
    html += '</tr></thead><tbody>';
    (data||[]).forEach(r => {
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1 font-mono">${esc(r.kode)}</td>
        <td class="px-2 py-1">${esc(r.nama)}</td>
        <td class="px-2 py-1">${esc(r.kategori)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.harga_default)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.min_stok,0)}</td>
        <td class="px-2 py-1 text-center">${r.aktif ? '✓' : '×'}</td>
        <td class="px-2 py-1"><button data-del="${r.id}" class="text-red-600 hover:underline">hapus</button></td>
      </tr>`;
    });
    if (!data?.length) html += '<tr><td colspan="8" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>';
    html += '</tbody></table>';
    div.innerHTML = html;

    div.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Hapus item ini?')) return;
      const { error } = await sb.from('items').delete().eq('id', b.dataset.del);
      if (error) return alert(error.message);
      load();
    });

    const totalPage = Math.max(1, Math.ceil(total / pageSize));
    document.getElementById('i-pager').innerHTML = `
      <span>Total: <b>${total}</b> item · Halaman ${page}/${totalPage}</span>
      <div class="flex gap-2">
        <button class="btn btn-gray" ${page===1?'disabled':''} id="pg-prev">&larr; Prev</button>
        <button class="btn btn-gray" ${page>=totalPage?'disabled':''} id="pg-next">Next &rarr;</button>
      </div>`;
    document.getElementById('pg-prev').onclick = () => { if (page>1) { page--; load(); } };
    document.getElementById('pg-next').onclick = () => { if (page<totalPage) { page++; load(); } };
  }

  document.getElementById('i-search').onclick = () => { page = 1; load(); };
  document.getElementById('i-q').addEventListener('keydown', e => { if (e.key==='Enter'){ page=1; load(); }});
  document.getElementById('i-kat').onchange = () => { page = 1; load(); };

  document.getElementById('i-paste').onclick = async () => {
    const n = await PasteModal.open({
      title: 'Paste Master Item (Obat & BMHP)',
      hint: 'Kolom: kode, nama, kategori, satuan, harga_default, min_stok. Baris pertama (header) otomatis di-skip.',
      columns: [
        { key:'kode',          label:'Kode',     required:true },
        { key:'nama',          label:'Nama',     required:true },
        { key:'kategori',      label:'Kategori', required:true },
        { key:'satuan',        label:'Satuan',   required:true },
        { key:'harga_default', label:'Harga' },
        { key:'min_stok',      label:'Min Stok' },
      ],
      validate: async (rows, { parseNumber }) => {
        const out = { rows: [], errors: [] };
        const seen = new Set();
        rows.forEach((cells, i) => {
          const rowNum = i + 1;
          const raw = {
            kode: cells[0] || '', nama: cells[1] || '', kategori: cells[2] || '',
            satuan: cells[3] || '', harga_default: cells[4] || '', min_stok: cells[5] || ''
          };
          let err = null;
          const kode = String(raw.kode).trim().toUpperCase();
          const katRaw = String(raw.kategori || '').trim().toUpperCase().replace(/\s+/g, ' ');

          // --- Daftar kategori baku ---
          const KATEGORI_VALID = [
            'B3', 'BMHP', 'NUTRISI ENTERAL', 'OBAT',
            'PROGRAM', 'PROGRAM BKKBN', 'PROGRAM COVID', 'PROGRAM HIV',
            'PROGRAM IMUNISASI', 'PROGRAM MALARIA', 'PROGRAM RABIES',
            'PROGRAM STUNTING', 'PROGRAM TB',
          ];

          // --- Normalisasi alias ---
          const ALIAS = {
            'BHP': 'BMHP',
            'ALKES': 'BMHP',
            'NUTRISI': 'NUTRISI ENTERAL',
            'NUTRISI ENTERAL': 'NUTRISI ENTERAL',
            'PROGRAM IMUNISASI ANAK': 'PROGRAM IMUNISASI',
            'IMUNISASI': 'PROGRAM IMUNISASI',
            'TB': 'PROGRAM TB',
            'TB PARU': 'PROGRAM TB',
          };
          let kategori = ALIAS[katRaw] || katRaw;

          // --- Tentukan grup otomatis ---
          let grup = null;
          if (kategori === 'OBAT') grup = 'Obat';
          else if (kategori === 'BMHP') grup = 'BMHP';
          else if (kategori === 'B3') grup = 'B3';
          else if (kategori === 'NUTRISI ENTERAL') grup = 'Nutrisi';
          else if (kategori.startsWith('PROGRAM')) grup = 'Program';

          if (!kode) err = 'Kode wajib';
          else if (seen.has(kode)) err = 'Kode duplikat di paste';
          else if (!KATEGORI_VALID.includes(kategori))
            err = `Kategori "${raw.kategori}" tidak dikenali`;
          else if (!grup) err = `Grup kategori "${kategori}" tidak terdeteksi`;
          else if (!raw.nama) err = 'Nama wajib';
          else if (!raw.satuan) err = 'Satuan wajib';
          if (err) { out.errors.push({ rowNum, raw, msg: err }); return; }
          seen.add(kode);
          out.rows.push({
            kode,
            nama: String(raw.nama).trim(),
            kategori,
            grup,
            satuan: String(raw.satuan).trim(),
            harga_default: parseNumber(raw.harga_default) ?? 0,
            min_stok: parseNumber(raw.min_stok) ?? 0,
            aktif: true,
          });
        });
        return out;
      },
      onCommit: async (rows) => {
        await PasteModal.bulkUpsert('items', rows, ['kode']);
        TrxPage.clearCache();
      }
    });
    if (n) { toast(`${n} item tersimpan`, 'success'); page = 1; load(); }
  };

  document.getElementById('i-export').onclick = async () => {
    const { data } = await sb.from('items').select('*').order('nama').limit(10000);
    if (!data?.length) return alert('Tidak ada data.');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'master-items.xlsx');
  };

  await load();
}

// ---------- PAGE: MASTER UNIT ----------
async function pageMasterUnit() {
  const el = document.getElementById('page-content');
  el.innerHTML = `<div id="u-table" class="table-scroll">`;

  const { data, error } = await sb.from('units').select('*').order('kategori').order('kode');
  if (error) { document.getElementById('u-table').innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }

  let html = '<table class="w-full text-xs"><thead><tr>';
  ['Kode','Nama','Tipe','Kategori','Konsumsi','Aktif','Aksi'].forEach(h =>
    html += `<th class="px-2 py-2 text-left">${h}</th>`);
  html += '</tr></thead><tbody>';
  (data||[]).forEach(r => {
    html += `<tr class="border-t hover:bg-slate-50">
      <td class="px-2 py-1 font-mono">${esc(r.kode)}</td>
      <td class="px-2 py-1">${esc(r.nama)}</td>
      <td class="px-2 py-1">${esc(r.tipe)}</td>
      <td class="px-2 py-1">${esc(r.kategori)}</td>
      <td class="px-2 py-1 text-center">${r.konsumsi_stok ? '✓' : '×'}</td>
      <td class="px-2 py-1 text-center">${r.aktif ? '✓' : '×'}</td>
      <td class="px-2 py-1">
        <button data-toggle="${r.id}" data-active="${r.aktif}" class="text-blue-700 hover:underline">
          ${r.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('u-table').innerHTML = html;

  document.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
    const { error } = await sb.from('units')
      .update({ aktif: b.dataset.active !== 'true' })
      .eq('id', b.dataset.toggle);
    if (error) return alert(error.message);
    TrxPage.clearCache();
    pageMasterUnit();
  });
}

// ---------- PAGE: MASTER PERIODE ----------
async function pageMasterPeriode() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3 flex items-end gap-2 flex-wrap">
      <div>
        <label class="text-xs text-slate-500">Tahun</label>
        <input id="p-tahun" type="number" class="border rounded px-2 py-1 text-sm w-24"
               value="${new Date().getFullYear()}">
      </div>
      <div>
        <label class="text-xs text-slate-500">Bulan</label>
        <select id="p-bulan" class="border rounded px-2 py-1 text-sm">
          <option value="">— pilih —</option>
          ${['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
            .map((n,i) => i ? `<option value="${i}">${n}</option>` : '').join('')}
        </select>
      </div>
      <button id="p-add" class="btn btn-primary">+ Buat Periode</button>
    </div>
    <div class="bg-white rounded-xl shadow overflow-auto"><div id="p-table"></div></div>
  `;

  async function load() {
    await Period.load();
    const div = document.getElementById('p-table');
    let html = '<table class="w-full text-xs"><thead><tr>';
    ['Tahun','Bulan','Status','Closed At','Aksi'].forEach(h =>
      html += `<th class="px-2 py-2 text-left">${h}</th>`);
    html += '</tr></thead><tbody>';
    Period.list.forEach(p => {
      const isOpen = p.status === 'open';
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1">${p.tahun}</td>
        <td class="px-2 py-1">${p.bulan}</td>
        <td class="px-2 py-1">
          <span class="px-2 py-0.5 rounded text-[10px] ${isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}">
            ${p.status}
          </span>
        </td>
        <td class="px-2 py-1">${p.closed_at ? new Date(p.closed_at).toLocaleString('id-ID') : '-'}</td>
        <td class="px-2 py-1">
          ${isOpen
            ? `<button data-close="${p.id}" class="text-red-700 hover:underline">Tutup Periode</button>`
            : `<button data-reopen="${p.id}" class="text-blue-700 hover:underline">Buka Kembali</button>`}
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    div.innerHTML = html;

    div.querySelectorAll('[data-close]').forEach(b => b.onclick = async () => {
      if (!confirm('Tutup periode? Stok akhir akan menjadi stok awal periode berikutnya.')) return;
      const { error } = await sb.rpc('fn_close_period', { p_period_id: Number(b.dataset.close) });
      if (error) return alert(error.message);
      toast('Periode ditutup', 'success');
      load();
    });
    div.querySelectorAll('[data-reopen]').forEach(b => b.onclick = async () => {
      if (!confirm('Buka kembali periode ini? Saldo awal periode berikutnya akan dihapus.')) return;
      const { error } = await sb.rpc('fn_reopen_period', { p_period_id: Number(b.dataset.reopen) });
      if (error) return alert(error.message);
      toast('Periode dibuka kembali', 'success');
      load();
    });
  }

  document.getElementById('p-add').onclick = async () => {
    const tahun = Number(document.getElementById('p-tahun').value);
    const bulan = Number(document.getElementById('p-bulan').value);
    if (!tahun || !bulan) return alert('Isi tahun & bulan');
    const { error } = await sb.from('periods').insert([{ tahun, bulan }]);
    if (error) return alert(error.message);
    toast('Periode dibuat', 'success');
    load();
  };

  await load();
}

// ---------- PAGE: TRX RKO ----------
async function pageRKO(periodId) {
  await TrxPage.render({
    periodId,
    title: 'RKO (Rencana Kebutuhan Obat & BMHP)',
    table: 'rko',
    upsert: ['period_id','item_id'],
    defaults: {},
    query: async (pid) => {
      const { data, error } = await sb.from('rko')
        .select('id,qty_rko,harga_rko,ket,item_id, items(kode,nama,satuan)')
        .eq('period_id', pid).order('id', { ascending:false }).limit(3000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id, item_kode: r.items?.kode, item_nama: r.items?.nama,
          satuan: r.items?.satuan, qty_rko: r.qty_rko, harga_rko: r.harga_rko, ket: r.ket,
        }))
      };
    },
    columns: [
      { key:'item_kode', label:'Kode Item', type:'item_code', required:true },
      { key:'item_nama', label:'Nama Item' },
      { key:'satuan',    label:'Satuan' },
      { key:'qty_rko',   label:'Qty RKO', type:'number', required:true },
      { key:'harga_rko', label:'Harga',   type:'number' },
      { key:'ket',       label:'Ket' },
    ],
  });
}

// ---------- PAGE: TRX PENERIMAAN ----------
async function pagePenerimaan(periodId) {
  await TrxPage.render({
    periodId,
    title: 'Penerimaan / Realisasi RKO',
    table: 'penerimaan',
    defaults: { jenis: 'rko' },
    query: async (pid) => {
      const { data, error } = await sb.from('penerimaan')
        .select('id,tanggal,no_faktur,supplier,qty,harga,jenis,ket,item_id, items(kode,nama,satuan)')
        .eq('period_id', pid).order('tanggal', { ascending:false }).limit(3000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id, tanggal: r.tanggal, no_faktur: r.no_faktur, supplier: r.supplier,
          item_kode: r.items?.kode, item_nama: r.items?.nama, satuan: r.items?.satuan,
          qty: r.qty, harga: r.harga, jenis: r.jenis, ket: r.ket,
        }))
      };
    },
    columns: [
      { key:'tanggal',   label:'Tanggal',     type:'date',   required:true },
      { key:'no_faktur', label:'No Faktur' },
      { key:'supplier',  label:'Supplier' },
      { key:'item_kode', label:'Kode Item',   type:'item_code', required:true },
      { key:'item_nama', label:'Nama Item' },
      { key:'qty',       label:'Qty',         type:'number', required:true },
      { key:'harga',     label:'Harga',       type:'number' },
      { key:'jenis',     label:'Jenis' },
      { key:'ket',       label:'Ket' },
    ],
  });
}

// ---------- PAGE: TRX MUTASI ----------
async function pageMutasi(periodId) {
  const units = await TrxPage.loadUnits();
  const gf = units.find(u => u.tipe === 'gudang_farmasi');

  await TrxPage.render({
    periodId,
    title: 'Mutasi ke Unit',
    table: 'mutasi',
    defaults: { unit_asal_id: gf?.id, jenis: 'normal' },
    query: async (pid) => {
      const { data, error } = await sb.from('mutasi')
        .select('id,tanggal,no_dokumen,qty,harga,jenis,ket,item_id, unit_asal_id, unit_tujuan_id, items(kode,nama,satuan)')
        .eq('period_id', pid).order('tanggal', { ascending:false }).limit(3000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id, tanggal: r.tanggal, no_dokumen: r.no_dokumen,
          item_kode: r.items?.kode, item_nama: r.items?.nama, satuan: r.items?.satuan,
          unit_asal: units.find(u => u.id === r.unit_asal_id)?.kode,
          unit_tujuan: units.find(u => u.id === r.unit_tujuan_id)?.kode,
          qty: r.qty, harga: r.harga, jenis: r.jenis, ket: r.ket,
        }))
      };
    },
    columns: [
      { key:'tanggal',     label:'Tanggal',     type:'date', required:true },
      { key:'no_dokumen',  label:'No Dokumen' },
      { key:'item_kode',   label:'Kode Item',   type:'item_code', required:true },
      { key:'item_nama',   label:'Nama Item' },
      { key:'unit_asal',   label:'Unit Asal',   type:'unit_code', idKey:'unit_asal_id' },
      { key:'unit_tujuan', label:'Unit Tujuan', type:'unit_code', required:true, idKey:'unit_tujuan_id' },
      { key:'qty',         label:'Qty',         type:'number', required:true },
      { key:'jenis',       label:'Jenis' },
      { key:'ket',         label:'Ket' },
    ],
  });
}

// ---------- PAGE: TRX PEMAKAIAN ----------
async function pagePemakaian(periodId) {
  await TrxPage.render({
    periodId,
    title: 'Pemakaian Unit',
    table: 'pemakaian',
    upsert: ['period_id','item_id','unit_id'],
    query: async (pid) => {
      const { data, error } = await sb.from('pemakaian')
        .select('id,qty,ket,item_id,unit_id, items(kode,nama,satuan), units(kode,nama)')
        .eq('period_id', pid).order('id', { ascending:false }).limit(5000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id, unit_kode: r.units?.kode, unit_nama: r.units?.nama,
          item_kode: r.items?.kode, item_nama: r.items?.nama, satuan: r.items?.satuan,
          qty: r.qty, ket: r.ket,
        }))
      };
    },
    columns: [
      { key:'unit_kode', label:'Kode Unit',  type:'unit_code', required:true },
      { key:'unit_nama', label:'Nama Unit' },
      { key:'item_kode', label:'Kode Item',  type:'item_code', required:true },
      { key:'item_nama', label:'Nama Item' },
      { key:'satuan',    label:'Satuan' },
      { key:'qty',       label:'Qty Pakai',  type:'number', required:true },
      { key:'ket',       label:'Ket' },
    ],
  });
}

// ---------- PAGE: TRX PENYESUAIAN ----------
async function pagePenyesuaian(periodId) {
  await TrxPage.render({
    periodId,
    title: 'Penyesuaian / Opname',
    table: 'penyesuaian',
    query: async (pid) => {
      const { data, error } = await sb.from('penyesuaian')
        .select('id,qty,alasan,item_id,unit_id, items(kode,nama,satuan), units(kode,nama)')
        .eq('period_id', pid).order('id', { ascending:false }).limit(3000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id, unit_kode: r.units?.kode, unit_nama: r.units?.nama,
          item_kode: r.items?.kode, item_nama: r.items?.nama, satuan: r.items?.satuan,
          qty: r.qty, alasan: r.alasan,
        }))
      };
    },
    columns: [
      { key:'unit_kode', label:'Kode Unit', type:'unit_code', required:true },
      { key:'unit_nama', label:'Nama Unit' },
      { key:'item_kode', label:'Kode Item', type:'item_code', required:true },
      { key:'item_nama', label:'Nama Item' },
      { key:'satuan',    label:'Satuan' },
      { key:'qty',       label:'Qty (+/-)', type:'number', required:true },
      { key:'alasan',    label:'Alasan' },
    ],
  });
}

// ========================================================
// BOOTSTRAP
// ========================================================
(async function boot() {
  Auth.bindLoginForm();

  const user = await Auth.getUser();
  if (!user) { Auth.showLogin(); return; }

  Auth.showApp(user);

  Router.register('dashboard',   { title:'Dashboard',              render: pageDashboard });
  Router.register('stok',        { title:'Stok & Persediaan',      render: pageStok });
  Router.register('analisa',     { title:'Analisa',                render: pageAnalisa });
  Router.register('item',        { title:'Item Obat & BMHP',       render: pageMasterItem });
  Router.register('unit',        { title:'Master Unit',            render: pageMasterUnit });
  Router.register('periode',     { title:'Master Periode',         render: pageMasterPeriode });
  Router.register('rko',         { title:'RKO',                    render: () => pageRKO(window.activePeriodId) });
  Router.register('penerimaan',  { title:'Penerimaan / Realisasi', render: () => pagePenerimaan(window.activePeriodId) });
  Router.register('mutasi',      { title:'Mutasi ke Unit',         render: () => pageMutasi(window.activePeriodId) });
  Router.register('pemakaian',   { title:'Pemakaian Unit',         render: () => pagePemakaian(window.activePeriodId) });
  Router.register('penyesuaian', { title:'Penyesuaian / Opname',   render: () => pagePenyesuaian(window.activePeriodId) });

  try {
    await Period.load();
  } catch (e) {
    console.warn('Gagal load periode:', e);
  }

  Router.start();

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.reload();
  });
})();
