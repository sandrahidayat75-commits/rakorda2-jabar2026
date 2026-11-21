/**
 * Report Module - RAKORDA II JABAR 2026
 * Attendance report broken down by the 6 scanning sessions
 * Hari 1: 16:00, 19:30
 * Hari 2: 08:00, 13:00, 16:00, 19:30
 * Hari 3: Tidak di-scan
 */

let reportData = [];

window.loadAttendanceReport = async function() {
  const searchInput = document.getElementById('report-search');
  const catSelect = document.getElementById('report-cat-filter');
  const sessionSelect = document.getElementById('report-session-filter');

  const search = searchInput ? searchInput.value.trim() : "";
  const cat = catSelect ? catSelect.value : "";
  const sessionFilter = sessionSelect ? sessionSelect.value : "";

  try {
    const res = await fetch(`/api/attendance/report?kategori=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    let rows = data.report || [];

    if (sessionFilter) {
      rows = rows.filter(r => !!r[sessionFilter.toLowerCase()]);
    }

    reportData = rows;
    renderReportTable(rows);
    updateReportSummary(rows);
  } catch (err) {
    console.error("Error loading report:", err);
  }
};

function renderReportTable(rows) {
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:30px; color:#64748b;">Tidak ada data presensi yang sesuai kriteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, index) => {
    const fmt = ts => ts ? `<span class="status-badge hadir" title="${ts}">✓ ${ts.split(' ')[1] || 'Hadir'}</span>` : `<span class="status-badge absen">✗ Absen</span>`;

    const h1_reg = fmt(r.h1_reg);
    const h1_1 = fmt(r.h1_s1);
    const h1_2 = fmt(r.h1_s2);
    const h2_1 = fmt(r.h2_s1);
    const h2_2 = fmt(r.h2_s2);
    const h2_3 = fmt(r.h2_s3);
    const h2_4 = fmt(r.h2_s4);

    let statusBadge = '';
    if (r.total_sesi === 7) {
      statusBadge = `<span class="status-badge hadir" style="background:#bbf7d0; font-weight:900; color:#166534;">🌟 LENGKAP 7 SESI</span>`;
    } else if (r.total_sesi >= 5) {
      statusBadge = `<span class="status-badge hadir" style="background:#e0f2fe; color:#0369a1; font-weight:800;">HADIR (${r.total_sesi}/7 SESI)</span>`;
    } else if (r.total_sesi > 0) {
      statusBadge = `<span class="status-badge absen" style="background:#fef3c7; color:#92400e; font-weight:700;">KURANG (${r.total_sesi}/7 SESI)</span>`;
    } else {
      statusBadge = `<span class="status-badge absen">TIDAK HADIR</span>`;
    }

    return `
      <tr>
        <td style="font-weight:700; text-align:center;">${index + 1}</td>
        <td><code>${r.nomor_peserta}</code></td>
        <td style="font-weight:800; color:#6b1426;">${r.nama_lengkap}</td>
        <td>${r.instansi}</td>
        <td><span class="cat-pill ${r.kategori === 'Peserta Rakorda' ? 'cat-peserta' : (r.kategori.includes('BAN') ? 'cat-ban' : 'cat-sek')}">${r.kategori}</span></td>
        <td style="text-align:center;">${h1_reg}</td>
        <td style="text-align:center;">${h1_1}</td>
        <td style="text-align:center;">${h1_2}</td>
        <td style="text-align:center;">${h2_1}</td>
        <td style="text-align:center;">${h2_2}</td>
        <td style="text-align:center;">${h2_3}</td>
        <td style="text-align:center;">${h2_4}</td>
        <td style="text-align:center; font-weight:900; font-size:1rem; color:#6b1426;">${r.total_sesi}/7</td>
        <td style="text-align:center;">${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

function updateReportSummary(rows) {
  const sumTotal = document.getElementById('rep-sum-total');
  const sumLengkap = document.getElementById('rep-sum-lengkap');
  const sumSebagian = document.getElementById('rep-sum-sebagian');
  const sumAbsen = document.getElementById('rep-sum-absen');

  if (!sumTotal) return;

  const total = rows.length;
  const lengkap = rows.filter(r => r.total_sesi === 7).length;
  const sebagian = rows.filter(r => r.total_sesi > 0 && r.total_sesi < 7).length;
  const absen = rows.filter(r => r.total_sesi === 0).length;

  sumTotal.textContent = total;
  if (sumLengkap) sumLengkap.textContent = lengkap;
  if (sumSebagian) sumSebagian.textContent = sebagian;
  if (sumAbsen) sumAbsen.textContent = absen;
}

// Export Excel Functionality (Native Excel .xls with Burgundy & Gold Styling)
window.exportReportExcel = function() {
  if (!reportData || reportData.length === 0) {
    showToast("Tidak ada data untuk diekspor", "warning");
    return;
  }

  const headers = ["NO", "NOMOR PESERTA", "NAMA LENGKAP", "INSTANSI", "JABATAN", "KATEGORI", "NO HP", "EMAIL", "H1 CHECK-IN (14:00-16:00)", "H1 SESI 1 (16:00)", "H1 SESI 2 (19:30)", "H2 SESI 1 (08:00)", "H2 SESI 2 (13:00)", "H2 SESI 3 (16:00)", "H2 SESI 4 (19:30)", "TOTAL SESI", "STATUS KEHADIRAN"];
  const thHtml = headers.map(h => `<th style="background-color:#6B1426; color:#ffffff; font-weight:bold; font-size:10pt; border:1px solid #4a0d1a; padding:8px 12px; text-align:center; vertical-align:middle;">${h}</th>`).join("");
  
  let trHtml = "";
  reportData.forEach((r, idx) => {
    const bg = idx % 2 === 1 ? "#f8fafc" : "#ffffff";
    const f = val => val ? `<span style="color:#166534; font-weight:bold;">✓ ${val}</span>` : '<span style="color:#94a3b8;">-</span>';
    const statusBg = r.total_sesi === 7 ? '#dcfce7; color:#166534;' : (r.total_sesi > 0 ? '#fef9c3; color:#854d0e;' : '#f1f5f9; color:#64748b;');

    trHtml += `<tr style="background-color:${bg};">
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; mso-number-format:'0';">${idx + 1}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; font-weight:bold; color:#6B1426; mso-number-format:'\\@';">${r.nomor_peserta || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; font-weight:bold; mso-number-format:'\\@';">${r.nama_lengkap || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${r.instansi || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${r.jabatan || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${r.kategori || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; mso-number-format:'\\@';">${r.no_hp || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; mso-number-format:'\\@';">${r.email || ''}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h1_reg)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h1_s1)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h1_s2)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h2_s1)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h2_s2)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h2_s3)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center;">${f(r.h2_s4)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; font-weight:bold; mso-number-format:'0';">${r.total_sesi}/7</td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; font-weight:bold; background-color:${statusBg};">${r.status || ''}</td>
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
    <x:Name>REKAP_PRESENSI_7_SESI</x:Name>
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
  <h2 style="color:#6B1426; margin:0 0 4px 0;">REKAPITULASI PRESENSI 6 SESI - RAKORDA II JABAR 2026</h2>
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
  a.download = `REKAP_PRESENSI_6_SESI_RAKORDA2026_${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Laporan presensi 6 sesi berhasil diunduh dalam format Excel (.xls) rapi!", "success");
};

window.printReport = function() {
  document.body.className = 'print-mode-report';
  window.print();
  document.body.className = '';
};
