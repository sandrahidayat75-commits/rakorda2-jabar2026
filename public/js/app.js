/**
 * Main Application Orchestrator - RAKORDA II JABAR 2026
 * Updated with 6 Sessions (6 & 7 Des 2026, Day 3 Not Scanned)
 * Excel/CSV Import & Export for Participants
 */

window.currentUser = {
  username: "admin",
  role: "ADMIN",
  nama: "Administrator Rakorda"
};

let currentParticipantsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  initNavigation();
  await loadDashboardStats();
  await loadParticipantsTable();

  if (window.initCardCertModule) window.initCardCertModule();
  if (window.loadAttendanceReport) window.loadAttendanceReport();

  const searchPart = document.getElementById('search-participant');
  if (searchPart) {
    searchPart.addEventListener('input', debounce(() => loadParticipantsTable(), 300));
  }
  const filterCat = document.getElementById('filter-category');
  if (filterCat) {
    filterCat.addEventListener('change', () => loadParticipantsTable());
  }

  const reportSearch = document.getElementById('report-search');
  if (reportSearch) {
    reportSearch.addEventListener('input', debounce(() => window.loadAttendanceReport(), 300));
  }
  const reportCat = document.getElementById('report-cat-filter');
  if (reportCat) {
    reportCat.addEventListener('change', () => window.loadAttendanceReport());
  }
  const reportSession = document.getElementById('report-session-filter');
  if (reportSession) {
    reportSession.addEventListener('change', () => window.loadAttendanceReport());
  }
});

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function initClock() {
  const clockEl = document.getElementById('header-live-clock');
  const update = () => {
    if (!clockEl) return;
    const now = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockEl.textContent = now.toLocaleDateString('id-ID', opts).replace(/\./g, ':');
  };
  update();
  setInterval(update, 1000);
}

// -------------------------------------------------------------
// NAVIGATION (5 MENUS)
// -------------------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

window.switchTab = function(tabId) {
  if (window.currentUser.role === 'PETUGAS') {
    if (tabId === 'tab-peserta' || tabId === 'tab-cards') {
      showToast("Akses ditolak: Menu ini hanya untuk Administrator", "danger");
      return;
    }
  }

  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-tab') === tabId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(tabId);
  if (activePane) {
    activePane.classList.add('active');
  }

  if (tabId === 'tab-dashboard') {
    loadDashboardStats();
  } else if (tabId === 'tab-peserta') {
    loadParticipantsTable();
  } else if (tabId === 'tab-cards') {
    if (window.initCardCertModule) window.initCardCertModule();
  } else if (tabId === 'tab-laporan') {
    if (window.loadAttendanceReport) window.loadAttendanceReport();
  }
};

// -------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------
window.loadDashboardStats = async function() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    document.getElementById('stat-total-peserta').textContent = data.total_peserta || 0;
    document.getElementById('stat-total-reg').textContent = data.total_registrasi || 0;

    // 7 Sessions
    const elH1Reg = document.getElementById('stat-h1-reg');
    if (elH1Reg) elH1Reg.textContent = data.h1_reg || 0;
    document.getElementById('stat-h1-s1').textContent = data.h1_s1 || 0;
    document.getElementById('stat-h1-s2').textContent = data.h1_s2 || 0;
    document.getElementById('stat-h2-s1').textContent = data.h2_s1 || 0;
    document.getElementById('stat-h2-s2').textContent = data.h2_s2 || 0;
    document.getElementById('stat-h2-s3').textContent = data.h2_s3 || 0;
    document.getElementById('stat-h2-s4').textContent = data.h2_s4 || 0;

    document.getElementById('stat-hadir-lengkap').textContent = data.hadir_lengkap || 0;
    document.getElementById('stat-tidak-hadir').textContent = data.tidak_hadir || 0;

    renderAttendanceChart(data);
    renderRecentScans(data.recent_scans || []);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
};

function renderAttendanceChart(stats) {
  const chartBox = document.getElementById('chart-container');
  if (!chartBox) return;

  const total = stats.total_peserta || 277;
  const sessions = [
    { label: "Hari 1 - Check-in, ID Card & Kamar (14:00 - 16:00)", count: stats.h1_reg || 0 },
    { label: "Hari 1 - Sesi 1: Pembukaan (16:00)", count: stats.h1_s1 || 0 },
    { label: "Hari 1 - Sesi 2: Materi Malam (19:30)", count: stats.h1_s2 || 0 },
    { label: "Hari 2 - Sesi 1: Pagi (08:00)", count: stats.h2_s1 || 0 },
    { label: "Hari 2 - Sesi 2: Siang (13:00)", count: stats.h2_s2 || 0 },
    { label: "Hari 2 - Sesi 3: Sore (16:00)", count: stats.h2_s3 || 0 },
    { label: "Hari 2 - Sesi 4: Malam (19:30)", count: stats.h2_s4 || 0 }
  ];

  chartBox.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; gap:12px;">
      ${sessions.map(s => {
        const pct = Math.round((s.count / total) * 100);
        return `
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:700; margin-bottom:3px;">
              <span>📌 ${s.label}</span>
              <span style="color:#6b1426;">${s.count} / ${total} Peserta (${pct}%)</span>
            </div>
            <div style="height:16px; background:#e2e8f0; border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #d4af37, #6b1426); border-radius:8px; transition:width 0.8s;"></div>
            </div>
          </div>
        `;
      }).join('')}
      <div style="margin-top:6px; font-size:0.75rem; color:#64748b; font-style:italic; text-align:center;">
        * Catatan: Hari Ketiga (8 Desember 2026) tidak dilakukan pemindaian presensi.
      </div>
    </div>
  `;
}

function renderRecentScans(scans) {
  const container = document.getElementById('recent-scans-list');
  if (!container) return;

  if (scans.length === 0) {
    container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:20px 0;">Belum ada riwayat presensi terbaru.</p>`;
    return;
  }

  container.innerHTML = scans.map(s => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid #f1f5f9;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="width:30px; height:30px; border-radius:50%; background:#ecfdf5; color:#10b981; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">✓</span>
        <div>
          <div style="font-weight:800; font-size:0.85rem; color:#1e293b;">${s.nama_lengkap}</div>
          <div style="font-size:0.73rem; color:#64748b;">${s.instansi} • <code>${s.nomor_peserta}</code></div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700; font-size:0.75rem; color:#6b1426;">${s.session_name ? s.session_name.split(':')[0] : s.session_id}</div>
        <div style="font-size:0.7rem; color:#94a3b8;">${s.scanned_at ? s.scanned_at.split(' ')[1] : ''}</div>
      </div>
    </div>
  `).join('');
}

// -------------------------------------------------------------
// PARTICIPANT DATA CRUD & EXCEL IMPORT / EXPORT
// -------------------------------------------------------------
window.loadParticipantsTable = async function() {
  const searchInput = document.getElementById('search-participant');
  const catSelect = document.getElementById('filter-category');

  const search = searchInput ? searchInput.value.trim() : "";
  const cat = catSelect ? catSelect.value : "";

  try {
    const res = await fetch(`/api/participants?kategori=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    currentParticipantsList = data.participants || [];
    renderParticipantsRows(currentParticipantsList);
    document.getElementById('participants-total-badge').textContent = `Total: ${currentParticipantsList.length} Orang`;
  } catch (err) {
    console.error("Error loading participants:", err);
  }
};

function renderParticipantsRows(list) {
  const tbody = document.getElementById('participants-table-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b;">Tidak ada data peserta ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const isAdmin = window.currentUser.role === 'ADMIN';
    const totalSesi = p.total_hadir || 0;

    return `
      <tr>
        <td style="text-align:center; font-weight:700;">${idx + 1}</td>
        <td><code>${p.nomor_peserta}</code></td>
        <td style="font-weight:800; color:#6b1426;">${p.nama_lengkap}</td>
        <td>${p.instansi}</td>
        <td>${p.jabatan}</td>
        <td><span class="cat-pill ${p.kategori === 'Peserta Rakorda' ? 'cat-peserta' : (p.kategori.includes('BAN') ? 'cat-ban' : 'cat-sek')}">${p.kategori}</span></td>
        <td style="text-align:center;">
          <span style="font-size:0.8rem; font-weight:700; color:${totalSesi >= 4 ? '#10b981' : '#f59e0b'};">
            ${totalSesi} / 6 Sesi
          </span>
        </td>
        <td style="text-align:center; white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewParticipantQR(${p.id})" title="Lihat QR Code">QR</button>
          ${isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="openManualPresensi(${p.id})" title="Presensi 6 Sesi Manual">📅 Sesi</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditParticipant(${p.id})" title="Edit Peserta">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteParticipant(${p.id}, '${p.nama_lengkap.replace(/'/g, "\\'")}')" title="Hapus">🗑️</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// RESET PESERTA KELIPATAN 50
// -------------------------------------------------------------
window.openResetParticipantsModal = function() {
  const total = currentParticipantsList.length;
  document.getElementById('reset-modal-current-total').textContent = `${total} Orang`;
  
  // Dynamically update dropdown options based on current total
  const sel = document.getElementById('reset-count-select');
  if (sel) {
    sel.innerHTML = '';
    const multiples = [50, 100, 150, 200, 250, 300, 350, 400, 500];
    multiples.forEach(cnt => {
      const remaining = Math.max(0, total - cnt);
      const opt = document.createElement('option');
      opt.value = cnt;
      opt.textContent = `Hapus ${cnt} Peserta (Sisa nanti: ${remaining} orang)`;
      sel.appendChild(opt);
    });
  }

  const confirmInput = document.getElementById('reset-confirm-input');
  if (confirmInput) confirmInput.value = '';

  document.getElementById('modal-reset-participants').classList.add('active');
};

window.submitResetParticipants = async function() {
  const count = parseInt(document.getElementById('reset-count-select').value, 10);
  const confirmText = document.getElementById('reset-confirm-input').value.trim();

  if (confirmText.toUpperCase() !== 'RESET') {
    showToast("Ketik kata 'RESET' untuk mengonfirmasi penghapusan", "warning");
    return;
  }

  const btn = document.getElementById('btn-confirm-reset');
  btn.disabled = true;
  btn.textContent = "Menghapus...";

  try {
    const res = await fetch('/api/participants/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: count, order: 'desc' })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      closeModal('modal-reset-participants');
      await loadParticipantsTable();
      await loadDashboardStats();
      if (window.initCardCertModule) window.initCardCertModule();
      if (window.loadAttendanceReport) window.loadAttendanceReport();
    } else {
      showToast(data.message || "Gagal mereset data peserta", "danger");
    }
  } catch (e) {
    showToast("Error: " + e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Ya, Hapus Sekarang";
  }
};

// -------------------------------------------------------------
// HAPUS / RESET DATA PRESENSI
// -------------------------------------------------------------
window.openResetAttendanceModal = async function() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    let totalScans = 0;
    if (data.session_counts) {
      totalScans = Object.values(data.session_counts).reduce((a, b) => a + b, 0);
    }
    const labelEl = document.getElementById('reset-att-current-count');
    if (labelEl) labelEl.textContent = `${totalScans} Rekaman Kehadiran`;

    const confirmInput = document.getElementById('reset-attendance-confirm-input');
    if (confirmInput) confirmInput.value = '';

    document.getElementById('modal-reset-attendance').classList.add('active');
  } catch (err) {
    showToast("Gagal memuat status presensi: " + err.message, "danger");
  }
};

window.submitResetAttendance = async function() {
  const scope = document.getElementById('reset-attendance-scope').value;
  const confirmText = document.getElementById('reset-attendance-confirm-input').value.trim();

  if (confirmText.toUpperCase() !== 'HAPUS') {
    showToast("Ketik kata 'HAPUS' untuk mengonfirmasi penghapusan", "warning");
    return;
  }

  const btn = document.getElementById('btn-confirm-reset-attendance');
  btn.disabled = true;
  btn.textContent = "Menghapus...";

  try {
    const res = await fetch('/api/attendance/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: scope })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      closeModal('modal-reset-attendance');
      await loadDashboardStats();
      await loadParticipantsTable();
      if (window.loadAttendanceReport) window.loadAttendanceReport();
      if (window.initCardCertModule) window.initCardCertModule();
    } else {
      showToast(data.message || "Gagal menghapus data presensi", "danger");
    }
  } catch (e) {
    showToast("Error: " + e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "🗑️ Ya, Hapus Data Presensi";
  }
};

// -------------------------------------------------------------
// EXCEL IMPORT MODAL & LOGIC
// -------------------------------------------------------------
window.openImportExcelModal = function() {
  document.getElementById('import-file-input').value = "";
  document.getElementById('import-preview-box').style.display = 'none';
  document.getElementById('modal-import-excel').classList.add('active');
};

let importedRows = [];
window.handleFileSelect = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file);
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    showToast("Berkas kosong atau tidak memiliki data", "danger");
    return;
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === 0 || !values[0]) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });

    const nama = rowObj["nama lengkap"] || rowObj["nama"] || values[0];
    const instansi = rowObj["instansi"] || values[1] || "-";
    const jabatan = rowObj["jabatan"] || values[2] || "-";
    const kategori = rowObj["kategori"] || values[3] || "Peserta Rakorda";
    const no_hp = rowObj["nomor hp"] || rowObj["no hp"] || values[4] || "-";
    const email = rowObj["email"] || values[5] || "-";
    const nomor_peserta = rowObj["nomor peserta"] || values[6] || "";

    if (nama) {
      rows.push({
        nama_lengkap: nama,
        instansi: instansi,
        jabatan: jabatan,
        kategori: kategori,
        no_hp: no_hp,
        email: email,
        nomor_peserta: nomor_peserta
      });
    }
  }

  importedRows = rows;
  const previewBox = document.getElementById('import-preview-box');
  const previewText = document.getElementById('import-preview-count');
  if (previewBox && previewText) {
    previewText.textContent = `Terbaca ${rows.length} calon peserta dari file. Siap diimport ke database.`;
    previewBox.style.display = 'block';
  }
}

window.submitImportExcel = async function() {
  if (importedRows.length === 0) {
    showToast("Pilih file Excel/CSV terlebih dahulu", "warning");
    return;
  }

  const btn = document.getElementById('btn-do-import');
  btn.disabled = true;
  btn.textContent = "Mengimpor Data...";

  try {
    const res = await fetch('/api/participants/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: importedRows })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      closeModal('modal-import-excel');
      loadParticipantsTable();
      loadDashboardStats();
      if (window.initCardCertModule) window.initCardCertModule();
    } else {
      showToast(data.error || "Gagal import data", "danger");
    }
  } catch (e) {
    showToast("Error: " + e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Proses Import Sekarang";
  }
};

// Export Participants List to Excel (.xls)
window.exportParticipantsExcel = function() {
  if (!currentParticipantsList || currentParticipantsList.length === 0) {
    showToast("Tidak ada data peserta untuk diekspor", "warning");
    return;
  }

  const headers = ["NO", "NOMOR PESERTA", "NAMA LENGKAP", "INSTANSI", "JABATAN", "KATEGORI", "NO HP", "EMAIL", "QR CODE", "TANGGAL DAFTAR"];
  const thHtml = headers.map(h => `<th style="background-color:#6B1426; color:#ffffff; font-weight:bold; font-size:10pt; border:1px solid #4a0d1a; padding:8px 12px; text-align:center; vertical-align:middle;">${h}</th>`).join("");

  let trHtml = "";
  currentParticipantsList.forEach((p, idx) => {
    const bg = idx % 2 === 1 ? "#f8fafc" : "#ffffff";
    trHtml += `<tr style="background-color:${bg};">
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; mso-number-format:'0';">${idx + 1}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; font-weight:bold; color:#6B1426; mso-number-format:'\\@';">${p.nomor_peserta || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; font-weight:bold; mso-number-format:'\\@';">${p.nama_lengkap || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${p.instansi || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${p.jabatan || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${p.kategori || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; mso-number-format:'\\@';">${p.no_hp || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${p.email || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; font-family:monospace; font-size:9pt; mso-number-format:'\\@';">${p.qr_code || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; mso-number-format:'\\@';">${p.registered_at || ''}</td>
    </tr>`;
  });

  const excelDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>DATA_PESERTA</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head>
<body>
<div style="padding:10px 0 16px 0;">
  <h2 style="color:#6B1426; margin:0 0 4px 0;">DAFTAR PESERTA RAKORDA II JABAR 2026</h2>
  <div style="color:#475569; font-size:10.5pt;">BAN-PDM PROVINSI JAWA BARAT | 6, 7, dan 8 Desember 2026 | HARRIS Hotel Bandung</div>
</div>
<table border="1">
  <thead><tr>${thHtml}</tr></thead>
  <tbody>${trHtml}</tbody>
</table>
</body>
</html>`;

  const blob = new Blob([excelDoc], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DATA_PESERTA_RAKORDA_II_JABAR_2026_${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Data peserta berhasil diekspor dalam format Excel (.xls) rapi!", "success");
};

// -------------------------------------------------------------
// MANUAL PRESENSI MODAL (6 SESI)
// -------------------------------------------------------------
let manualParticipantId = null;
window.openManualPresensi = function(id) {
  const p = currentParticipantsList.find(x => x.id === id);
  if (!p) return;
  manualParticipantId = id;

  document.getElementById('manual-name').textContent = p.nama_lengkap;
  document.getElementById('manual-instansi').textContent = p.instansi;

  const sessions = [
    { id: "H1_REG", btn: "btn-toggle-h1reg", label: "Hari 1 - Check-in, ID Card & Kamar (14:00 - 16:00)", val: p.h1_reg_scan },
    { id: "H1_S1", btn: "btn-toggle-h1s1", label: "Hari 1 - Sesi 1: Pembukaan (16:00)", val: p.h1_s1_scan },
    { id: "H1_S2", btn: "btn-toggle-h1s2", label: "Hari 1 - Sesi 2: Materi Malam (19:30)", val: p.h1_s2_scan },
    { id: "H2_S1", btn: "btn-toggle-h2s1", label: "Hari 2 - Sesi 1: Pagi (08:00)", val: p.h2_s1_scan },
    { id: "H2_S2", btn: "btn-toggle-h2s2", label: "Hari 2 - Sesi 2: Siang (13:00)", val: p.h2_s2_scan },
    { id: "H2_S3", btn: "btn-toggle-h2s3", label: "Hari 2 - Sesi 3: Sore (16:00)", val: p.h2_s3_scan },
    { id: "H2_S4", btn: "btn-toggle-h2s4", label: "Hari 2 - Sesi 4: Malam (19:30)", val: p.h2_s4_scan }
  ];

  sessions.forEach(s => {
    const el = document.getElementById(s.btn);
    if (el) {
      el.className = s.val ? 'btn btn-success' : 'btn btn-secondary';
      el.textContent = s.val ? `✓ ${s.label} (Hadir)` : `${s.label} (Belum Hadir)`;
    }
  });

  document.getElementById('modal-manual-presensi').classList.add('active');
};

window.toggleSessionAttendance = async function(sessionId) {
  if (!manualParticipantId) return;

  try {
    const res = await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: manualParticipantId,
        session_id: sessionId,
        action: 'toggle',
        scanned_by: window.currentUser.nama
      })
    });
    const data = await res.json();
    showToast(data.message, "success");
    await loadParticipantsTable();
    await loadDashboardStats();
    openManualPresensi(manualParticipantId);
  } catch (e) {
    showToast(e.message, "danger");
  }
};

// CRUD Participants
// Photo Upload & Preview Handler
window.previewAndSetPhoto = function(event, formId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    // Compress image using canvas
    const img = new Image();
    img.onload = function() {
      const maxDim = 400;
      let w = img.width;
      let h = img.height;
      if (w > h && w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const form = document.getElementById(formId);
      if (form && form.foto_url) {
        form.foto_url.value = compressedDataUrl;
      }
      const previewId = formId === 'form-add-participant' ? 'add-photo-preview' : 'edit-photo-preview';
      const previewBox = document.getElementById(previewId);
      if (previewBox) {
        previewBox.style.display = 'block';
        previewBox.querySelector('img').src = compressedDataUrl;
      }
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
};

window.openAddParticipantModal = function() {
  const form = document.getElementById('form-add-participant');
  form.reset();
  const preview = document.getElementById('add-photo-preview');
  if (preview) preview.style.display = 'none';
  document.getElementById('modal-add-participant').classList.add('active');
};

window.saveNewParticipant = async function(e) {
  e.preventDefault();
  const form = document.getElementById('form-add-participant');
  const payload = {
    nama_lengkap: form.nama_lengkap.value.trim(),
    instansi: form.instansi.value.trim(),
    jabatan: form.jabatan.value.trim(),
    kategori: form.kategori.value,
    no_hp: form.no_hp.value.trim(),
    email: form.email.value.trim(),
    foto_url: (form.foto_url ? form.foto_url.value.trim() : '')
  };

  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Peserta berhasil ditambahkan!", "success");
      closeModal('modal-add-participant');
      loadParticipantsTable();
      loadDashboardStats();
      if (window.initCardCertModule) window.initCardCertModule();
    } else {
      showToast(data.error || "Gagal menambah peserta", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
};

window.openEditParticipant = function(id) {
  const p = currentParticipantsList.find(x => x.id === id);
  if (!p) return;

  const form = document.getElementById('form-edit-participant');
  form.participant_id.value = p.id;
  form.nomor_peserta.value = p.nomor_peserta;
  form.nama_lengkap.value = p.nama_lengkap;
  form.instansi.value = p.instansi;
  form.jabatan.value = p.jabatan;
  form.kategori.value = p.kategori;
  form.no_hp.value = p.no_hp;
  form.email.value = p.email;
  if (form.foto_url) {
    form.foto_url.value = p.foto_url || '';
  }

  const preview = document.getElementById('edit-photo-preview');
  if (preview) {
    if (p.foto_url) {
      preview.style.display = 'block';
      preview.querySelector('img').src = p.foto_url;
    } else {
      preview.style.display = 'none';
    }
  }

  document.getElementById('modal-edit-participant').classList.add('active');
};

window.saveEditParticipant = async function(e) {
  e.preventDefault();
  const form = document.getElementById('form-edit-participant');
  const pid = form.participant_id.value;
  const payload = {
    nomor_peserta: form.nomor_peserta.value.trim(),
    nama_lengkap: form.nama_lengkap.value.trim(),
    instansi: form.instansi.value.trim(),
    jabatan: form.jabatan.value.trim(),
    kategori: form.kategori.value,
    no_hp: form.no_hp.value.trim(),
    email: form.email.value.trim(),
    foto_url: (form.foto_url ? form.foto_url.value.trim() : '')
  };

  try {
    const res = await fetch(`/api/participants/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("Data peserta berhasil diperbarui!", "success");
      closeModal('modal-edit-participant');
      loadParticipantsTable();
      if (window.initCardCertModule) window.initCardCertModule();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
};

window.deleteParticipant = async function(id, name) {
  if (!confirm(`Hapus peserta "${name}" beserta seluruh riwayat presensinya?`)) return;
  try {
    const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Peserta "${name}" berhasil dihapus.`, "success");
      loadParticipantsTable();
      loadDashboardStats();
      if (window.initCardCertModule) window.initCardCertModule();
    }
  } catch (e) {
    showToast(e.message, "danger");
  }
};

window.viewParticipantQR = function(id) {
  const p = currentParticipantsList.find(x => x.id === id);
  if (!p) return;

  document.getElementById('modal-qr-title').textContent = p.nama_lengkap;
  document.getElementById('modal-qr-subtitle').textContent = `[${p.nomor_peserta}] ${p.instansi} - ${p.kategori}`;
  document.getElementById('modal-qr-code-text').textContent = p.qr_code;

  const canvas = document.getElementById('modal-qr-canvas');
  if (canvas && window.drawQRCode) {
    window.drawQRCode(p.qr_code, canvas, 200, '#6b1426', '#ffffff');
  }

  document.getElementById('modal-view-qr').classList.add('active');
};

// -------------------------------------------------------------
// GOOGLE SHEETS & DRIVE
// -------------------------------------------------------------
window.openGoogleSyncModal = async function() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    document.getElementById('gsheet-url-input').value = settings.google_sheets_url || '';
    document.getElementById('gdrive-folder-input').value = settings.google_drive_folder_id || '';
    document.getElementById('modal-google-sync').classList.add('active');
  } catch (e) {
    showToast(e.message, "danger");
  }
};

window.triggerSheetsSync = async function() {
  const url = document.getElementById('gsheet-url-input').value.trim();
  const btn = document.getElementById('btn-sync-sheets-now');
  btn.disabled = true;
  btn.textContent = "Sedang Sinkronisasi...";

  try {
    const res = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_url: url })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadParticipantsTable();
      loadDashboardStats();
    } else {
      showToast(data.message, "danger");
    }
  } catch (e) {
    showToast("Error sinkronisasi: " + e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Sinkronkan Sekarang";
  }
};

window.triggerPushAttendance = async function() {
  const url = document.getElementById('gsheet-url-input').value.trim();
  const btn = document.getElementById('btn-push-attendance-now');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Mengirim Presensi...";
  }

  try {
    const res = await fetch('/api/sync/sheets/push_attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script_url: url })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
    } else {
      showToast(data.message || "Gagal sinkronisasi presensi", "danger");
    }
  } catch (e) {
    showToast("Error pengiriman presensi: " + e.message, "danger");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ Sinkronkan Seluruh Presensi ke Google Sheets";
    }
  }
};

window.saveGoogleUrl = async function() {
  const url = document.getElementById('gsheet-url-input').value.trim();
  if (!url) {
    showToast("Masukkan URL Web App Apps Script terlebih dahulu", "warning");
    return;
  }
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_sheets_url: url })
    });
    if (res.ok) {
      showToast("Tautan Apps Script berhasil disimpan! Setiap scan akan otomatis masuk ke Google Spreadsheet.", "success");
    } else {
      showToast("Gagal menyimpan tautan", "danger");
    }
  } catch(e) {
    showToast("Error: " + e.message, "danger");
  }
};

window.triggerDriveBackup = async function() {
  const btn = document.getElementById('btn-backup-drive-now');
  btn.disabled = true;
  btn.textContent = "Mencadangkan ke Drive...";

  try {
    const res = await fetch('/api/backup/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Backup Berhasil! Data peserta dan presensi sesi telah diamankan.`, "success");
    } else {
      showToast("Gagal backup", "danger");
    }
  } catch (e) {
    showToast(e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Backup Database ke Drive";
  }
};

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
window.openSettingsModal = async function() {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();
    const form = document.getElementById('form-settings');
    form.event_theme.value = s.event_theme || '';
    form.event_location.value = s.event_location || '';
    form.cert_number_prefix.value = s.cert_number_prefix || '';
    form.cert_min_sessions.value = s.cert_min_sessions || '4';
    form.signer1_title.value = s.signer1_title || '';
    form.signer1_name.value = s.signer1_name || '';
    form.signer1_nip.value = s.signer1_nip || '';
    form.signer2_title.value = s.signer2_title || '';
    form.signer2_name.value = s.signer2_name || '';
    form.signer2_nip.value = s.signer2_nip || '';

    document.getElementById('modal-settings').classList.add('active');
  } catch (e) {
    showToast(e.message, "danger");
  }
};

window.saveSettings = async function(e) {
  e.preventDefault();
  const form = document.getElementById('form-settings');
  const payload = {
    event_theme: form.event_theme.value.trim(),
    event_location: form.event_location.value.trim(),
    cert_number_prefix: form.cert_number_prefix.value.trim(),
    cert_min_sessions: form.cert_min_sessions.value,
    signer1_title: form.signer1_title.value.trim(),
    signer1_name: form.signer1_name.value.trim(),
    signer1_nip: form.signer1_nip.value.trim(),
    signer2_title: form.signer2_title.value.trim(),
    signer2_name: form.signer2_name.value.trim(),
    signer2_nip: form.signer2_nip.value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("Pengaturan aplikasi berhasil disimpan!", "success");
      closeModal('modal-settings');
      if (window.initCardCertModule) window.initCardCertModule();
    }
  } catch (e) {
    showToast(e.message, "danger");
  }
};

// -------------------------------------------------------------
// AUTH & ROLES
// -------------------------------------------------------------
window.openRoleSwitchModal = function() {
  document.getElementById('modal-auth').classList.add('active');
};

window.handleLoginSwitch = async function(role) {
  const pwdInput = document.getElementById('login-password');
  const password = pwdInput ? pwdInput.value.trim() : "";
  const username = role.toLowerCase();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      window.currentUser = data.user;
      updateRoleUI();
      showToast(`Beralih ke akun ${data.user.role}: ${data.user.nama}`, "success");
      closeModal('modal-auth');
    } else {
      showToast("Password salah untuk akun " + role, "danger");
    }
  } catch (e) {
    showToast(e.message, "danger");
  }
};

function updateRoleUI() {
  const badge = document.getElementById('header-role-text');
  if (badge) badge.textContent = window.currentUser.role;

  const isAdmin = window.currentUser.role === 'ADMIN';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  renderParticipantsRows(currentParticipantsList);
}

// -------------------------------------------------------------
// UTILITIES
// -------------------------------------------------------------
window.closeModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
};

window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      if (t.parentNode === container) container.removeChild(t);
    }, 300);
  }, 3500);
};
