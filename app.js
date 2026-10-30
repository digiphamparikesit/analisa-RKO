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

// ===================================================
// MODAL EDIT ITEM
// ===================================================
async function showEditItemModal(item) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h3 class="text-lg font-bold">Edit Item</h3>
          <button data-close class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-3">
          <div>
            <label class="text-xs text-slate-500">Kode (tidak bisa diubah)</label>
            <input data-f="kode" class="w-full border rounded px-2 py-1 text-sm bg-slate-100" value="${esc(item.kode)}" readonly>
          </div>
          <div>
            <label class="text-xs text-slate-500">Nama Item <span class="text-red-500">*</span></label>
            <input data-f="nama" class="w-full border rounded px-2 py-1 text-sm" value="${esc(item.nama)}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Kategori <span class="text-red-500">*</span></label>
              <select data-f="kategori" class="w-full border rounded px-2 py-1 text-sm">
                ${['OBAT','BMHP','B3','NUTRISI ENTERAL','PROGRAM','PROGRAM TB','PROGRAM HIV','PROGRAM MALARIA','PROGRAM RABIES','PROGRAM COVID','PROGRAM IMUNISASI','PROGRAM STUNTING','PROGRAM BKKBN']
                  .map(k => `<option value="${k}" ${item.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-500">Satuan <span class="text-red-500">*</span></label>
              <input data-f="satuan" class="w-full border rounded px-2 py-1 text-sm" value="${esc(item.satuan || '')}">
            </div>
         <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Satuan Kemasan</label>
              <input data-f="satuan_kemasan" class="w-full border rounded px-2 py-1 text-sm" value="${esc(item.satuan_kemasan || '')}" placeholder="Box / Botol / Strip">
            </div>
            <div>
              <label class="text-xs text-slate-500">Isi per Kemasan</label>
              <input data-f="isi_kemasan" type="number" class="w-full border rounded px-2 py-1 text-sm" value="${Number(item.isi_kemasan || 1)}" placeholder="1 box = ? satuan kecil">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Harga Beli (HPP)</label>
              <input data-f="harga_beli" type="number" class="w-full border rounded px-2 py-1 text-sm" value="${Number(item.harga_beli || 0)}">
            </div>
            <div>
              <label class="text-xs text-slate-500">Harga Jual</label>
              <input data-f="harga_jual" type="number" class="w-full border rounded px-2 py-1 text-sm" value="${Number(item.harga_jual || 0)}">
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-500">Min Stok</label>
            <input data-f="min_stok" type="number" class="w-full border rounded px-2 py-1 text-sm" value="${Number(item.min_stok || 0)}">
          </div>
          <div>
            <label class="flex items-center gap-2 text-sm">
              <input data-f="aktif" type="checkbox" ${item.aktif ? 'checked' : ''}>
              <span>Aktif</span>
            </label>
          </div>
          ${item.flag_harga ? `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <div class="font-semibold mb-1">⚠️ Item ini Ditandai</div>
              <div><b>Flag:</b> ${esc(item.flag_harga)}</div>
              <div><b>Catatan:</b> ${esc(item.flag_catatan || '-')}</div>
            </div>` : ''}
          <div data-msg class="text-sm"></div>
        </div>
        <div class="px-6 py-3 border-t flex justify-end gap-2">
          <button data-close class="btn btn-gray">Batal</button>
          <button data-save class="btn btn-success">Simpan Perubahan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const $ = (s) => modal.querySelector(s);
    modal.querySelectorAll('[data-close]').forEach(b =>
      b.onclick = () => { modal.remove(); resolve(null); });

    $('[data-f="nama"]').focus();

    $('[data-save]').onclick = async () => {
      const nama     = $('[data-f="nama"]').value.trim().toUpperCase();
      const kategori = $('[data-f="kategori"]').value;
      const satuan   = $('[data-f="satuan"]').value.trim().toUpperCase();
      const satuanKemasan = $('[data-f="satuan_kemasan"]').value.trim().toUpperCase() || null;
      const isiKemasan = Number($('[data-f="isi_kemasan"]').value) || 1;
      const hargaBeli = Number($('[data-f="harga_beli"]').value) || 0;
      const hargaJual = Number($('[data-f="harga_jual"]').value) || 0;
      const minStok   = Number($('[data-f="min_stok"]').value) || 0;
      const aktif     = $('[data-f="aktif"]').checked;

      if (!nama || !satuan) {
        $('[data-msg]').innerHTML = '<span class="text-red-600">Nama dan Satuan wajib diisi.</span>';
        return;
      }

      let grup = 'Obat';
      if (kategori === 'BMHP') grup = 'BMHP';
      else if (kategori === 'B3') grup = 'B3';
      else if (kategori === 'NUTRISI ENTERAL') grup = 'Nutrisi';
      else if (kategori.startsWith('PROGRAM')) grup = 'Program';

      $('[data-save]').disabled = true;
      $('[data-save]').textContent = 'Menyimpan...';

      const { error } = await sb.from('items').update({
        nama, kategori, grup, satuan,
        satuan_kemasan: satuanKemasan, isi_kemasan: isiKemasan,
        harga_beli: hargaBeli, harga_jual: hargaJual,
        min_stok: minStok, aktif,
      }).eq('id', item.id);

      if (error) {
        $('[data-msg]').innerHTML = `<span class="text-red-600">Gagal: ${esc(error.message)}</span>`;
        $('[data-save]').disabled = false;
        $('[data-save]').textContent = 'Simpan Perubahan';
        return;
      }
      TrxPage.clearCache();
      toast(`Item "${item.kode}" tersimpan`, 'success');
      modal.remove();
      resolve(true);
    };

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        $('[data-save]').click();
      }
      if (e.key === 'Escape') {
        modal.remove();
        resolve(null);
      }
    });
  });
}

// ===================================================
// MODAL TAMBAH ITEM BARU
// ===================================================
async function showAddItemModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h3 class="text-lg font-bold">Tambah Item Baru</h3>
          <button data-close class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-3">
          <div>
            <label class="text-xs text-slate-500">Kode <span class="text-red-500">*</span></label>
            <input data-f="kode" class="w-full border rounded px-2 py-1 text-sm" placeholder="mis. 1215">
          </div>
          <div>
            <label class="text-xs text-slate-500">Nama Item <span class="text-red-500">*</span></label>
            <input data-f="nama" class="w-full border rounded px-2 py-1 text-sm" placeholder="mis. PARACETAMOL TAB 500MG">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Kategori <span class="text-red-500">*</span></label>
              <select data-f="kategori" class="w-full border rounded px-2 py-1 text-sm">
                <option value="OBAT">OBAT</option>
                <option value="BMHP">BMHP</option>
                <option value="B3">B3</option>
                <option value="NUTRISI ENTERAL">NUTRISI ENTERAL</option>
                <option value="PROGRAM">PROGRAM</option>
                <option value="PROGRAM TB">PROGRAM TB</option>
                <option value="PROGRAM HIV">PROGRAM HIV</option>
                <option value="PROGRAM MALARIA">PROGRAM MALARIA</option>
                <option value="PROGRAM RABIES">PROGRAM RABIES</option>
                <option value="PROGRAM COVID">PROGRAM COVID</option>
                <option value="PROGRAM IMUNISASI">PROGRAM IMUNISASI</option>
                <option value="PROGRAM STUNTING">PROGRAM STUNTING</option>
                <option value="PROGRAM BKKBN">PROGRAM BKKBN</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-500">Satuan <span class="text-red-500">*</span></label>
              <input data-f="satuan" class="w-full border rounded px-2 py-1 text-sm" placeholder="Tablet / Botol / PCS">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Satuan Kemasan</label>
              <input data-f="satuan_kemasan" class="w-full border rounded px-2 py-1 text-sm" placeholder="Box / Botol / Strip">
            </div>
            <div>
              <label class="text-xs text-slate-500">Isi per Kemasan</label>
              <input data-f="isi_kemasan" type="number" class="w-full border rounded px-2 py-1 text-sm" value="1">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500">Harga Beli (HPP)</label>
              <input data-f="harga_beli" type="number" class="w-full border rounded px-2 py-1 text-sm" value="0">
            </div>
            <div>
              <label class="text-xs text-slate-500">Harga Jual</label>
              <input data-f="harga_jual" type="number" class="w-full border rounded px-2 py-1 text-sm" value="0">
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-500">Min Stok</label>
            <input data-f="min_stok" type="number" class="w-full border rounded px-2 py-1 text-sm" value="0">
          </div>
          <div data-msg class="text-sm"></div>
        </div>
        <div class="px-6 py-3 border-t flex justify-end gap-2">
          <button data-close class="btn btn-gray">Batal</button>
          <button data-save class="btn btn-success">Simpan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const $ = (s) => modal.querySelector(s);
    modal.querySelectorAll('[data-close]').forEach(b =>
      b.onclick = () => { modal.remove(); resolve(null); });

    $('[data-f="kode"]').focus();

    $('[data-save]').onclick = async () => {
      const kode = $('[data-f="kode"]').value.trim().toUpperCase();
      const nama = $('[data-f="nama"]').value.trim().toUpperCase();
      const kategori = $('[data-f="kategori"]').value;
      const satuan = $('[data-f="satuan"]').value.trim().toUpperCase();
      const satuanKemasan = $('[data-f="satuan_kemasan"]').value.trim().toUpperCase() || null;
      const isiKemasan = Number($('[data-f="isi_kemasan"]').value) || 1;
      const hargaBeli = Number($('[data-f="harga_beli"]').value) || 0;
      const hargaJual = Number($('[data-f="harga_jual"]').value) || 0;
      const minStok = Number($('[data-f="min_stok"]').value) || 0;

      if (!kode || !nama || !satuan) {
        $('[data-msg]').innerHTML = '<span class="text-red-600">Kode, Nama, dan Satuan wajib diisi.</span>';
        return;
      }

      let grup = 'Obat';
      if (kategori === 'BMHP') grup = 'BMHP';
      else if (kategori === 'B3') grup = 'B3';
      else if (kategori === 'NUTRISI ENTERAL') grup = 'Nutrisi';
      else if (kategori.startsWith('PROGRAM')) grup = 'Program';

      const newItem = { kode, nama, kategori, grup, satuan,
                        satuan_kemasan: satuanKemasan, isi_kemasan: isiKemasan,
                        harga_beli: hargaBeli, harga_jual: hargaJual, min_stok: minStok, aktif: true };

      $('[data-save]').disabled = true;
      $('[data-save]').textContent = 'Menyimpan...';

      const { error } = await sb.from('items').upsert([newItem], { onConflict: 'kode' });
      if (error) {
        $('[data-msg]').innerHTML = `<span class="text-red-600">Gagal: ${esc(error.message)}</span>`;
        $('[data-save]').disabled = false;
        $('[data-save]').textContent = 'Simpan';
        return;
      }
      TrxPage.clearCache();
      toast(`Item "${kode}" tersimpan`, 'success');
      modal.remove();
      resolve(newItem);
    };

    // Enter key → save
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        $('[data-save]').click();
      }
    });
  });
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
    const savedId = Number(localStorage.getItem('active-period-id'));
    let target = Period.list.find(p => p.id === savedId);
    if (!target) {
      target = Period.list.find(p => p.status === 'open') || Period.list[0] || null;
    }
    Period.current = target;
    window.activePeriodId = Period.current?.id || null;
    window.activePeriod   = Period.current;
    Period.renderInfo();
    return Period.list;
  },
  setActive(id) {
    const p = Period.list.find(x => x.id === Number(id));
    if (!p) return;
    Period.current = p;
    window.activePeriodId = p.id;
    window.activePeriod   = p;
    localStorage.setItem('active-period-id', p.id);
    Period.renderInfo();
  },
  label(id) {
    const p = Period.list.find(x => x.id === id);
    if (!p) return '';
    const m = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${m[p.bulan]} ${p.tahun}`;
  },
  renderInfo() {
    const el = document.getElementById('period-info');
    if (!el) return;
    if (!Period.list.length) {
      el.innerHTML = '<span class="text-amber-600">Belum ada periode</span>';
      return;
    }
    const m = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const opts = Period.list.map(p => {
      const sel = p.id === Period.current?.id ? 'selected' : '';
      const stat = p.status === 'closed' ? ' (closed)' : '';
      return `<option value="${p.id}" ${sel}>${m[p.bulan]} ${p.tahun}${stat}</option>`;
    }).join('');
    const cur = Period.current;
    const badge = cur?.status === 'open'
      ? '<span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">open</span>'
      : '<span class="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600">closed</span>';
    el.innerHTML = `
      <span class="text-xs text-slate-400 mr-1">Periode:</span>
      <select id="period-select" class="border rounded px-2 py-1 text-sm">${opts}</select>
      ${badge}
    `;
    const sel = document.getElementById('period-select');
    if (sel) sel.onchange = () => {
      Period.setActive(sel.value);
      Router.navigate();
    };
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
    
    // Deteksi delimiter (Tab, titik koma, atau koma)
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
        } else if (c === delim && !inQ) {
          // Cerdas: Jika delim adalah koma, tapi karakter sebelum & sesudahnya adalah ANGKA,
          // maka itu adalah desimal, bukan pemisah kolom!
          const prevChar = line[i-1];
          const nextChar = line[i+1];
          if (delim === ',' && /[0-9]/.test(prevChar) && /[0-9]/.test(nextChar)) {
            cur += c; // Biarkan koma sebagai bagian dari angka desimal
          } else {
            cells.push(cur); cur = '';
          }
        } else {
          cur += c;
        }
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
    const m = new Map();
    arr.forEach(x => {
      if (x.kode) m.set(String(x.kode).trim().toUpperCase(), x);
      if (x.nama) m.set(String(x.nama).trim().toUpperCase().replace(/\s+/g,' '), x);
    });
    return m;
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
          ${cfg.table === 'rko' ? `<button id="btn-recalc" class="btn btn-gray" title="Hitung ulang konversi kemasan">🔄 Hitung Kemasan</button>` : ''}
        </div>
      </div>
      <div id="trx-table" class="bg-white rounded-xl shadow"></div>
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

    // Tombol hitung ulang kemasan (khusus RKO)
    const btnRecalc = document.getElementById('btn-recalc');
    if (btnRecalc) {
      btnRecalc.onclick = async () => {
        if (!confirm('Hitung ulang qty_rko_kecil untuk semua baris RKO berdasarkan isi kemasan di master?')) return;
        btnRecalc.disabled = true;
        btnRecalc.textContent = 'Menghitung...';
        try {
          // Ambil semua data RKO + isi_kemasan dari master
          const { data: rows, error } = await sb.from('rko')
            .select('id,qty_rko,item_id, items(isi_kemasan)')
            .eq('period_id', cfg.periodId);
          if (error) throw error;

          let updated = 0;
          for (const r of rows || []) {
            const isi = Number(r.items?.isi_kemasan || 1);
            const kecil = Number(r.qty_rko || 0) * isi;
            const { error: err2 } = await sb.from('rko')
              .update({ qty_rko_kecil: kecil })
              .eq('id', r.id);
            if (err2) throw err2;
            updated++;
          }
          toast(`${updated} baris dihitung ulang`, 'success');
          await refresh(cfg);
        } catch (err) {
          alert('Gagal: ' + err.message);
        } finally {
          btnRecalc.disabled = false;
          btnRecalc.textContent = '🔄 Hitung Kemasan';
        }
      };
    }
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
              const key = String(v || '').trim().toUpperCase().replace(/\s+/g,' ');
              const it = iMap.get(key);
              if (!it) { err = err || `Kode item "${v}" tidak ditemukan`; break; }
              parsed.item_id = it.id; parsed._item = it;
            } else if (c.type === 'unit_code') {
              const key = String(v || '').trim().toUpperCase().replace(/\s+/g,' ');
              const un = uMap.get(key);
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
        // Kalau cfg punya onCommit custom (mis. opname dengan harga jual), pakai itu
      if (cfg.onCommit) return await cfg.onCommit(rows);
        const TABLE_FIELDS = {
          rko:         ['period_id','item_id','qty_rko','harga_rko','satuan_input','qty_rko_kecil','ket'],
          penerimaan:  ['period_id','item_id','tanggal','no_faktur','supplier','qty','harga','jenis','ket'],
          mutasi:      ['period_id','item_id','unit_asal_id','unit_tujuan_id','qty','harga','jenis','tanggal','no_dokumen','ket'],
          opname:      ['period_id','item_id','unit_id','qty','ket'],
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

  async function refresh(cfg, pageNum) {
    if (pageNum !== undefined) cfg._page = pageNum;
    if (!cfg._page) cfg._page = 1;
    const pageSize = 20;

    const div = document.getElementById('trx-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    const { data, error } = await cfg.query(cfg.periodId);
    if (error) { div.innerHTML = `<div class="p-4 text-red-600 text-sm">${error.message}</div>`; return; }
    cfg._data = data || [];

    const cols = cfg.columns;
    const total = cfg._data.length;
    const totalPage = Math.max(1, Math.ceil(total / pageSize));
    if (cfg._page > totalPage) cfg._page = totalPage;
    const from = (cfg._page - 1) * pageSize;
    const pageData = cfg._data.slice(from, from + pageSize);

    let html = '<div class="table-scroll"><table class="w-full text-xs"><thead class="text-left">';
    html += '<tr><th class="px-2 py-2 w-10">#</th>';
    cols.forEach(c => html += `<th class="px-2 py-2">${c.label}</th>`);
    html += '<th class="px-2 py-2 w-16">Aksi</th></tr></thead><tbody>';

    pageData.forEach((r, i) => {
      html += `<tr class="border-t hover:bg-slate-50"><td class="px-2 py-1 text-slate-400">${from + i + 1}</td>`;
      cols.forEach(c => {
        const v = r[c.key];
        html += `<td class="px-2 py-1">${v == null ? '' : esc(v)}</td>`;
      });
      html += `<td class="px-2 py-1">
        <button data-del="${r.id}" class="text-red-600 hover:underline">hapus</button>
      </td></tr>`;
    });
    if (!pageData.length) {
      html += `<tr><td colspan="${cols.length+2}" class="px-2 py-8 text-center text-slate-400">
        Belum ada data. Klik "Paste dari Excel" untuk mulai.
      </td></tr>`;
    }
    html += '</tbody></table></div>';

    if (total > 0) {
      html += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
        <span>Total: <b>${total}</b> baris · Halaman ${cfg._page}/${totalPage}</span>
        <div class="flex gap-2">
          <button id="trx-prev" class="btn btn-gray" ${cfg._page===1?'disabled':''}>&larr; Prev</button>
          <button id="trx-next" class="btn btn-gray" ${cfg._page>=totalPage?'disabled':''}>Next &rarr;</button>
        </div>
      </div>`;
    }
    div.innerHTML = html;

    const prevBtn = document.getElementById('trx-prev');
    const nextBtn = document.getElementById('trx-next');
    if (prevBtn) prevBtn.onclick = () => refresh(cfg, cfg._page - 1);
    if (nextBtn) nextBtn.onclick = () => refresh(cfg, cfg._page + 1);

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
        <div style="height:280px; position:relative;">
          <canvas id="chart-top"></canvas>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <div class="font-semibold text-sm text-slate-700 mb-2">Tren Capaian RKO 6 Bulan</div>
        <div style="height:280px; position:relative;">
          <canvas id="chart-tren"></canvas>
        </div>
      </div>
  `;

  const pid = window.activePeriodId;
  if (!pid) return;

  const { count: itemCount } = await sb.from('items')
    .select('id', { count:'exact', head:true }).eq('aktif', true);
  document.getElementById('card-items').textContent = itemCount ?? 0;

  const { data: stokData } = await sb.from('v_stok')
    .select('item_id,item_kode,item_nama,satuan,harga_jual_efektif,min_stok,stok_akhir,unit_tipe')
    .eq('period_id', pid);
  const rows = stokData || [];
  let nilai = 0; const kritisSet = new Set();
  rows.forEach(r => {
    nilai += (r.stok_akhir || 0) * (r.harga_jual_efektif || 0);
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

  const { data: topData } = await sb.from('v_stok')
    .select('item_nama, total_pemakaian').eq('period_id', pid).gt('total_pemakaian', 0);
  const aggTop = {};
  (topData || []).forEach(r => {
    const n = r.item_nama || '(?)';
    aggTop[n] = (aggTop[n] || 0) + Number(r.total_pemakaian || 0);
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
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label class="text-xs text-slate-500">Unit</label>
          <select id="f-unit" class="w-full border rounded px-2 py-1 text-sm"></select>
        </div>
        <div>
          <label class="text-xs text-slate-500">Kategori Item</label>
          <select id="f-kat" class="w-full border rounded px-2 py-1 text-sm">
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
        <div>
          <label class="text-xs text-slate-500">Status</label>
          <select id="f-status" class="w-full border rounded px-2 py-1 text-sm">
            <option value="">Semua Status</option>
            <option value="perlu_dicek">⚠️ Perlu Dicek</option>
            <option value="kritis">🔴 Kritis</option>
            <option value="ok">✅ OK</option>
          </select>
        </div>
        <div class="flex items-end gap-2">
          <button id="f-apply" class="btn btn-primary flex-1">Terapkan</button>
          <button id="f-export" class="btn btn-success">Excel</button>
        </div>
      </div>
    </div>
    <div id="stok-table" class="bg-white rounded-xl shadow"></div>
  `;

  const units = await TrxPage.loadUnits();
  const selUnit = document.getElementById('f-unit');
  selUnit.innerHTML = '<option value="">Semua unit</option>' +
    units.map(u => `<option value="${u.id}">${esc(u.kode)} — ${esc(u.nama)}</option>`).join('');

  let currentData = [];
  let page = 1, pageSize = 20;
  
  // Auto-apply filter unit dari menu lain
  const preUnit = sessionStorage.getItem('stok-filter-unit');
  if (preUnit) { selUnit.value = preUnit; sessionStorage.removeItem('stok-filter-unit'); }

  function renderTable() {
    const div = document.getElementById('stok-table');
    const total = currentData.length;
    const totalPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPage) page = totalPage;
    const from = (page - 1) * pageSize;
    const pageData = currentData.slice(from, from + pageSize);

    let html = '<div class="table-scroll"><table class="w-full text-xs"><thead class="text-left"><tr>';
    ['Unit','Kode','Nama Item','Kategori','Satuan','Awal','Masuk','Keluar','Stok Fisik','Selisih','Akhir','Min','Status']
      .forEach(h => html += `<th class="px-2 py-2">${h}</th>`);
    html += '</tr></thead><tbody>';
    pageData.forEach(r => {
      const pakaiNegatif = Number(r.total_pemakaian || 0) < 0;
      const kritis = Number(r.stok_akhir) < Number(r.min_stok || 0);
      let statusBadge;
      if (pakaiNegatif) {
        statusBadge = '<span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold" title="Pemakaian negatif — kemungkinan ada pemasukan/mutasi yang belum diinput">PERLU DICEK</span>';
      } else if (kritis) {
        statusBadge = '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">KRITIS</span>';
      } else {
        statusBadge = '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">OK</span>';
      }
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1">${esc(r.unit_kode)}</td>
        <td class="px-2 py-1">${esc(r.item_kode)}</td>
        <td class="px-2 py-1">${esc(r.item_nama)}</td>
        <td class="px-2 py-1">${esc(r.item_kategori)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.stok_awal,0)}</td>
        <td class="px-2 py-1 text-right text-green-700">${fmtNum((r.total_penerimaan||0)+(r.total_mutasi_masuk||0),0)}</td>
        <td class="px-2 py-1 text-right text-orange-600">${fmtNum(r.total_mutasi_keluar,0)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.opname_qty,0)}</td>
        <td class="px-2 py-1 text-right text-red-600">${fmtNum(r.total_pemakaian,0)}</td>
        <td class="px-2 py-1 text-right font-semibold">${fmtNum(r.stok_akhir,0)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.min_stok,0)}</td>
        <td class="px-2 py-1 text-center">${statusBadge}</td>
      </tr>`;
     }); 
    if (!pageData.length) html += `<tr><td colspan="13" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>`;
    html += '</tbody></table></div>';

    if (total > 0) {
      html += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
        <span>Total: <b>${total}</b> baris · Halaman ${page}/${totalPage}</span>
        <div class="flex gap-2">
          <button id="stok-prev" class="btn btn-gray" ${page===1?'disabled':''}>&larr; Prev</button>
          <button id="stok-next" class="btn btn-gray" ${page>=totalPage?'disabled':''}>Next &rarr;</button>
        </div>
      </div>`;
    }
    div.innerHTML = html;
    const p = document.getElementById('stok-prev');
    const n = document.getElementById('stok-next');
    if (p) p.onclick = () => { page--; renderTable(); };
    if (n) n.onclick = () => { page++; renderTable(); };
  }

  async function load() {
    const div = document.getElementById('stok-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    let q = sb.from('v_stok').select('*').eq('period_id', window.activePeriodId);
    const uid = selUnit.value;
    const kat = document.getElementById('f-kat').value;
    const key = document.getElementById('f-q').value.trim();
    const stat = document.getElementById('f-status').value;
    if (uid) q = q.eq('unit_id', uid);
    if (kat) q = q.eq('item_grup', kat);
     // Search di-handle terpisah (bukan di query utama)
    // karena PostgREST tidak support karakter khusus di .or()
    const { data, error } = await q.order('item_nama').limit(5000);
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    currentData = data || [];

    // Filter search di sisi client (setelah data di-load)
    if (key) {
      const lowerKey = key.toLowerCase();
      currentData = currentData.filter(r =>
        (r.item_kode || '').toLowerCase().includes(lowerKey) ||
        (r.item_nama || '').toLowerCase().includes(lowerKey)
      );
    }

    // Filter status
    if (stat) {
      currentData = currentData.filter(r => {
        const pakaiNegatif = Number(r.total_pemakaian || 0) < 0;
        const kritis = Number(r.stok_akhir) < Number(r.min_stok || 0);
        if (stat === 'perlu_dicek') return pakaiNegatif;
        if (stat === 'kritis')      return !pakaiNegatif && kritis;
        if (stat === 'ok')          return !pakaiNegatif && !kritis;
        return true;
      });
    }

    page = 1;
    renderTable();
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
   document.getElementById('f-status').onchange = () => load();

  await load();
}

// ---------- PAGE: ANALISA ----------
async function pageAnalisa() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label class="text-xs text-slate-500">Filter Unit (berlaku untuk Stock Cover, Dead Stock, Nilai)</label>
          <select id="a-unit" class="w-full border rounded px-2 py-1 text-sm"></select>
        </div>
        <div class="text-xs text-slate-400 pb-2">
          Tab <b>Capaian RKO</b> selalu dari sudut pandang Gudang Farmasi (tidak terpengaruh filter unit).
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow mb-4">
      <div class="flex border-b overflow-auto">
        <button data-tab="rko"     class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Capaian RKO</button>
        <button data-tab="cover"   class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Stock Cover</button>
        <button data-tab="dead"    class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Dead Stock</button>
        <button data-tab="nilai"   class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Nilai Persediaan</button>
        <button data-tab="unit"    class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Rekap per Unit</button>
        <button data-tab="riwayat" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Riwayat Stok</button>
        <button data-tab="anomali" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Anomali Stok</button>
        <button data-tab="coverage" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Coverage</button>
        <button data-tab="opname" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Nilai Opname</button>
        <button data-tab="status-opname" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Status Opname</button>
        <button data-tab="anomali-unit" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Anomali per Unit</button>
        <button data-tab="opname-kategori" class="tab-btn px-4 py-3 text-sm font-medium whitespace-nowrap">Opname per Kategori</button>
      </div>
      <div id="tab-body" class="p-4"></div>
    </div>
  `;

  const pid = window.activePeriodId;
  const body = document.getElementById('tab-body');
  const selUnit = document.getElementById('a-unit');
  let currentTab = 'rko';
  let allUnits = [];

  allUnits = await TrxPage.loadUnits();
  const gf = allUnits.find(u => u.tipe === 'gudang_farmasi');
  selUnit.innerHTML = '<option value="">Semua Unit</option>' +
    allUnits.map(u => `<option value="${u.id}">${esc(u.kode)} — ${esc(u.nama)}</option>`).join('');
  selUnit.value = gf?.id || '';

  selUnit.onchange = () => renderTab(currentTab);

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
    currentTab = name;
    setActive(name);
    body.innerHTML = '<div class="text-slate-500 text-sm">Memuat...</div>';

    const unitId = selUnit.value;

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
      let q = sb.from('v_stok').select('*').eq('period_id', pid);
      if (unitId) q = q.eq('unit_id', unitId);
      const { data } = await q;
      const rows = (data || []).map(r => {
        const pakai = Number(r.total_pemakaian || 0);
        const cover = pakai > 0 ? (Number(r.stok_akhir || 0) / pakai).toFixed(2) : '-';
        return { ...r, cover_bulan: cover, _sort: pakai > 0 ? Number(cover) : 99999 };
      }).sort((a,b) => a._sort - b._sort);
      body.innerHTML = tableHTML(rows, [
        ['unit_kode','Unit'], ['item_kode','Kode'], ['item_nama','Nama Item'], ['satuan','Satuan'],
        ['stok_akhir','Stok Akhir'], ['total_pemakaian','Selisih'],
        ['cover_bulan','Cover (bulan)'],
      ], 'stock-cover');
    }
    else if (name === 'dead') {
      let q = sb.from('v_stok').select('*').eq('period_id', pid)
        .gt('stok_akhir', 0).eq('total_pemakaian', 0);
      if (unitId) q = q.eq('unit_id', unitId);
      const { data } = await q;
      body.innerHTML = tableHTML(data || [], [
      ['unit_kode','Unit'], ['item_kode','Kode'], ['item_nama','Nama Item'],
      ['satuan','Satuan'], ['stok_akhir','Stok Akhir'],
      ['harga_jual_efektif','Harga'], ['total_pemakaian','Pemakaian'],
    ], 'dead-stock');
    }
    else if (name === 'nilai') {
      let q = sb.from('v_stok').select('*').eq('period_id', pid);
      if (unitId) q = q.eq('unit_id', unitId);
      const { data } = await q;
      const agg = {};
      (data || []).forEach(r => {
        const v = Number(r.stok_akhir || 0) * Number(r.harga_jual_efektif || 0);
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
    else if (name === 'unit') {
      const { data } = await sb.from('v_stok').select('*').eq('period_id', pid);
      const agg = {};
      (data || []).forEach(r => {
        const key = r.unit_id;
        if (!agg[key]) {
          agg[key] = {
            unit_id: r.unit_id, unit_kode: r.unit_kode, unit_nama: r.unit_nama,
            unit_tipe: r.unit_tipe, unit_kategori: r.unit_kategori,
            jml_item: 0, jml_kritis: 0, total_qty: 0, nilai: 0,
          };
        }
        const qty = Number(r.stok_akhir || 0);
        if (qty !== 0) {
          agg[key].jml_item += 1;
          agg[key].total_qty += qty;
          agg[key].nilai += qty * Number(r.harga_jual_efektif||0);
          if (r.unit_tipe === 'gudang_farmasi' && qty < Number(r.min_stok || 0)) {
            agg[key].jml_kritis += 1;
          }
        }
      });
      const rows = Object.values(agg).sort((a,b) => b.nilai - a.nilai);
      body.innerHTML = tableHTML(rows, [
        ['unit_kode','Kode Unit'], ['unit_nama','Nama Unit'],
        ['unit_tipe','Tipe'], ['unit_kategori','Kategori'],
        ['jml_item','Jml Item'], ['jml_kritis','Item Kritis'],
        ['total_qty','Total Qty'], ['nilai','Nilai (Rp)'],
      ], 'rekap-unit');
      setTimeout(() => {
        document.querySelectorAll('[data-unit-detail]').forEach(b => {
          b.onclick = () => {
            sessionStorage.setItem('stok-filter-unit', b.dataset.unitDetail);
            location.hash = '#/stok';
          };
        });
      }, 0);
    }

          // --- Tab 12: OPNAME PER KATEGORI (breakdown Obat/BMHP/B3 per unit) ---
    else if (name === 'opname-kategori') {
      body.innerHTML = '<div class="text-slate-500 text-sm">Memuat rekap opname per kategori...</div>';

      const { data, error } = await sb.from('v_opname_kategori')
        .select('*')
        .eq('period_id', pid);
      if (error) { body.innerHTML = `<div class="text-red-600">${esc(error.message)}</div>`; return; }

      // Pivot per unit dengan nilai jual DAN nilai beli
      const agg = {};
      (data || []).forEach(r => {
        const key = r.unit_id;
        if (!agg[key]) {
          agg[key] = {
            unit_id: r.unit_id,
            unit_kode: r.unit_kode,
            unit_nama: r.unit_nama,
            // Nilai Jual
            Obat_jual: 0, BMHP_jual: 0, B3_jual: 0,
            total_jual: 0,
            // Nilai Beli
            Obat_beli: 0, BMHP_beli: 0, B3_beli: 0,
            total_beli: 0,
            jml_item_total: 0,
          };
        }
        const nilaiJual = Number(r.nilai_jual || 0);
        const nilaiBeli = Number(r.nilai_beli || 0);
        const grup = r.kategori_grup;

        agg[key][grup + '_jual'] = (agg[key][grup + '_jual'] || 0) + nilaiJual;
        agg[key][grup + '_beli'] = (agg[key][grup + '_beli'] || 0) + nilaiBeli;
        agg[key].total_jual += nilaiJual;
        agg[key].total_beli += nilaiBeli;
        agg[key].jml_item_total += Number(r.jml_item || 0);
      });

      const rows = Object.values(agg).sort((a,b) => b.total_jual - a.total_jual);

      // Grand total
      const grand = {
        Obat_jual: 0, BMHP_jual: 0, B3_jual: 0, total_jual: 0,
        Obat_beli: 0, BMHP_beli: 0, B3_beli: 0, total_beli: 0,
        jml_item_total: 0,
      };
      rows.forEach(r => {
        grand.Obat_jual += r.Obat_jual;
        grand.BMHP_jual += r.BMHP_jual;
        grand.B3_jual += r.B3_jual;
        grand.total_jual += r.total_jual;
        grand.Obat_beli += r.Obat_beli;
        grand.BMHP_beli += r.BMHP_beli;
        grand.B3_beli += r.B3_beli;
        grand.total_beli += r.total_beli;
        grand.jml_item_total += r.jml_item_total;
      });

      let html = `
        <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          ℹ️ Rekap <b>nilai stok opname</b> per unit berdasarkan kategori:
          <b>Obat</b> (OBAT + semua PROGRAM*), <b>BMHP</b> (BMHP + BHP), <b>B3</b>.
          Ditampilkan dalam <b>2 kolom nilai</b>:
          <span class="font-semibold text-green-700">Harga Jual</span> dan
          <span class="font-semibold text-blue-700">Harga Beli (HPP)</span>.
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Obat (HPP)</div>
            <div class="text-xl font-bold text-blue-700 mt-1">Rp ${fmtInt(grand.Obat_beli)}</div>
            <div class="text-xs text-slate-400 mt-1">Jual: Rp ${fmtInt(grand.Obat_jual)}</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total BMHP (HPP)</div>
            <div class="text-xl font-bold text-green-700 mt-1">Rp ${fmtInt(grand.BMHP_beli)}</div>
            <div class="text-xs text-slate-400 mt-1">Jual: Rp ${fmtInt(grand.BMHP_jual)}</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total B3 (HPP)</div>
            <div class="text-xl font-bold text-amber-700 mt-1">Rp ${fmtInt(grand.B3_beli)}</div>
            <div class="text-xs text-slate-400 mt-1">Jual: Rp ${fmtInt(grand.B3_jual)}</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4 bg-red-50 border-red-200">
            <div class="text-xs text-red-700 font-semibold">Grand Total (HPP)</div>
            <div class="text-xl font-bold text-red-700 mt-1">Rp ${fmtInt(grand.total_beli)}</div>
            <div class="text-xs text-slate-500 mt-1">Jual: Rp ${fmtInt(grand.total_jual)}</div>
          </div>
        </div>

        <div class="mb-2 flex justify-end">
          <button class="btn btn-success" id="opname-kategori-export">&#11015; Export Excel</button>
        </div>

        <div class="table-scroll">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-slate-100">
                <th rowspan="2" class="px-2 py-2 text-left">Kode Unit</th>
                <th rowspan="2" class="px-2 py-2 text-left">Nama Unit</th>
                <th rowspan="2" class="px-2 py-2 text-right">Jml Item</th>
                <th colspan="3" class="px-2 py-2 text-center border-l">Nilai Jual (Rp)</th>
                <th colspan="3" class="px-2 py-2 text-center border-l">Nilai HPP (Rp)</th>
                <th rowspan="2" class="px-2 py-2 text-right border-l">Total Jual</th>
                <th rowspan="2" class="px-2 py-2 text-right">Total HPP</th>
              </tr>
              <tr class="bg-slate-50 text-xs">
                <th class="px-2 py-1 text-right border-l">Obat</th>
                <th class="px-2 py-1 text-right">BMHP</th>
                <th class="px-2 py-1 text-right">B3</th>
                <th class="px-2 py-1 text-right border-l">Obat</th>
                <th class="px-2 py-1 text-right">BMHP</th>
                <th class="px-2 py-1 text-right">B3</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (!rows.length) {
        html += `<tr><td colspan="11" class="p-6 text-center text-slate-400">Belum ada data opname untuk periode ini.</td></tr>`;
      } else {
        rows.forEach(r => {
          html += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1 font-mono">${esc(r.unit_kode)}</td>
            <td class="px-2 py-1">${esc(r.unit_nama)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.jml_item_total)}</td>
            <td class="px-2 py-1 text-right text-blue-700 border-l">${fmtInt(r.Obat_jual)}</td>
            <td class="px-2 py-1 text-right text-green-700">${fmtInt(r.BMHP_jual)}</td>
            <td class="px-2 py-1 text-right text-amber-700">${fmtInt(r.B3_jual)}</td>
            <td class="px-2 py-1 text-right text-blue-600 border-l">${fmtInt(r.Obat_beli)}</td>
            <td class="px-2 py-1 text-right text-green-600">${fmtInt(r.BMHP_beli)}</td>
            <td class="px-2 py-1 text-right text-amber-600">${fmtInt(r.B3_beli)}</td>
            <td class="px-2 py-1 text-right font-semibold text-slate-800 border-l">${fmtInt(r.total_jual)}</td>
            <td class="px-2 py-1 text-right font-semibold text-slate-800">${fmtInt(r.total_beli)}</td>
          </tr>`;
        });
        html += `<tr class="border-t-2 border-slate-300 bg-slate-100 font-bold">
          <td colspan="2" class="px-2 py-2">GRAND TOTAL</td>
          <td class="px-2 py-2 text-right">${fmtInt(grand.jml_item_total)}</td>
          <td class="px-2 py-2 text-right text-blue-700 border-l">${fmtInt(grand.Obat_jual)}</td>
          <td class="px-2 py-2 text-right text-green-700">${fmtInt(grand.BMHP_jual)}</td>
          <td class="px-2 py-2 text-right text-amber-700">${fmtInt(grand.B3_jual)}</td>
          <td class="px-2 py-2 text-right text-blue-600 border-l">${fmtInt(grand.Obat_beli)}</td>
          <td class="px-2 py-2 text-right text-green-600">${fmtInt(grand.BMHP_beli)}</td>
          <td class="px-2 py-2 text-right text-amber-600">${fmtInt(grand.B3_beli)}</td>
          <td class="px-2 py-2 text-right text-slate-900 border-l">${fmtInt(grand.total_jual)}</td>
          <td class="px-2 py-2 text-right text-slate-900">${fmtInt(grand.total_beli)}</td>
        </tr>`;
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;

      const btnExp = document.getElementById('opname-kategori-export');
      if (btnExp) btnExp.onclick = () => {
        const obj = rows.map(r => ({
          'Kode Unit': r.unit_kode,
          'Nama Unit': r.unit_nama,
          'Jml Item': r.jml_item_total,
          'Obat Jual (Rp)': r.Obat_jual,
          'BMHP Jual (Rp)': r.BMHP_jual,
          'B3 Jual (Rp)': r.B3_jual,
          'Total Jual (Rp)': r.total_jual,
          'Obat HPP (Rp)': r.Obat_beli,
          'BMHP HPP (Rp)': r.BMHP_beli,
          'B3 HPP (Rp)': r.B3_beli,
          'Total HPP (Rp)': r.total_beli,
        }));
        obj.push({
          'Kode Unit': 'GRAND TOTAL',
          'Nama Unit': '',
          'Jml Item': grand.jml_item_total,
          'Obat Jual (Rp)': grand.Obat_jual,
          'BMHP Jual (Rp)': grand.BMHP_jual,
          'B3 Jual (Rp)': grand.B3_jual,
          'Total Jual (Rp)': grand.total_jual,
          'Obat HPP (Rp)': grand.Obat_beli,
          'BMHP HPP (Rp)': grand.BMHP_beli,
          'B3 HPP (Rp)': grand.B3_beli,
          'Total HPP (Rp)': grand.total_beli,
        });
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Opname per Kategori');
        XLSX.writeFile(wb, `opname-kategori-${Period.label(pid) || ''}.xlsx`);
      };
    }
      
          // --- Tab 9: NILAI OPNAME PER UNIT (murni dari tabel opname) ---
    else if (name === 'opname') {
      body.innerHTML = '<div class="text-slate-500 text-sm">Memuat...</div>';
      const { data, error } = await sb.from('v_opname_summary')
        .select('*').eq('period_id', pid)
        .order('total_nilai_jual', { ascending: false });
      if (error) { body.innerHTML = `<div class="text-red-600">${esc(error.message)}</div>`; return; }
      const rows = (data || []).map(r => ({
        ...r,
        total_qty: Number(r.total_qty || 0),
        total_nilai_beli: Number(r.total_nilai_beli || 0),
        total_nilai_jual: Number(r.total_nilai_jual || 0),
      }));
      const totalItem = rows.reduce((s,r) => s + Number(r.jml_item), 0);
      const totalQty = rows.reduce((s,r) => s + r.total_qty, 0);
      const totalNilaiBeli = rows.reduce((s,r) => s + r.total_nilai_beli, 0);
      const totalNilaiJual = rows.reduce((s,r) => s + r.total_nilai_jual, 0);
      let html = `
        <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          ℹ️ Menu ini <b>murni dari data opname</b> yang Anda upload per unit.
          Tidak dicampur dengan data mutasi atau carry-over bulan sebelumnya.
          Cocok untuk <b>bandingkan langsung dengan aplikasi SIM RS</b>.
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Nilai Beli (HPP)</div>
            <div class="text-2xl font-bold text-blue-700 mt-1">Rp ${fmtInt(totalNilaiBeli)}</div>
            <div class="text-xs text-slate-400 mt-1">${rows.length} unit dengan opname</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Nilai Jual</div>
            <div class="text-2xl font-bold text-green-700 mt-1">Rp ${fmtInt(totalNilaiJual)}</div>
            <div class="text-xs text-slate-400 mt-1">berdasarkan harga jual</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Item Diopname</div>
            <div class="text-2xl font-bold text-blue-800 mt-1">${fmtInt(totalItem)}</div>
            <div class="text-xs text-slate-400 mt-1">baris opname (semua unit)</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Qty</div>
            <div class="text-2xl font-bold text-slate-700 mt-1">${fmtInt(totalQty)}</div>
            <div class="text-xs text-slate-400 mt-1">unit satuan</div>
          </div>
        </div>
        <div class="mb-2 flex justify-end">
          <button class="btn btn-success" id="opname-export">&#11015; Export Excel</button>
        </div>
        <div class="table-scroll">
          <table class="w-full text-xs"><thead><tr>
            <th class="px-2 py-2 text-left">Kode Unit</th>
            <th class="px-2 py-2 text-left">Nama Unit</th>
            <th class="px-2 py-2 text-left">Tipe</th>
            <th class="px-2 py-2 text-left">Kategori</th>
            <th class="px-2 py-2 text-right">Jml Item</th>
            <th class="px-2 py-2 text-right">Total Qty</th>
            <th class="px-2 py-2 text-right">Nilai Beli (Rp)</th>
            <th class="px-2 py-2 text-right">Nilai Jual (Rp)</th>
            <th class="px-2 py-2 text-right">% dari Total</th>
          </tr></thead><tbody>
      `;
      if (!rows.length) {
        html += `<tr><td colspan="8" class="p-6 text-center text-slate-400">Belum ada data opname untuk periode ini.</td></tr>`;
      } else {
        rows.forEach(r => {
          const pct = totalNilaiJual > 0 ? (r.total_nilai_jual / totalNilaiJual * 100) : 0;
          html += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1 font-mono">${esc(r.unit_kode)}</td>
            <td class="px-2 py-1">${esc(r.unit_nama)}</td>
            <td class="px-2 py-1">${esc(r.unit_tipe)}</td>
            <td class="px-2 py-1">${esc(r.unit_kategori)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.jml_item)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.total_qty)}</td>
            <td class="px-2 py-1 text-right text-blue-700">${fmtInt(r.total_nilai_beli)}</td>
            <td class="px-2 py-1 text-right font-semibold text-green-700">${fmtInt(r.total_nilai_jual)}</td>
            <td class="px-2 py-1 text-right text-slate-500">${pct.toFixed(1)}%</td>
          </tr>`;
        });
         html += `<tr class="border-t-2 border-slate-300 bg-slate-50 font-semibold">
          <td colspan="4" class="px-2 py-2">TOTAL</td>
          <td class="px-2 py-2 text-right">${fmtInt(totalItem)}</td>
          <td class="px-2 py-2 text-right">${fmtInt(totalQty)}</td>
          <td class="px-2 py-2 text-right text-blue-700">${fmtInt(totalNilaiBeli)}</td>
          <td class="px-2 py-2 text-right text-green-700">${fmtInt(totalNilaiJual)}</td>
          <td class="px-2 py-2 text-right">100.0%</td>
        </tr>`;
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
      const btnExp = document.getElementById('opname-export');
      if (btnExp) btnExp.onclick = () => {
       const obj = rows.map(r => ({
          'Kode Unit': r.unit_kode, 'Nama Unit': r.unit_nama,
          'Tipe': r.unit_tipe, 'Kategori': r.unit_kategori,
          'Jml Item': r.jml_item, 'Total Qty': r.total_qty,
          'Nilai Beli (Rp)': r.total_nilai_beli,
          'Nilai Jual (Rp)': r.total_nilai_jual,
        }));
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nilai Opname');
        XLSX.writeFile(wb, `nilai-opname-${Period.label(pid) || ''}.xlsx`);
      };
    }

          // --- Tab 10: STATUS OPNAME (mana unit sudah/belum upload) ---
    else if (name === 'status-opname') {
      body.innerHTML = '<div class="text-slate-500 text-sm">Memuat status...</div>';
      const [opRes, iuRes] = await Promise.all([
        sb.from('opname').select('unit_id').eq('period_id', pid).limit(500000),
        sb.from('item_unit').select('unit_id').eq('aktif', true).limit(500000),
      ]);
      if (opRes.error) { body.innerHTML = `<div class="text-red-600">${esc(opRes.error.message)}</div>`; return; }
      if (iuRes.error) { body.innerHTML = `<div class="text-red-600">${esc(iuRes.error.message)}</div>`; return; }
      const opCount = {};
      (opRes.data || []).forEach(r => { opCount[r.unit_id] = (opCount[r.unit_id]||0)+1; });
      const iuCount = {};
      (iuRes.data || []).forEach(r => { iuCount[r.unit_id] = (iuCount[r.unit_id]||0)+1; });
      const rows = allUnits.map(u => {
        const sudah = opCount[u.id] || 0;
        const terdaftar = iuCount[u.id] || 0;
        return { unit_id: u.id, unit_kode: u.kode, unit_nama: u.nama,
          unit_kategori: u.kategori, sudah_upload: sudah, item_terdaftar: terdaftar,
          pct: terdaftar > 0 ? (sudah / terdaftar * 100) : null,
          status: sudah > 0 ? 'sudah' : 'belum' };
      }).sort((a, b) => {
        if (a.status === 'sudah' && b.status !== 'sudah') return -1;
        if (a.status !== 'sudah' && b.status === 'sudah') return 1;
        return b.sudah_upload - a.sudah_upload;
      });
      const sudahCount = rows.filter(r => r.status === 'sudah').length;
      const belumCount = rows.filter(r => r.status === 'belum').length;
      const totalBaris = rows.reduce((s,r) => s + r.sudah_upload, 0);
      let html = `
        <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          ℹ️ Halaman ini menunjukkan <b>unit mana yang sudah/belum upload data opname</b>.
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="bg-green-50 border border-green-200 rounded-xl shadow p-4">
            <div class="text-xs text-green-700 font-semibold">✅ Sudah Upload</div>
            <div class="text-2xl font-bold text-green-800 mt-1">${sudahCount} <span class="text-sm font-normal">/ ${rows.length} unit</span></div>
            <div class="text-xs text-green-600 mt-1">${fmtInt(totalBaris)} baris opname total</div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-xl shadow p-4">
            <div class="text-xs text-red-700 font-semibold">❌ Belum Upload</div>
            <div class="text-2xl font-bold text-red-800 mt-1">${belumCount} <span class="text-sm font-normal">/ ${rows.length} unit</span></div>
            <div class="text-xs text-red-600 mt-1">unit belum ada data opname</div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-xl shadow p-4">
            <div class="text-xs text-blue-700 font-semibold">📊 Progress</div>
            <div class="text-2xl font-bold text-blue-800 mt-1">${rows.length > 0 ? ((sudahCount/rows.length)*100).toFixed(0) : 0}%</div>
            <div class="text-xs text-blue-600 mt-1">unit sudah mulai opname</div>
          </div>
        </div>
        <div class="mb-2 flex justify-end">
          <button class="btn btn-success" id="statop-export">&#11015; Export Excel</button>
        </div>
        <div class="table-scroll">
          <table class="w-full text-xs"><thead><tr>
            <th class="px-2 py-2 text-left">Status</th>
            <th class="px-2 py-2 text-left">Kode Unit</th>
            <th class="px-2 py-2 text-left">Nama Unit</th>
            <th class="px-2 py-2 text-left">Kategori</th>
            <th class="px-2 py-2 text-right">Baris Opname</th>
            <th class="px-2 py-2 text-right">Item Terdaftar</th>
            <th class="px-2 py-2 text-right">Coverage</th>
          </tr></thead><tbody>
      `;
      rows.forEach(r => {
        const isSudah = r.status === 'sudah';
        const badge = isSudah
          ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">✅ Sudah</span>'
          : '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold">❌ Belum</span>';
        let coverBadge = '—';
        if (r.pct !== null) {
          const pct = Math.min(100, r.pct);
          let cls = 'bg-red-100 text-red-700';
          if (pct >= 80) cls = 'bg-green-100 text-green-700';
          else if (pct >= 50) cls = 'bg-amber-100 text-amber-800';
          else if (pct > 0) cls = 'bg-orange-100 text-orange-800';
          coverBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold ${cls}">${pct.toFixed(1)}%</span>`;
        }
        html += `<tr class="border-t hover:bg-slate-50 ${isSudah?'':'text-slate-400'}">
          <td class="px-2 py-1">${badge}</td>
          <td class="px-2 py-1 font-mono">${esc(r.unit_kode)}</td>
          <td class="px-2 py-1">${esc(r.unit_nama)}</td>
          <td class="px-2 py-1">${esc(r.unit_kategori)}</td>
          <td class="px-2 py-1 text-right ${isSudah?'font-semibold text-green-700':''}">${fmtInt(r.sudah_upload)}</td>
          <td class="px-2 py-1 text-right">${fmtInt(r.item_terdaftar)}</td>
          <td class="px-2 py-1 text-right">${coverBadge}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
      body.innerHTML = html;
      const btnExp = document.getElementById('statop-export');
      if (btnExp) btnExp.onclick = () => {
        const obj = rows.map(r => ({
          'Status': r.status==='sudah'?'Sudah':'Belum',
          'Kode Unit': r.unit_kode, 'Nama Unit': r.unit_nama,
          'Kategori': r.unit_kategori, 'Baris Opname': r.sudah_upload,
          'Item Terdaftar': r.item_terdaftar,
          'Coverage %': r.pct !== null ? Number(r.pct.toFixed(1)) : '',
        }));
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Status Opname');
        XLSX.writeFile(wb, `status-opname-${Period.label(pid) || ''}.xlsx`);
      };
    }
          // --- Tab 8: COVERAGE (peta % opname per unit) ---
    else if (name === 'coverage') {
      body.innerHTML = '<div class="text-slate-500 text-sm">Memuat data coverage...</div>';

      // Total item aktif di master
      const { count: totalMaster, error: errMaster } = await sb.from('items')
        .select('id', { count: 'exact', head: true }).eq('aktif', true);
      if (errMaster) { body.innerHTML = `<div class="text-red-600">${esc(errMaster.message)}</div>`; return; }

      // Semua item aktif (untuk detail)
      const { data: activeItems, error: errItems } = await sb.from('items')
        .select('id,kode,nama,kategori,satuan').eq('aktif', true).order('nama').limit(10000);
      if (errItems) { body.innerHTML = `<div class="text-red-600">${esc(errItems.message)}</div>`; return; }

      // Semua opname untuk periode ini
      const { data: opnameRows, error: errOpname } = await sb.from('opname')
        .select('unit_id, item_id').eq('period_id', pid).limit(200000);
      if (errOpname) { body.innerHTML = `<div class="text-red-600">${esc(errOpname.message)}</div>`; return; }

      const activeItemIds = new Set(activeItems.map(i => i.id));
      const unitOpnameSet = {};
      (opnameRows || []).forEach(r => {
        if (!activeItemIds.has(r.item_id)) return;
        if (!unitOpnameSet[r.unit_id]) unitOpnameSet[r.unit_id] = new Set();
        unitOpnameSet[r.unit_id].add(r.item_id);
      });

      const rows = allUnits.map(u => {
        const set = unitOpnameSet[u.id] || new Set();
        const sudah = set.size;
        const belum = totalMaster - sudah;
        const pct = totalMaster > 0 ? (sudah / totalMaster * 100) : 0;
        return {
          unit_id: u.id, unit_kode: u.kode, unit_nama: u.nama, unit_kategori: u.kategori,
          total_master: totalMaster, sudah, belum, coverage: pct,
        };
      }).sort((a, b) => b.sudah - a.sudah);

     // Coverage nasional = rata-rata coverage per unit (bukan total kombinasi)
      const unitsWithOpname = rows.filter(r => r.sudah > 0);
      const totalSudahSemua = rows.reduce((s, r) => s + r.sudah, 0);
      const totalSeluruhUnit = rows.length * (rows[0]?.total_master || 0); // tetap untuk info
      const pctNasional = unitsWithOpname.length > 0
        ? unitsWithOpname.reduce((s, r) => s + r.coverage, 0) / unitsWithOpname.length
        : 0;
      const unitSudahOpname = rows.filter(r => r.sudah > 0).length;

      function coverColor(pct) {
        if (pct >= 60) return 'bg-green-100 text-green-700';
        if (pct >= 20) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-700';
      }

      let html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Coverage Nasional</div>
            <div class="text-2xl font-bold text-blue-800 mt-1">${pctNasional.toFixed(1)}%</div>
            <div class="text-xs text-slate-400 mt-1">rata-rata dari ${unitsWithOpname.length} unit yang sudah opname</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Unit Sudah Opname</div>
            <div class="text-2xl font-bold text-blue-800 mt-1">${unitSudahOpname} <span class="text-sm text-slate-400">/ ${rows.length}</span></div>
            <div class="text-xs text-slate-400 mt-1">unit dengan minimal 1 item diopname</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Item Belum Opname</div>
            <div class="text-2xl font-bold text-red-600 mt-1">${fmtInt(totalSeluruhUnit - totalSudahSemua)}</div>
            <div class="text-xs text-slate-400 mt-1">(total kombinasi jika semua unit diopname)</div>
            <div class="text-xs text-slate-400 mt-1">kombinasi unit × item</div>
          </div>
        </div>
        <div class="mb-2 flex justify-end">
          <button class="btn btn-success" id="cover-export">&#11015; Export Excel</button>
        </div>
        <div id="cover-table"></div>
      `;
      body.innerHTML = html;

      const pageSize = 30;
      let currentPage = 1;

      function renderCoverageTable() {
        const tbl = document.getElementById('cover-table');
        const total = rows.length;
        const totalPage = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPage) currentPage = totalPage;
        const from = (currentPage - 1) * pageSize;
        const pageData = rows.slice(from, from + pageSize);

        let t = '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
        ['Kode Unit','Nama Unit','Kategori','Total Master','Sudah Opname','Belum Opname','Coverage %','Aksi']
          .forEach(h => t += `<th class="px-2 py-2 text-left">${h}</th>`);
        t += '</tr></thead><tbody>';
        pageData.forEach(r => {
          const cls = coverColor(r.coverage);
          t += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1 font-mono">${esc(r.unit_kode)}</td>
            <td class="px-2 py-1">${esc(r.unit_nama)}</td>
            <td class="px-2 py-1">${esc(r.unit_kategori)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.total_master)}</td>
            <td class="px-2 py-1 text-right text-green-700 font-semibold">${fmtInt(r.sudah)}</td>
            <td class="px-2 py-1 text-right text-red-600">${fmtInt(r.belum)}</td>
            <td class="px-2 py-1 text-center">
              <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${cls}">${r.coverage.toFixed(1)}%</span>
            </td>
            <td class="px-2 py-1">
              <button data-cover-detail="${r.unit_id}" class="text-blue-700 hover:underline">detail</button>
            </td>
          </tr>`;
        });
        t += '</tbody></table></div>';

        if (total > 0) {
          t += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
            <span>Total: <b>${total}</b> unit · Halaman ${currentPage}/${totalPage}</span>
            <div class="flex gap-2">
              <button id="cover-prev" class="btn btn-gray" ${currentPage===1?'disabled':''}>&larr; Prev</button>
              <button id="cover-next" class="btn btn-gray" ${currentPage>=totalPage?'disabled':''}>Next &rarr;</button>
            </div>
          </div>`;
        }
        tbl.innerHTML = t;

        const prevBtn = document.getElementById('cover-prev');
        const nextBtn = document.getElementById('cover-next');
        if (prevBtn) prevBtn.onclick = () => { currentPage--; renderCoverageTable(); };
        if (nextBtn) nextBtn.onclick = () => { currentPage++; renderCoverageTable(); };

        tbl.querySelectorAll('[data-cover-detail]').forEach(b => {
          b.onclick = () => showUnitDetail(Number(b.dataset.coverDetail));
        });
      }

      function showUnitDetail(unitId) {
        const unit = allUnits.find(u => u.id === unitId);
        const set = unitOpnameSet[unitId] || new Set();
        const belumItems = activeItems.filter(i => !set.has(i.id));

        const tbl = document.getElementById('cover-table');
        let t = `<div class="mb-3 flex items-start justify-between flex-wrap gap-2">
          <div>
            <button id="cover-back" class="text-blue-700 hover:underline text-sm">&larr; Kembali ke Ringkasan</button>
            <div class="mt-2 text-sm font-semibold">Item Belum Opname — ${esc(unit.kode)} · ${esc(unit.nama)}</div>
            <div class="text-xs text-slate-500">${fmtInt(belumItems.length)} item belum diopname periode ini</div>
          </div>
          <button class="btn btn-success" id="cover-detail-export">&#11015; Export Excel</button>
        </div>`;

        if (!belumItems.length) {
          t += '<div class="p-4 bg-green-50 border border-green-200 text-green-800 rounded text-sm">✅ Semua item sudah diopname di unit ini.</div>';
        } else {
          t += '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
          ['Kode','Nama Item','Kategori','Satuan'].forEach(h => t += `<th class="px-2 py-2 text-left">${h}</th>`);
          t += '</tr></thead><tbody>';
          belumItems.forEach(i => {
            t += `<tr class="border-t hover:bg-slate-50">
              <td class="px-2 py-1 font-mono">${esc(i.kode)}</td>
              <td class="px-2 py-1">${esc(i.nama)}</td>
              <td class="px-2 py-1">${esc(i.kategori)}</td>
              <td class="px-2 py-1">${esc(i.satuan)}</td>
            </tr>`;
          });
          t += '</tbody></table></div>';
        }
        tbl.innerHTML = t;

        document.getElementById('cover-back').onclick = () => renderCoverageTable();
        const btnExp = document.getElementById('cover-detail-export');
        if (btnExp) btnExp.onclick = () => {
          const obj = belumItems.map(i => ({
            Kode: i.kode, Nama: i.nama, Kategori: i.kategori, Satuan: i.satuan,
          }));
          const ws = XLSX.utils.json_to_sheet(obj);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, unit.kode);
          XLSX.writeFile(wb, `belum-opname-${unit.kode}-${Period.label(pid) || ''}.xlsx`);
        };
      }

      renderCoverageTable();

      const btnCoverExport = document.getElementById('cover-export');
      if (btnCoverExport) btnCoverExport.onclick = () => {
        const obj = rows.map(r => ({
          'Kode Unit': r.unit_kode,
          'Nama Unit': r.unit_nama,
          'Kategori': r.unit_kategori,
          'Total Master': r.total_master,
          'Sudah Opname': r.sudah,
          'Belum Opname': r.belum,
          'Coverage %': Number(r.coverage.toFixed(1)),
        }));
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Coverage');
        XLSX.writeFile(wb, `coverage-opname-${Period.label(pid) || ''}.xlsx`);
      };
    }

         // --- Tab 11: ANOMALI PER UNIT (rekap nilai barang tidak tercatat per ruangan) ---
    else if (name === 'anomali-unit') {
      body.innerHTML = '<div class="text-slate-500 text-sm">Memuat rekap anomali per unit...</div>';

      // Ambil semua data v_stok yang pemakaian negatif
      const { data, error } = await sb.from('v_stok')
        .select('unit_id,unit_kode,unit_nama,unit_tipe,item_id,item_nama,item_kode,satuan,harga_jual_efektif,total_pemakaian,opname_qty,stok_awal,total_penerimaan,total_mutasi_masuk')
        .eq('period_id', pid)
        .lt('total_pemakaian', 0);
      if (error) { body.innerHTML = `<div class="text-red-600">${esc(error.message)}</div>`; return; }

      // Aggregasi per unit
      const agg = {};
      (data || []).forEach(r => {
        const key = r.unit_id;
        if (!agg[key]) {
          agg[key] = {
            unit_id: r.unit_id,
            unit_kode: r.unit_kode,
            unit_nama: r.unit_nama,
            unit_tipe: r.unit_tipe,
            jml_item: 0,
            total_qty_selisih: 0,
            total_nilai: 0,
          };
        }
        const qty = Math.abs(Number(r.total_pemakaian || 0));
        const nilai = qty * Number(r.harga_jual_efektif || 0);
        agg[key].jml_item += 1;
        agg[key].total_qty_selisih += qty;
        agg[key].total_nilai += nilai;
      });

      const rows = Object.values(agg).sort((a,b) => b.total_nilai - a.total_nilai);
      const grandItem = rows.reduce((s,r) => s + r.jml_item, 0);
      const grandQty  = rows.reduce((s,r) => s + r.total_qty_selisih, 0);
      const grandNilai= rows.reduce((s,r) => s + r.total_nilai, 0);

      let html = `
        <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ℹ️ Rekap <b>nilai barang tidak tercatat</b> (pemakaian negatif) per unit/ruangan.
          Nilai dihitung berdasarkan <b>harga jual</b> × qty selisih.
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Item Bermasalah</div>
            <div class="text-2xl font-bold text-red-600 mt-1">${fmtInt(grandItem)}</div>
            <div class="text-xs text-slate-400 mt-1">item dari ${rows.length} unit</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Qty Tidak Tercatat</div>
            <div class="text-2xl font-bold text-orange-600 mt-1">${fmtInt(grandQty)}</div>
            <div class="text-xs text-slate-400 mt-1">unit satuan</div>
          </div>
          <div class="bg-white border rounded-xl shadow p-4">
            <div class="text-xs text-slate-500">Total Nilai Tidak Tercatat</div>
            <div class="text-2xl font-bold text-red-700 mt-1">Rp ${fmtInt(grandNilai)}</div>
            <div class="text-xs text-slate-400 mt-1">estimasi (harga jual)</div>
          </div>
        </div>
        <div class="mb-2 flex justify-end">
          <button class="btn btn-success" id="anomali-unit-export">&#11015; Export Excel</button>
        </div>
        <div class="table-scroll">
          <table class="w-full text-xs"><thead><tr>
            <th class="px-2 py-2 text-left">Kode Unit</th>
            <th class="px-2 py-2 text-left">Nama Unit</th>
            <th class="px-2 py-2 text-left">Tipe</th>
            <th class="px-2 py-2 text-right">Jml Item</th>
            <th class="px-2 py-2 text-right">Total Qty</th>
            <th class="px-2 py-2 text-right">Nilai Tidak Tercatat (Rp)</th>
            <th class="px-2 py-2 w-16">Aksi</th>
          </tr></thead><tbody>
      `;

      if (!rows.length) {
        html += `<tr><td colspan="7" class="p-6 text-center text-slate-400">✅ Tidak ada anomali di semua unit.</td></tr>`;
      } else {
        rows.forEach(r => {
          html += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1 font-mono">${esc(r.unit_kode)}</td>
            <td class="px-2 py-1">${esc(r.unit_nama)}</td>
            <td class="px-2 py-1">${esc(r.unit_tipe)}</td>
            <td class="px-2 py-1 text-right font-semibold">${fmtInt(r.jml_item)}</td>
            <td class="px-2 py-1 text-right text-orange-600">${fmtInt(r.total_qty_selisih)}</td>
            <td class="px-2 py-1 text-right font-bold text-red-700">${fmtInt(r.total_nilai)}</td>
            <td class="px-2 py-1 text-center">
              <button data-anomali-unit-detail="${r.unit_id}" class="text-blue-700 hover:underline">detail</button>
            </td>
          </tr>`;
        });
        html += `<tr class="border-t-2 border-slate-300 bg-slate-50 font-semibold">
          <td colspan="3" class="px-2 py-2">TOTAL</td>
          <td class="px-2 py-2 text-right">${fmtInt(grandItem)}</td>
          <td class="px-2 py-2 text-right text-orange-600">${fmtInt(grandQty)}</td>
          <td class="px-2 py-2 text-right text-red-700">${fmtInt(grandNilai)}</td>
          <td></td>
        </tr>`;
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;

      // Handler klik detail
      body.querySelectorAll('[data-anomali-unit-detail]').forEach(b => {
        b.onclick = () => {
          const uid = Number(b.dataset.anomaliUnitDetail);
          // Pindah ke tab Anomali & filter unit
          selUnit.value = String(uid);
          renderTab('anomali');
        };
      });

      // Export Excel
      const btnExp = document.getElementById('anomali-unit-export');
      if (btnExp) btnExp.onclick = () => {
        const obj = rows.map(r => ({
          'Kode Unit': r.unit_kode, 'Nama Unit': r.unit_nama,
          'Tipe': r.unit_tipe, 'Jml Item': r.jml_item,
          'Total Qty': r.total_qty_selisih,
          'Nilai Tidak Tercatat (Rp)': r.total_nilai,
        }));
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Anomali per Unit');
        XLSX.writeFile(wb, `anomali-per-unit-${Period.label(pid) || ''}.xlsx`);
      };
    }
      
           // --- Tab 7: ANOMALI STOK (pemakaian negatif = pemasukan tidak tercatat) ---
    else if (name === 'anomali') {
      let q = sb.from('v_stok').select('*').eq('period_id', pid).lt('total_pemakaian', 0);
      if (unitId) q = q.eq('unit_id', unitId);
      const { data } = await q;
      const allRows = (data || []).map(r => {
        const selisih = Math.abs(Number(r.total_pemakaian || 0));
        const nilai   = selisih * Number(r.harga_jual_efektif || 0);
        return { ...r, selisih, nilai_selisih: nilai };
      }).sort((a,b) => b.nilai_selisih - a.nilai_selisih);

      const totalSelisih = allRows.reduce((s, r) => s + r.selisih, 0);
      const totalNilai   = allRows.reduce((s, r) => s + r.nilai_selisih, 0);

      const summary = allRows.length
        ? `<div class="mb-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
             <div class="text-sm font-semibold mb-1">⚠️ ${allRows.length} item dengan selisih negatif</div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
               <div>Total tidak tercatat: <b>${fmtInt(totalSelisih)}</b> unit</div>
               <div>Estimasi nilai: <b class="text-red-700">Rp ${fmtInt(totalNilai)}</b></div>
             </div>
             <div class="mt-2 text-red-600">
               Perlu dicek: kemungkinan ada penerimaan/mutasi yang belum diinput,
               atau opname salah input (ketik lebih dari fisik sebenarnya).
             </div>
           </div>`
        : `<div class="mb-3 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">
             ✅ Tidak ada anomali. Semua pemakaian ≥ 0.
           </div>`;

      const cols = [
        ['unit_kode','Unit'], ['item_kode','Kode'], ['item_nama','Nama Item'],
        ['satuan','Satuan'], ['stok_awal','Stok Awal'],
        ['total_penerimaan','Penerimaan'], ['total_mutasi_masuk','Mutasi Masuk'],
        ['opname_qty','Stok Fisik'], ['total_pemakaian','Selisih'],
        ['selisih','Tidak Tercatat'], ['nilai_selisih','Nilai Tidak Tercatat (Rp)'],
        ['harga_jual_efektif','Harga Satuan'],
      ];

      let html = summary;
      html += `<div class="mb-2 flex justify-end">
        <button class="btn btn-success" id="anomali-export">&#11015; Export Excel</button>
      </div>`;
      html += '<div id="anomali-table"></div>';
      body.innerHTML = html;

      const pageSize = 30;
      let currentPage = 1;

      function renderTable() {
        const tbl = document.getElementById('anomali-table');
        const total = allRows.length;
        const totalPage = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPage) currentPage = totalPage;
        const from = (currentPage - 1) * pageSize;
        const pageData = allRows.slice(from, from + pageSize);

        let t = '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
        cols.forEach(c => t += `<th class="px-2 py-2 text-left">${c[1]}</th>`);
        t += '</tr></thead><tbody>';
        pageData.forEach(r => {
          t += '<tr class="border-t hover:bg-slate-50">';
          cols.forEach(c => {
            const v = r[c[0]];
            const h = String(c[1]).toLowerCase();
            const isKodeCol   = h.includes('kode') && !h.includes('nilai');
            const isNum       = v !== null && v !== '' && !isNaN(v) && typeof v !== 'boolean';
            const isSelisih   = h.includes('tidak tercatat') && !h.includes('nilai');
            const isNilai     = h.includes('nilai tidak tercatat');
            const isPemakaian = h.includes('pemakaian');

            let out = '';
            if (v == null)      out = '';
            else if (isKodeCol) out = esc(v);
            else if (isNum)     out = fmtInt(v);
            else                out = esc(v);

            let cls = '';
            if (isSelisih)          cls = 'text-right text-red-700 font-semibold';
            else if (isNilai)       cls = 'text-right text-red-700 font-bold';
            else if (isPemakaian)   cls = 'text-right text-red-600';
            else if (isNum && !isKodeCol) cls = 'text-right';

            t += `<td class="px-2 py-1 ${cls}">${out}</td>`;
          });
          t += '</tr>';
        });
        if (!pageData.length) {
          t += `<tr><td colspan="${cols.length}" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>`;
        }
        t += '</tbody></table></div>';

        if (total > 0) {
          t += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
            <span>Total: <b>${total}</b> item · Halaman ${currentPage}/${totalPage}</span>
            <div class="flex gap-2">
              <button id="anomali-prev" class="btn btn-gray" ${currentPage===1?'disabled':''}>&larr; Prev</button>
              <button id="anomali-next" class="btn btn-gray" ${currentPage>=totalPage?'disabled':''}>Next &rarr;</button>
            </div>
          </div>`;
        }
        tbl.innerHTML = t;

        const prevBtn = document.getElementById('anomali-prev');
        const nextBtn = document.getElementById('anomali-next');
        if (prevBtn) prevBtn.onclick = () => { currentPage--; renderTable(); };
        if (nextBtn) nextBtn.onclick = () => { currentPage++; renderTable(); };
      }

      renderTable();

      const btnExp = document.getElementById('anomali-export');
      if (btnExp) btnExp.onclick = () => {
        const obj = allRows.map(r => {
          const o = {}; cols.forEach(c => o[c[1]] = r[c[0]]); return o;
        });
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Anomali');
        const unitSuffix = selUnit.value ? '-' + (allUnits.find(u=>u.id==selUnit.value)?.kode || '') : '';
        XLSX.writeFile(wb, `anomali-stok${unitSuffix}-${Period.label(pid) || ''}.xlsx`);
      };
    }
    // --- Tab 6: RIWAYAT STOK (2 mode) ---
    else if (name === 'riwayat') {
      body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label class="text-xs text-slate-500">Tampilkan Riwayat per</label>
            <select id="r-mode" class="w-full border rounded px-2 py-1 text-sm">
              <option value="unit">Unit — Nilai Total Stok per Bulan</option>
              <option value="item">Item — Riwayat 1 Barang</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-500">Pilih Unit</label>
            <select id="r-unit" class="w-full border rounded px-2 py-1 text-sm"></select>
          </div>
          <div id="r-item-wrap" class="hidden relative">
            <label class="text-xs text-slate-500">Pilih Item (ketik untuk cari)</label>
            <input id="r-item" class="w-full border rounded px-2 py-1 text-sm" placeholder="Ketik kode atau nama item...">
            <div id="r-suggest" class="hidden absolute bg-white border rounded shadow-lg max-h-64 overflow-auto z-50 mt-1 text-xs left-0 right-0"></div>
          </div>
          <div class="flex items-end">
            <button id="r-load" class="btn btn-primary w-full">Tampilkan Riwayat</button>
          </div>
        </div>
        <div id="r-result" class="text-slate-400 text-sm">Memuat...</div>
      `;

      const rMode = document.getElementById('r-mode');
      const rUnit = document.getElementById('r-unit');
      const rItemWrap = document.getElementById('r-item-wrap');
      const rItem = document.getElementById('r-item');
      const rSug  = document.getElementById('r-suggest');
      const rResult = document.getElementById('r-result');

      rUnit.innerHTML = allUnits.map(u =>
        `<option value="${u.id}">${esc(u.kode)} — ${esc(u.nama)}</option>`
      ).join('');
      rUnit.value = gf?.id || allUnits[0]?.id || '';

      let selectedItem = null;
      const allItems = await TrxPage.loadItems();

      rItem.addEventListener('input', () => {
        const q = rItem.value.trim().toUpperCase();
        if (q.length < 2) { rSug.classList.add('hidden'); return; }
        const matches = allItems.filter(i =>
          i.kode.toUpperCase().includes(q) || i.nama.toUpperCase().includes(q)
        ).slice(0, 30);
        if (!matches.length) { rSug.classList.add('hidden'); return; }
        rSug.innerHTML = matches.map(i =>
          `<div class="px-3 py-1 hover:bg-blue-50 cursor-pointer" data-id="${i.id}" data-kode="${esc(i.kode)}" data-nama="${esc(i.nama)}">
            <b class="font-mono">${esc(i.kode)}</b> — ${esc(i.nama)} <span class="text-slate-400">(${esc(i.satuan)})</span>
          </div>`
        ).join('');
        rSug.classList.remove('hidden');
        rSug.querySelectorAll('div[data-id]').forEach(d => {
          d.onclick = () => {
            selectedItem = { id: Number(d.dataset.id), kode: d.dataset.kode, nama: d.dataset.nama };
            rItem.value = d.dataset.kode + ' — ' + d.dataset.nama;
            rSug.classList.add('hidden');
          };
        });
      });
      rItem.addEventListener('blur', () => setTimeout(() => rSug.classList.add('hidden'), 300));

      function resolveItem() {
        if (selectedItem) return selectedItem;
        const q = rItem.value.trim().toUpperCase();
        if (!q) return null;
        let found = allItems.find(i => i.kode.toUpperCase() === q);
        if (!found) found = allItems.find(i =>
          i.kode.toUpperCase().includes(q) || i.nama.toUpperCase().includes(q));
        if (found) {
          selectedItem = { id: found.id, kode: found.kode, nama: found.nama };
          rItem.value = found.kode + ' — ' + found.nama;
        }
        return selectedItem;
      }

      rMode.onchange = () => {
        if (rMode.value === 'item') {
          rItemWrap.classList.remove('hidden');
          rResult.innerHTML = '<div class="text-slate-400 text-sm">Ketik nama/kode item, lalu klik Tampilkan Riwayat.</div>';
        } else {
          rItemWrap.classList.add('hidden');
          renderUnitHistory(rUnit.value);
        }
      };

      rUnit.onchange = () => {
        if (rMode.value === 'unit') renderUnitHistory(rUnit.value);
      };

      document.getElementById('r-load').onclick = async () => {
        const unitId2 = rUnit.value;
        if (!unitId2) return alert('Pilih unit dulu.');
        if (rMode.value === 'item') {
          const item = resolveItem();
          if (!item) return alert('Item tidak ditemukan. Ketik kode/nama lalu pilih dari saran.');
          await renderItemHistory(unitId2, item);
        } else {
          await renderUnitHistory(unitId2);
        }
      };

      // ---------- Render: Riwayat per Unit (Nilai Total per Bulan) ----------
      async function renderUnitHistory(unitId2) {
        rResult.innerHTML = '<div class="text-slate-500 text-sm">Memuat...</div>';
        const { data, error } = await sb.from('v_stok')
          .select('*').eq('unit_id', Number(unitId2))
          .order('tahun').order('bulan');
        if (error) { rResult.innerHTML = `<div class="text-red-600">${esc(error.message)}</div>`; return; }
        if (!data || !data.length) {
          rResult.innerHTML = '<div class="text-slate-500 text-sm p-3 bg-amber-50 rounded">Belum ada data untuk unit ini.</div>';
          return;
        }
        const agg = {};
        data.forEach(r => {
          const key = r.period_id;
          if (!agg[key]) {
            agg[key] = {
              tahun: r.tahun, bulan: r.bulan,
              stok_awal:0, masuk:0, keluar:0, pakai:0, penyesuaian:0, stok_akhir:0,
              nilai:0, jml_item:0,
            };
          }
          const qty = Number(r.stok_akhir || 0);
          agg[key].stok_awal   += Number(r.stok_awal || 0);
          agg[key].masuk       += Number(r.total_penerimaan||0) + Number(r.total_mutasi_masuk||0);
          agg[key].keluar      += Number(r.total_mutasi_keluar||0);
          agg[key].pakai       += Number(r.total_pemakaian||0);
          agg[key].penyesuaian += Number(r.total_penyesuaian||0);
          agg[key].stok_akhir  += qty;
          agg[key].nilai       += qty * Number(r.harga_jual||0);
          if (qty !== 0) agg[key].jml_item += 1;
        });

        const m = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const rows = Object.values(agg)
          .sort((a,b) => (a.tahun - b.tahun) || (a.bulan - b.bulan))
          .map(r => ({ ...r, bulan_label: `${m[r.bulan]} ${r.tahun}` }));

        const unitName = allUnits.find(u => u.id === Number(unitId2))?.nama || '';
        let html = `<div class="mb-3 text-xs text-slate-600">
          <b>Riwayat Nilai Stok — Unit</b> · <b>${esc(unitName)}</b> · ${rows.length} bulan data
        </div>`;
        html += '<div style="height:300px; position:relative;" class="mb-4"><canvas id="r-chart"></canvas></div>';
        html += '<div class="mb-2 flex justify-end"><button class="btn btn-success" id="r-export">&#11015; Export Excel</button></div>';
        html += '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
        ['Bulan','Jml Item','Stok Awal','Masuk','Keluar','Stok Fisik','Selisih','Nilai (Rp)']
          .forEach(h => html += `<th class="px-2 py-2 text-left">${h}</th>`);
        html += '</tr></thead><tbody>';
        rows.forEach(r => {
          html += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1">${esc(r.bulan_label)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.jml_item)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.stok_awal)}</td>
            <td class="px-2 py-1 text-right text-green-700">${fmtInt(r.masuk)}</td>
            <td class="px-2 py-1 text-right text-orange-600">${fmtInt(r.keluar)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.stok_fisik)}</td>
            <td class="px-2 py-1 text-right text-red-600">${fmtInt(r.pakai)}</td>
            <td class="px-2 py-1 text-right font-semibold">${fmtInt(r.nilai)}</td>
          </tr>`;
        });
        html += '</tbody></table></div>';
        rResult.innerHTML = html;

        const ctx = document.getElementById('r-chart');
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: rows.map(r => r.bulan_label),
              datasets: [
                { label:'Nilai Stok (Rp)', data: rows.map(r => r.nilai),
                  borderColor:'#15803d', backgroundColor:'rgba(21,128,61,.1)',
                  fill:true, tension:.3, yAxisID:'y1' },
                { label:'Stok Akhir (Qty)', data: rows.map(r => r.stok_akhir),
                  borderColor:'#1d4ed8', backgroundColor:'transparent',
                  tension:.3, yAxisID:'y' },
              ]
            },
            options: {
              maintainAspectRatio:false,
              plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{ size:11 } } } },
              scales:{
                y: { type:'linear', position:'left',  beginAtZero:true,
                     title:{ display:true, text:'Qty' } },
                y1:{ type:'linear', position:'right', beginAtZero:true,
                     title:{ display:true, text:'Nilai (Rp)' },
                     grid:{ drawOnChartArea:false } }
              }
            }
          });
        }
        const btn = document.getElementById('r-export');
        if (btn) btn.onclick = () => {
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Unit');
          XLSX.writeFile(wb, `riwayat-${allUnits.find(u=>u.id==unitId2)?.kode}-nilai.xlsx`);
        };
      }

      // ---------- Render: Riwayat per Item ----------
      async function renderItemHistory(unitId2, item) {
        rResult.innerHTML = '<div class="text-slate-500 text-sm">Memuat...</div>';
        const { data, error } = await sb.from('v_stok')
          .select('*')
          .eq('unit_id', Number(unitId2))
          .eq('item_id', item.id)
          .order('tahun').order('bulan');

        if (error) { rResult.innerHTML = `<div class="text-red-600">${esc(error.message)}</div>`; return; }
        if (!data || !data.length) {
          rResult.innerHTML = `<div class="text-slate-500 text-sm p-3 bg-amber-50 rounded">Belum ada data untuk <b>${esc(item.nama)}</b> di unit ini.</div>`;
          return;
        }

        const m = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const rows = data.map(r => ({
          bulan_label: `${m[r.bulan]} ${r.tahun}`,
          stok_awal: r.stok_awal,
          masuk: (r.total_penerimaan || 0) + (r.total_mutasi_masuk || 0),
          keluar: r.total_mutasi_keluar,
          pakai: r.total_pemakaian,
          stok_fisik: r.opname_qty,
          stok_akhir: r.stok_akhir,
          nilai: Number(r.stok_akhir || 0) * Number(r.harga_jual_efektif || 0),
        }));

        const unitName = allUnits.find(u => u.id === Number(unitId2))?.nama || '';
        let html = `<div class="mb-3 text-xs text-slate-600">
          <b>${esc(item.kode)} — ${esc(item.nama)}</b> di <b>${esc(unitName)}</b> · ${rows.length} bulan data
        </div>`;
        html += '<div style="height:260px; position:relative;" class="mb-4"><canvas id="r-chart"></canvas></div>';
        html += '<div class="mb-2 flex justify-end"><button class="btn btn-success" id="r-export">&#11015; Export Excel</button></div>';
        html += '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
        ['Bulan','Stok Awal','Masuk','Keluar','Stok Fisik','Selisih','Stok Akhir','Nilai (Rp)']
          .forEach(h => html += `<th class="px-2 py-2 text-left">${h}</th>`);
        html += '</tr></thead><tbody>';
        rows.forEach(r => {
          html += `<tr class="border-t hover:bg-slate-50">
            <td class="px-2 py-1">${esc(r.bulan_label)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.stok_awal)}</td>
            <td class="px-2 py-1 text-right text-green-700">${fmtInt(r.masuk)}</td>
            <td class="px-2 py-1 text-right text-orange-600">${fmtInt(r.keluar)}</td>
            <td class="px-2 py-1 text-right text-red-600">${fmtInt(r.pakai)}</td>
            <td class="px-2 py-1 text-right font-semibold">${fmtInt(r.stok_fisik)}</td>
            <td class="px-2 py-1 text-right text-red-600">${fmtInt(r.pakai)}</td>
            <td class="px-2 py-1 text-right">${fmtInt(r.nilai)}</td>
          </tr>`;
        });
        html += '</tbody></table></div>';
        rResult.innerHTML = html;

        const ctx = document.getElementById('r-chart');
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: rows.map(r => r.bulan_label),
              datasets: [
                { label:'Stok Akhir', data: rows.map(r => r.stok_akhir),
                  borderColor:'#1d4ed8', backgroundColor:'rgba(29,78,216,.1)',
                  fill:true, tension:.3 },
                { label:'Masuk', data: rows.map(r => r.masuk),
                  borderColor:'#15803d', backgroundColor:'transparent', tension:.3 },
                { label:'Pakai', data: rows.map(r => r.pakai),
                  borderColor:'#dc2626', backgroundColor:'transparent', tension:.3 },
              ]
            },
            options: {
              maintainAspectRatio:false,
              plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{ size:11 } } } },
              scales:{ y:{ beginAtZero:true } }
            }
          });
        }
        const btn = document.getElementById('r-export');
        if (btn) btn.onclick = () => {
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
          XLSX.writeFile(wb, `riwayat-${item.kode}-${allUnits.find(u=>u.id==unitId2)?.kode}.xlsx`);
        };
      }

      // Auto-load: default mode = unit
      if (rMode.value === 'unit') await renderUnitHistory(rUnit.value);
    }
  }

  function tableHTML(rows, cols, tag) {
    if (!rows.length) return '<div class="text-slate-400 text-sm">Tidak ada data.</div>';
    const isUnitTab = tag === 'rekap-unit';
    let html = `<div class="mb-2 flex justify-end">
      <button class="btn btn-success" data-export="${tag}">&#11015; Export Excel</button>
    </div>`;
    html += '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
    cols.forEach(c => html += `<th class="px-2 py-2 text-left">${c[1]}</th>`);
    if (isUnitTab) html += '<th class="px-2 py-2 w-16">Aksi</th>';
    html += '</tr></thead><tbody>';

    rows.forEach(r => {
      html += '<tr class="border-t hover:bg-slate-50">';
      cols.forEach(c => {
        const v = r[c[0]];
        const h = String(c[1]).toLowerCase();
        const isKodeCol = h.includes('kode');
        const isIntCol  = /qty|nilai|stok|pemakaian|realisasi|total|jml|kritis/.test(h);
        const isNum     = v !== null && v !== '' && !isNaN(v) && typeof v !== 'boolean';
        let out = '';
        if (v == null)       out = '';
        else if (isKodeCol)  out = esc(v);
        else if (isNum)      out = isIntCol ? fmtInt(v) : fmtNum(v);
        else                 out = esc(v);
        const rightAlign = isNum && !isKodeCol;
        html += `<td class="px-2 py-1 ${rightAlign ? 'text-right' : ''}">${out}</td>`;
      });
      if (isUnitTab) {
        html += `<td class="px-2 py-1">
          <button data-unit-detail="${r.unit_id}" class="text-blue-700 hover:underline">detail</button>
        </td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    setTimeout(() => {
      const btn = document.querySelector(`[data-export="${tag}"]`);
      if (btn) btn.onclick = () => {
        const unitSuffix = selUnit.value ? '-' + (allUnits.find(u=>u.id==selUnit.value)?.kode || '') : '';
        const obj = rows.map(r => {
          const o = {}; cols.forEach(c => o[c[1]] = r[c[0]]); return o;
        });
        const ws = XLSX.utils.json_to_sheet(obj);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, tag.slice(0,30));
        XLSX.writeFile(wb, `${tag}${unitSuffix}-${Period.label(pid) || ''}.xlsx`);
      };
    }, 0);

    return html;
  }

  document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => renderTab(b.dataset.tab));
  await renderTab('rko');
}

// ===================================================
// RENDER BADGE FLAG HARGA
// ===================================================
function renderFlagBadge(flag, catatan) {
  if (!flag) return '';
  const config = {
    'jual_0':         { label: '💰 Jual 0',       cls: 'bg-red-100 text-red-700' },
    'beli_0':         { label: '💰 Beli 0',       cls: 'bg-red-100 text-red-700' },
    'jual_1':         { label: '⚠️ Jual Rp1',     cls: 'bg-red-100 text-red-700' },
    'margin_parah':   { label: '🔴 Margin!',      cls: 'bg-red-100 text-red-700' },
    'margin_negatif': { label: '🟠 Margin−',      cls: 'bg-orange-100 text-orange-800' },
    'margin_0':       { label: '🟡 Margin 0%',    cls: 'bg-amber-100 text-amber-800' },
  };
  const c = config[flag];
  if (!c) return `<span class="text-xs text-slate-400">${esc(flag)}</span>`;
  return `<span class="px-2 py-0.5 rounded text-[10px] font-semibold ${c.cls}" title="${esc(catatan || '')}">${c.label}</span>`;
}

// ---------- PAGE: MASTER ITEM ----------
async function pageMasterItem() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="grid grid-cols-1 md:grid-cols-7 gap-3">
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
        <div>
          <label class="text-xs text-slate-500">Flag Harga</label>
          <select id="i-flag" class="w-full border rounded px-2 py-1 text-sm">
            <option value="">Semua</option>
            <option value="__any__">⚠️ Semua Flag</option>
            <option value="jual_0">💰 Harga Jual 0</option>
            <option value="beli_0">💰 Harga Beli 0</option>
            <option value="jual_1">⚠️ Harga Jual Rp1</option>
            <option value="margin_parah">🔴 Margin Parah</option>
            <option value="margin_negatif">🟠 Margin Negatif</option>
            <option value="margin_0">🟡 Margin 0%</option>
            <option value="__normal__">✅ Normal</option>
          </select>
        </div>
        <div class="flex items-end">
          <button id="i-search" class="btn btn-primary w-full">Cari</button>
        </div>
        <div class="flex items-end gap-2">
          <button id="i-paste" class="btn btn-indigo flex-1">Paste Excel</button>
          <button id="i-add" class="btn btn-primary flex-1">+ Tambah Item</button>
          <button id="i-export" class="btn btn-success flex-1">Export</button>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow">
      <div id="i-table"></div>
      <div id="i-pager" class="p-3 flex items-center justify-between border-t text-sm"></div>
    </div>
  `;

  let page = 1, pageSize = 20, total = 0;

  async function load() {
    const div = document.getElementById('i-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    const q = document.getElementById('i-q').value.trim();
    const kat = document.getElementById('i-kat').value;
    const flag = document.getElementById('i-flag').value;
    const from = (page-1) * pageSize;
    const to = from + pageSize - 1;

    let query = sb.from('items').select('*', { count:'exact' }).range(from, to).order('nama');
    if (q) {
      // Search di server, bersihkan karakter khusus PostgREST
      const safe = q.replace(/[%_,()]/g, '').trim();
      if (safe) query = query.or(`kode.ilike.%${safe}%,nama.ilike.%${safe}%`);
    }
    if (kat) query = query.eq('grup', kat);
    if (flag === '__any__')         query = query.not('flag_harga', 'is', null);
    else if (flag === '__normal__') query = query.is('flag_harga', null);
    else if (flag)                  query = query.eq('flag_harga', flag);
    const { data, error, count } = await query;
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    total = count || 0;

    // Tidak perlu filter client-side, sudah di server
    const filteredData = data || [];

    let html = '<div class="table-scroll"><table class="w-full text-xs"><thead><tr>';
    ['Kode','Nama','Kategori','Satuan','Kemasan','Isi','Harga Beli','Harga Jual','Min Stok','Aktif','Flag','Aksi'].forEach(h =>
      html += `<th class="px-2 py-2 text-left">${h}</th>`);
    html += '</tr></thead><tbody>';
    (filteredData||[]).forEach(r => {
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1 font-mono">${esc(r.kode)}</td>
        <td class="px-2 py-1">${esc(r.nama)}</td>
        <td class="px-2 py-1">${esc(r.kategori)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1">${esc(r.satuan_kemasan || '-')}</td>
        <td class="px-2 py-1 text-right">${r.isi_kemasan ? fmtNum(r.isi_kemasan, 0) : '1'}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.harga_beli)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.harga_jual)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.min_stok,0)}</td>
        <td class="px-2 py-1 text-center">${r.aktif ? '✓' : '×'}</td>
        <td class="px-2 py-1 text-center">${renderFlagBadge(r.flag_harga, r.flag_catatan)}</td>
        <td class="px-2 py-1 whitespace-nowrap">
          <button data-edit="${r.id}" class="text-blue-700 hover:underline mr-2">edit</button>
          <button data-del="${r.id}" class="text-red-600 hover:underline">hapus</button>
        </td>
      </tr>`;
    });
   if (!filteredData?.length) html += '<tr><td colspan="12" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>';
    html += '</tbody></table></div>';
    div.innerHTML = html;

    div.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
      const id = Number(b.dataset.edit);
      const { data: item, error } = await sb.from('items').select('*').eq('id', id).single();
      if (error) return alert(error.message);
      const updated = await showEditItemModal(item);
      if (updated) load();
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
  document.getElementById('i-flag').onchange = () => { page = 1; load(); };

  document.getElementById('i-add').onclick = async () => {
    const newItem = await showAddItemModal();
    if (newItem) { page = 1; load(); }
  };
  document.getElementById('i-paste').onclick = async () => {
    const n = await PasteModal.open({
      title: 'Paste Master Item (Obat & BMHP)',
      hint: 'Kolom: kode, nama, kategori, satuan, harga_jual, min_stok. Baris pertama (header) otomatis di-skip.',
      columns: [
        { key:'kode',           label:'Kode',            required:true },
        { key:'nama',           label:'Nama',            required:true },
        { key:'kategori',       label:'Kategori',        required:true },
        { key:'satuan',         label:'Satuan',          required:true },
        { key:'satuan_kemasan', label:'Satuan Kemasan' },
        { key:'isi_kemasan',    label:'Isi Kemasan' },
        { key:'harga_beli',     label:'Harga Beli' },
        { key:'harga_jual',     label:'Harga Jual' },
        { key:'min_stok',       label:'Min Stok' },
      ],
      validate: async (rows, { parseNumber }) => {
        const out = { rows: [], errors: [] };
        const seen = new Set();
        rows.forEach((cells, i) => {
          const rowNum = i + 1;
          const raw = {
            kode: cells[0] || '', nama: cells[1] || '', kategori: cells[2] || '',
            satuan: cells[3] || '', satuan_kemasan: cells[4] || '',
            isi_kemasan: cells[5] || '', harga_beli: cells[6] || '',
            harga_jual: cells[7] || '', min_stok: cells[8] || ''
          };
          let err = null;
          const kode = String(raw.kode).trim().toUpperCase();
          const katRaw = String(raw.kategori || '').trim().toUpperCase().replace(/\s+/g, ' ');

          const KATEGORI_VALID = [
            'B3', 'BMHP', 'NUTRISI ENTERAL', 'OBAT',
            'PROGRAM', 'PROGRAM BKKBN', 'PROGRAM COVID', 'PROGRAM HIV',
            'PROGRAM IMUNISASI', 'PROGRAM MALARIA', 'PROGRAM RABIES',
            'PROGRAM STUNTING', 'PROGRAM TB',
          ];

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
          const satuanKemasan = String(raw.satuan_kemasan || '').trim().toUpperCase() || null;
          const isiKemasan = parseNumber(raw.isi_kemasan) ?? 1;
          out.rows.push({
            kode,
            nama: String(raw.nama).trim(),
            kategori,
            grup,
            satuan: String(raw.satuan).trim(),
            satuan_kemasan: satuanKemasan,
            isi_kemasan: isiKemasan,
            harga_beli: parseNumber(raw.harga_beli) ?? 0,
            harga_jual: parseNumber(raw.harga_jual) ?? 0,
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
  el.innerHTML = `<div class="bg-white rounded-xl shadow"><div id="u-table" class="table-scroll"></div></div>`;

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
    <div class="bg-white rounded-xl shadow"><div id="p-table" class="table-scroll"></div></div>
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

// ---------- PAGE: HARGA PERIODE ----------
async function pageHargaPeriode() {
  const el = document.getElementById('page-content');
  const pid = window.activePeriodId;
  if (!pid) {
    el.innerHTML = '<div class="p-4 bg-amber-50 text-amber-700 rounded">Pilih periode dulu.</div>';
    return;
  }

  el.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-sm text-slate-600">
            Periode: <b>${Period.label(pid)}</b>
            <span id="hp-status" class="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">open</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            Harga jual satuan terkecil per item untuk periode ini.
            Kalau kosong → fallback ke harga jual master.
          </div>
        </div>
        <div class="flex gap-2">
          <button id="hp-paste" class="btn btn-indigo">📋 Paste Excel</button>
          <button id="hp-copy-prev" class="btn btn-gray">📄 Copy dari Periode Sebelumnya</button>
          <button id="hp-reset-master" class="btn btn-gray">↺ Reset ke Master</button>
          <button id="hp-export" class="btn btn-success">⬇ Export</button>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow">
      <div id="hp-table" class="table-scroll"></div>
    </div>
  `;

  let page = 1, pageSize = 30, total = 0, currentData = [];

  async function load() {
    const div = document.getElementById('hp-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';

    // Cek status periode
    const { data: period } = await sb.from('periods').select('status').eq('id', pid).single();
    const isClosed = period?.status === 'closed';
    const statusEl = document.getElementById('hp-status');
    if (statusEl) {
      statusEl.textContent = isClosed ? 'closed' : 'open';
      statusEl.className = `ml-2 text-xs px-2 py-0.5 rounded ${isClosed ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`;
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await sb.from('items')
      .select('id,kode,nama,satuan,kategori,harga_jual,harga_jual_locked', { count: 'exact' })
      .eq('aktif', true)
      .order('nama')
      .range(from, to);
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    total = count || 0;

    // Ambil harga periode untuk item di halaman ini
    const itemIds = (data || []).map(r => r.id);
    let hargaMap = {};
    if (itemIds.length) {
      const { data: hp } = await sb.from('item_harga_periode')
        .select('item_id,harga_jual,is_locked,sumber')
        .eq('period_id', pid)
        .in('item_id', itemIds);
      (hp || []).forEach(h => { hargaMap[h.item_id] = h; });
    }

    currentData = (data || []).map(r => ({
      ...r,
      harga_periode: hargaMap[r.id]?.harga_jual,
      is_locked: hargaMap[r.id]?.is_locked || false,
      sumber: hargaMap[r.id]?.sumber || null,
    }));

    let html = '<table class="w-full text-xs"><thead><tr>';
    ['Kode', 'Nama', 'Satuan', 'Kategori', 'Harga Jual Master', 'Harga Jual Periode', 'Sumber', 'Status', 'Aksi']
      .forEach(h => html += `<th class="px-2 py-2 text-left">${h}</th>`);
    html += '</tr></thead><tbody>';
    currentData.forEach(r => {
      const beda = r.harga_periode != null && Number(r.harga_periode) !== Number(r.harga_jual);
      const badgeSumber = r.sumber
        ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">${esc(r.sumber)}</span>`
        : '<span class="text-slate-400">—</span>';
      const badgeLock = r.is_locked
        ? '<span class="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">🔒 locked</span>'
        : '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">open</span>';
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1 font-mono">${esc(r.kode)}</td>
        <td class="px-2 py-1">${esc(r.nama)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1">${esc(r.kategori)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.harga_jual)}</td>
        <td class="px-2 py-1 text-right font-semibold ${beda ? 'text-amber-700' : ''}">${r.harga_periode != null ? fmtNum(r.harga_periode) : '<span class="text-slate-400">— fallback —</span>'}</td>
        <td class="px-2 py-1 text-center">${badgeSumber}</td>
        <td class="px-2 py-1 text-center">${badgeLock}</td>
        <td class="px-2 py-1 whitespace-nowrap">
          ${r.is_locked || isClosed
            ? '<span class="text-slate-400 text-xs">terkunci</span>'
            : `<button data-edit="${r.id}" class="text-blue-700 hover:underline">edit</button>
               ${r.harga_periode != null ? `<button data-reset="${r.id}" class="text-red-600 hover:underline ml-2">reset</button>` : ''}`}
        </td>
      </tr>`;
    });
    if (!currentData.length) html += '<tr><td colspan="9" class="p-6 text-center text-slate-400">Tidak ada item aktif.</td></tr>';
    html += '</tbody></table>';

    const totalPage = Math.max(1, Math.ceil(total / pageSize));
    html += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
      <span>Total: <b>${total}</b> item · Halaman ${page}/${totalPage}</span>
      <div class="flex gap-2">
        <button id="hp-prev" class="btn btn-gray" ${page===1?'disabled':''}>&larr; Prev</button>
        <button id="hp-next" class="btn btn-gray" ${page>=totalPage?'disabled':''}>Next &rarr;</button>
      </div>
    </div>`;
    div.innerHTML = html;

    document.getElementById('hp-prev').onclick = () => { if (page>1) { page--; load(); } };
    document.getElementById('hp-next').onclick = () => { if (page<totalPage) { page++; load(); } };

    div.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
      const id = Number(b.dataset.edit);
      const item = currentData.find(x => x.id === id);
      const newVal = prompt(`Harga jual periode untuk:\n${item.kode} — ${item.nama}\n\nHarga jual master: ${fmtNum(item.harga_jual)}\nHarga periode sekarang: ${item.harga_periode != null ? fmtNum(item.harga_periode) : '(fallback master)'}\n\nMasukkan harga jual periode:`, item.harga_periode ?? item.harga_jual);
      if (newVal == null) return;
      const harga = Number(newVal);
      if (isNaN(harga) || harga < 0) return alert('Harga tidak valid.');
      const { error } = await sb.from('item_harga_periode').upsert([{
        period_id: pid, item_id: id, harga_jual: harga, sumber: 'manual',
      }], { onConflict: 'period_id,item_id' });
      if (error) return alert(error.message);
      toast('Harga periode disimpan', 'success');
      load();
    });

    div.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
      if (!confirm('Hapus harga periode untuk item ini? Akan fallback ke master.')) return;
      const { error } = await sb.from('item_harga_periode')
        .delete().eq('period_id', pid).eq('item_id', Number(b.dataset.reset));
      if (error) return alert(error.message);
      load();
    });
  }

  document.getElementById('hp-paste').onclick = async () => {
    const n = await PasteModal.open({
      title: `Paste Harga Jual Periode — ${Period.label(pid)}`,
      hint: 'Kolom: kode, harga_jual. Baris pertama (header) otomatis di-skip.',
      columns: [
        { key: 'kode', label: 'Kode Item', required: true },
        { key: 'harga_jual', label: 'Harga Jual', required: true },
      ],
      validate: async (rows, { parseNumber }) => {
        const items = await TrxPage.loadItems();
        const iMap = mapByKodeFromItems(items);
        const out = { rows: [], errors: [] };
        rows.forEach((cells, i) => {
          const kode = String(cells[0] || '').trim().toUpperCase();
          const harga = parseNumber(cells[1]);
          if (!kode) { out.errors.push({ rowNum: i+1, raw: { kode: '', harga_jual: cells[1] }, msg: 'Kode wajib' }); return; }
          if (harga == null || harga < 0) { out.errors.push({ rowNum: i+1, raw: { kode, harga_jual: cells[1] }, msg: 'Harga tidak valid' }); return; }
          const it = iMap.get(kode);
          if (!it) { out.errors.push({ rowNum: i+1, raw: { kode, harga_jual: harga }, msg: `Kode "${kode}" tidak ditemukan` }); return; }
          out.rows.push({ period_id: pid, item_id: it.id, harga_jual: harga, sumber: 'manual' });
        });
        return out;
      },
      onCommit: async (rows) => {
        await PasteModal.bulkUpsert('item_harga_periode', rows, ['period_id','item_id']);
      },
    });
    if (n) { toast(`${n} harga periode disimpan`, 'success'); load(); }
  };

  document.getElementById('hp-copy-prev').onclick = async () => {
    // Cari periode sebelumnya (bulan -1)
    const cur = Period.list.find(p => p.id === pid);
    if (!cur) return alert('Periode tidak ditemukan.');
    let prevBulan = cur.bulan - 1, prevTahun = cur.tahun;
    if (prevBulan === 0) { prevBulan = 12; prevTahun = cur.tahun - 1; }
    const prev = Period.list.find(p => p.bulan === prevBulan && p.tahun === prevTahun);
    if (!prev) return alert(`Periode sebelumnya (${prevBulan}/${prevTahun}) tidak ditemukan.`);
    if (!confirm(`Copy semua harga periode dari ${Period.label(prev.id)} ke ${Period.label(pid)}?`)) return;
    const { data, error } = await sb.from('item_harga_periode')
      .select('item_id,harga_jual').eq('period_id', prev.id);
    if (error) return alert(error.message);
    if (!data?.length) return alert('Periode sebelumnya tidak punya data harga.');
    const rows = data.map(r => ({ period_id: pid, item_id: r.item_id, harga_jual: r.harga_jual, sumber: 'copy_prev' }));
    await PasteModal.bulkUpsert('item_harga_periode', rows, ['period_id','item_id']);
    toast(`${rows.length} harga disalin`, 'success');
    load();
  };

  document.getElementById('hp-reset-master').onclick = async () => {
    if (!confirm('Hapus semua harga periode untuk periode ini? Semua item akan fallback ke master.')) return;
    const { error } = await sb.from('item_harga_periode').delete().eq('period_id', pid);
    if (error) return alert(error.message);
    toast('Harga periode direset', 'success');
    load();
  };

  document.getElementById('hp-export').onclick = async () => {
    const { data } = await sb.from('items')
      .select('kode,nama,satuan,kategori,harga_jual').eq('aktif', true).order('nama');
    const { data: hp } = await sb.from('item_harga_periode')
      .select('item_id,harga_jual').eq('period_id', pid);
    const hpMap = {};
    (hp || []).forEach(h => { hpMap[h.item_id] = h.harga_jual; });
    // Ambil item_id juga
    const { data: itemsFull } = await sb.from('items').select('id,kode').eq('aktif', true);
    const idByKode = {}; (itemsFull||[]).forEach(i => idByKode[i.kode] = i.id);
    const obj = (data || []).map(r => ({
      kode: r.kode, nama: r.nama, satuan: r.satuan, kategori: r.kategori,
      harga_jual_master: r.harga_jual,
      harga_jual_periode: hpMap[idByKode[r.kode]] ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(obj);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Harga Periode');
    XLSX.writeFile(wb, `harga-periode-${Period.label(pid)}.xlsx`);
  };

  await load();
}

// Helper: map items by kode/nama (reuse logic TrxPage)
function mapByKodeFromItems(arr) {
  const m = new Map();
  arr.forEach(x => {
    if (x.kode) m.set(String(x.kode).trim().toUpperCase(), x);
    if (x.nama) m.set(String(x.nama).trim().toUpperCase().replace(/\s+/g,' '), x);
  });
  return m;
}

// ---------- PAGE: KOREKSI HARGA JUAL MASTER ----------
async function pageKoreksiHargaJual() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 text-sm text-amber-800">
      ⚠️ <b>Halaman khusus koreksi harga jual master.</b>
      Harga jual master terkunci otomatis setelah ada opname. Koreksi di sini akan tercatat di log dengan alasan wajib.
      <br>Perubahan harga jual master <b>hanya memengaruhi fallback</b> — harga periode tetap dipakai untuk laporan historis.
    </div>
    <div class="bg-white rounded-xl shadow p-4 mb-3">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs text-slate-500">Cari (kode/nama)</label>
          <input id="kh-q" class="w-full border rounded px-2 py-1 text-sm" placeholder="ketik...">
        </div>
        <div>
          <label class="text-xs text-slate-500">Status Kunci</label>
          <select id="kh-lock" class="w-full border rounded px-2 py-1 text-sm">
            <option value="">Semua</option>
            <option value="locked">🔒 Terkunci</option>
            <option value="unlocked">🔓 Belum terkunci</option>
          </select>
        </div>
        <div class="flex items-end">
          <button id="kh-search" class="btn btn-primary w-full">Cari</button>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow"><div id="kh-table" class="table-scroll"></div></div>
  `;

  let page = 1, pageSize = 20, total = 0;

  async function load() {
    const div = document.getElementById('kh-table');
    div.innerHTML = '<div class="p-6 text-slate-500 text-sm">Memuat...</div>';
    const q = document.getElementById('kh-q').value.trim();
    const lock = document.getElementById('kh-lock').value;
    const from = (page-1) * pageSize, to = from + pageSize - 1;

    let query = sb.from('items')
      .select('id,kode,nama,satuan,kategori,harga_jual,harga_jual_locked,harga_jual_locked_at', { count: 'exact' })
      .range(from, to).order('nama');
    if (q) {
      const safe = q.replace(/[%_,()]/g, '').trim();
      if (safe) query = query.or(`kode.ilike.%${safe}%,nama.ilike.%${safe}%`);
    }
    if (lock === 'locked') query = query.eq('harga_jual_locked', true);
    else if (lock === 'unlocked') query = query.eq('harga_jual_locked', false);

    const { data, error, count } = await query;
    if (error) { div.innerHTML = `<div class="p-4 text-red-600">${esc(error.message)}</div>`; return; }
    total = count || 0;

    let html = '<table class="w-full text-xs"><thead><tr>';
    ['Kode','Nama','Satuan','Kategori','Harga Jual','Status','Aksi']
      .forEach(h => html += `<th class="px-2 py-2 text-left">${h}</th>`);
    html += '</tr></thead><tbody>';
    (data || []).forEach(r => {
      const lockBadge = r.harga_jual_locked
        ? `<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">🔒 terkunci</span>`
        : `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">🔓 terbuka</span>`;
      html += `<tr class="border-t hover:bg-slate-50">
        <td class="px-2 py-1 font-mono">${esc(r.kode)}</td>
        <td class="px-2 py-1">${esc(r.nama)}</td>
        <td class="px-2 py-1">${esc(r.satuan)}</td>
        <td class="px-2 py-1">${esc(r.kategori)}</td>
        <td class="px-2 py-1 text-right">${fmtNum(r.harga_jual)}</td>
        <td class="px-2 py-1 text-center">${lockBadge}</td>
        <td class="px-2 py-1">
          <button data-koreksi="${r.id}" class="text-blue-700 hover:underline">koreksi</button>
        </td>
      </tr>`;
    });
    if (!data?.length) html += '<tr><td colspan="7" class="p-6 text-center text-slate-400">Tidak ada item.</td></tr>';
    html += '</tbody></table>';

    const totalPage = Math.max(1, Math.ceil(total / pageSize));
    html += `<div class="p-3 flex items-center justify-between border-t text-sm bg-white">
      <span>Total: <b>${total}</b> item · Halaman ${page}/${totalPage}</span>
      <div class="flex gap-2">
        <button id="kh-prev" class="btn btn-gray" ${page===1?'disabled':''}>&larr; Prev</button>
        <button id="kh-next" class="btn btn-gray" ${page>=totalPage?'disabled':''}>Next &rarr;</button>
      </div>
    </div>`;
    div.innerHTML = html;

    document.getElementById('kh-prev').onclick = () => { if (page>1) { page--; load(); } };
    document.getElementById('kh-next').onclick = () => { if (page<totalPage) { page++; load(); } };

    div.querySelectorAll('[data-koreksi]').forEach(b => b.onclick = async () => {
      const id = Number(b.dataset.koreksi);
      const { data: item } = await sb.from('items').select('*').eq('id', id).single();
      if (!item) return;

      // Modal koreksi
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-bold">Koreksi Harga Jual Master</h3>
            <button data-close class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
          </div>
          <div class="p-6 space-y-3">
            <div class="text-xs text-slate-500">Kode: <b class="font-mono">${esc(item.kode)}</b></div>
            <div class="text-sm">${esc(item.nama)}</div>
            <div>
              <label class="text-xs text-slate-500">Harga Jual Lama</label>
              <input class="w-full border rounded px-2 py-1 text-sm bg-slate-100" value="${fmtNum(item.harga_jual)}" readonly>
            </div>
            <div>
              <label class="text-xs text-slate-500">Harga Jual Baru <span class="text-red-500">*</span></label>
              <input data-f="harga" type="number" class="w-full border rounded px-2 py-1 text-sm" value="${item.harga_jual}">
            </div>
            <div>
              <label class="text-xs text-slate-500">Alasan Koreksi <span class="text-red-500">*</span></label>
              <textarea data-f="alasan" rows="3" class="w-full border rounded px-2 py-1 text-sm" placeholder="mis. Koreksi tarif dari SIM RS, salah input awal, dll"></textarea>
            </div>
            <div data-msg class="text-sm"></div>
          </div>
          <div class="px-6 py-3 border-t flex justify-end gap-2">
            <button data-close class="btn btn-gray">Batal</button>
            <button data-save class="btn btn-success">Simpan Koreksi</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const $ = (s) => modal.querySelector(s);
      modal.querySelectorAll('[data-close]').forEach(x => x.onclick = () => modal.remove());
      $('[data-f="harga"]').focus();

      $('[data-save]').onclick = async () => {
        const harga = Number($('[data-f="harga"]').value);
        const alasan = $('[data-f="alasan"]').value.trim();
        if (isNaN(harga) || harga < 0) { $('[data-msg]').innerHTML = '<span class="text-red-600">Harga tidak valid.</span>'; return; }
        if (!alasan) { $('[data-msg]').innerHTML = '<span class="text-red-600">Alasan wajib diisi.</span>'; return; }
        if (harga === Number(item.harga_jual)) { 
          $('[data-msg]').innerHTML = '<span class="text-amber-600">Harga sama dengan sebelumnya, tidak ada perubahan.</span>'; 
          return; 
        }

        $('[data-save]').disabled = true;
        $('[data-save]').textContent = 'Menyimpan...';

        // 1. Simpan ke items
        const { error: err1 } = await sb.from('items')
          .update({ harga_jual: harga })
          .eq('id', item.id);
        if (err1) {
          $('[data-msg]').innerHTML = `<span class="text-red-600">Gagal: ${esc(err1.message)}</span>`;
          $('[data-save]').disabled = false;
          $('[data-save]').textContent = 'Simpan Koreksi';
          return;
        }

        // 2. Catat log
        const { data: userData } = await sb.auth.getUser();
        await sb.from('items_harga_jual_log').insert([{
          item_id: item.id,
          harga_jual_lama: item.harga_jual,
          harga_jual_baru: harga,
          alasan: alasan,
          diubah_oleh: userData?.user?.id || null
        }]);

        toast('Harga jual master dikoreksi', 'success');
        modal.remove();
        load(); // Refresh tabel
      };
    });
  }

  document.getElementById('kh-search').onclick = () => { page = 1; load(); };
  document.getElementById('kh-q').addEventListener('keydown', e => { if (e.key==='Enter'){ page = 1; load(); }});
  document.getElementById('kh-lock').onchange = () => { page = 1; load(); };

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
        .select('id,qty_rko,harga_rko,satuan_input,ket,item_id, items(kode,nama,satuan,satuan_kemasan,isi_kemasan,harga_beli)')
        .eq('period_id', pid).order('id', { ascending:false }).limit(3000);
      return {
        error,
        data: (data||[]).map(r => ({
          id: r.id,
          item_kode: r.items?.kode,
          item_nama: r.items?.nama,
          satuan: r.items?.satuan,
          satuan_kemasan: r.items?.satuan_kemasan,
          isi_kemasan: r.items?.isi_kemasan,
          qty_rko: r.qty_rko,
          satuan_input: r.satuan_input || r.items?.satuan_kemasan || r.items?.satuan,
          harga_rko: r.harga_rko,
          ket: r.ket,
        }))
      };
    },
    columns: [
      { key:'item_kode',     label:'Kode Item',    type:'item_code', required:true },
      { key:'item_nama',     label:'Nama Item' },
      { key:'satuan_kemasan',label:'Kemasan' },
      { key:'qty_rko',       label:'Qty RKO',      type:'number', required:true },
      { key:'satuan_input',  label:'Satuan Input' },
      { key:'harga_rko',     label:'Harga Beli',   type:'number' },
      { key:'isi_kemasan',   label:'Isi' },
      { key:'ket',           label:'Ket' },
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
      { key:'tanggal',     label:'Tanggal',     type:'date' },
      { key:'no_dokumen',  label:'No Dokumen' },
      { key:'item_kode',   label:'Kode Item',   type:'item_code', required:true },
      { key:'item_nama',   label:'Nama Item' },
      { key:'unit_asal',   label:'Unit Asal',   type:'unit_code', idKey:'unit_asal_id' },
      { key:'unit_tujuan', label:'Unit Tujuan', type:'unit_code', required:true, idKey:'unit_tujuan_id' },
      { key:'qty',         label:'Qty',         type:'number', required:true },
      { key:'jenis',       label:'Jenis' },
      { key:'ket',         label:'Ket' },
    ],
  postValidate: (parsed) => {                                    // ← TAMBAH 3
      if (!parsed.tanggal) {                                       //   BARIS INI
        const p = Period.list.find(x => x.id === parsed.period_id);
        if (p) {
          const m = String(p.bulan).padStart(2, '0');
          parsed.tanggal = `${p.tahun}-${m}-01`;
        }
      }
      return null;
    },
  });
}

// ---------- PAGE: TRX OPNAME ----------
async function pageOpname(periodId) {
  await TrxPage.render({
    periodId,
    title: 'Opname — Sisa Fisik Akhir Bulan',
    table: 'opname',
    query: async (pid) => {
      const { data, error } = await sb.from('opname')
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
      { key:'qty',       label:'Qty (+/-)',  type:'number', required:true },
      { key:'ket',       label:'Ket' },
      { key:'harga_jual',label:'Harga Jual', type:'number' },   // ← BARU
    ],
    // Override onCommit default: pisahkan opname qty & harga jual periode
    onCommit: async (rows) => {
      // 1. Simpan qty opname
      const opnameRows = rows.map(r => ({
        period_id: periodId,
        item_id: r.item_id,
        unit_id: r.unit_id,
        qty: r.qty,
        ket: r.ket,
      }));
      await PasteModal.bulkUpsert('opname', opnameRows, ['period_id','item_id','unit_id']);

      // 2. Upsert harga jual periode (kalau diisi)
      const hargaRows = rows.filter(r => r.harga_jual != null && Number(r.harga_jual) > 0);
      if (hargaRows.length) {
        // Validasi konsistensi antar unit untuk item yang sama
        const byItem = {};
        for (const r of hargaRows) {
          const h = Number(r.harga_jual);
          if (byItem[r.item_id] !== undefined && byItem[r.item_id] !== h) {
            throw new Error(`Harga jual item ${r.item_nama || r.item_id} beda antar unit (${byItem[r.item_id]} vs ${h}). Pastikan konsisten.`);
          }
          byItem[r.item_id] = h;
        }
        // Cek periode belum locked
        const { data: lockedCheck } = await sb.from('item_harga_periode')
          .select('item_id,is_locked')
          .eq('period_id', periodId)
          .in('item_id', Object.keys(byItem).map(Number))
          .eq('is_locked', true)
          .limit(1);
        if (lockedCheck && lockedCheck.length) {
          throw new Error('Periode sudah dikunci. Harga jual tidak bisa diubah. Buka kembali periode jika perlu koreksi.');
        }
        // Upsert harga jual periode
        const upsertRows = Object.entries(byItem).map(([itemId, harga]) => ({
          period_id: periodId,
          item_id: Number(itemId),
          harga_jual: harga,
          sumber: 'paste_opname',
        }));
        await PasteModal.bulkUpsert('item_harga_periode', upsertRows, ['period_id','item_id']);
      }
    },
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
  Router.register('harga-periode', { title:'Harga Jual Periode',   render: pageHargaPeriode }); // <-- BARU
  Router.register('koreksi-harga', { title:'Koreksi Harga Master', render: pageKoreksiHargaJual }); // <-- BARU
  Router.register('rko',         { title:'RKO',                    render: () => pageRKO(window.activePeriodId) });
  Router.register('penerimaan',  { title:'Penerimaan / Realisasi', render: () => pagePenerimaan(window.activePeriodId) });
  Router.register('mutasi',      { title:'Mutasi ke Unit',         render: () => pageMutasi(window.activePeriodId) });
  Router.register('opname',      { title:'Opname',                 render: () => pageOpname(window.activePeriodId) });

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
