/**
 * Card & Certificate Module - RAKORDA II JABAR 2026
 * - Portrait CR80 ID Card (54 mm x 85.6 mm / 5.4 cm x 8.56 cm)
 * - Formal F4 Landscape Certificate (330 mm x 215 mm)
 * - Dates: 6, 7, 8 Desember 2026
 */

let allParticipants = [];
let currentCardParticipant = null;
let currentCertParticipant = null;
let currentSettings = {};

window.initCardCertModule = async function() {
  await loadParticipantsForCardCert();
  await loadSettingsForCert();
};

async function loadSettingsForCert() {
  try {
    const res = await fetch('/api/settings');
    currentSettings = await res.json();
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

async function loadParticipantsForCardCert() {
  try {
    const res = await fetch('/api/participants');
    const data = await res.json();
    allParticipants = data.participants || [];

    const cardSelect = document.getElementById('card-participant-select');
    const certSelect = document.getElementById('cert-participant-select');

    if (cardSelect && certSelect) {
      cardSelect.innerHTML = '<option value="">-- Pilih Peserta --</option>';
      certSelect.innerHTML = '<option value="">-- Pilih Peserta --</option>';

      allParticipants.forEach(p => {
        const opt1 = document.createElement('option');
        opt1.value = p.id;
        opt1.textContent = `[${p.nomor_peserta}] ${p.nama_lengkap} (${p.kategori})`;
        cardSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = p.id;
        opt2.textContent = `[${p.nomor_peserta}] ${p.nama_lengkap} - Hadir: ${p.total_hadir || 0}/6 sesi`;
        certSelect.appendChild(opt2);
      });

      if (allParticipants.length > 0) {
        cardSelect.value = allParticipants[0].id;
        certSelect.value = allParticipants[0].id;
        renderSinglePortraitCard(allParticipants[0]);
        renderSingleCertificate(allParticipants[0]);
      }
    }
  } catch (e) {
    console.error("Error loading participants:", e);
  }
}

// -------------------------------------------------------------
// PORTRAIT CR80 ID CARD (5.4 cm x 8.56 cm)
// -------------------------------------------------------------
window.onCardParticipantChange = function(selectEl) {
  const pId = selectEl.value;
  const p = allParticipants.find(item => item.id == pId);
  if (p) renderSinglePortraitCard(p);
};

function renderSinglePortraitCard(p) {
  currentCardParticipant = p;
  const container = document.getElementById('single-card-preview');
  if (!container) return;

  container.innerHTML = generatePortraitCardHTML(p);
  const canvas = container.querySelector('.card-portrait-qr-canvas');
  if (canvas && window.drawQRCode) {
    window.drawQRCode(p.qr_code, canvas, 140, '#520c1c', '#ffffff');
  }
}

function getParticipantInitials(name) {
  if (!name) return "RKD";
  const clean = name.replace(/^(Dr\.|Drs\.|Dra\.|H\.|Hj\.|Prof\.)\s+/gi, '')
                    .replace(/,\s*[A-Z\.\s]+$/gi, '');
  const words = clean.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return "RKD";
}

function generatePortraitCardHTML(p) {
  const initials = getParticipantInitials(p.nama_lengkap);
  const photoContent = p.foto_url 
    ? `<img src="${p.foto_url}" class="card-portrait-photo" alt="${p.nama_lengkap}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-photo-avatar\\'>${initials}</div>';">`
    : `<div class="card-photo-avatar">${initials}</div>`;

  return `
    <div class="id-card-cr80-portrait" id="card-${p.id}">
      <!-- LANYARD PUNCH HOLE GUIDE -->
      <div class="card-lanyard-slot"></div>

      <!-- BIG OFFICIAL RAKORDA BRAND LOGO -->
      <img src="/assets/logo-rakorda-official.png?v=2" alt="RAKORDA II 2026 BAN-PDM" class="card-top-official-logo">
      <div class="card-ban-text-line">PROVINSI JAWA BARAT</div>
      <div class="card-gold-divider"></div>

      <!-- PARTICIPANT PHOTO CONTAINER -->
      <div class="card-portrait-photo-container">
        ${photoContent}
      </div>

      <!-- PARTICIPANT INFORMATION -->
      <div class="card-portrait-body">
        <div class="card-portrait-name" title="${p.nama_lengkap}">${p.nama_lengkap}</div>
        <div class="card-portrait-instansi">${p.instansi}</div>
        <div class="card-portrait-jabatan">${p.jabatan}</div>
        <div>
          <span class="card-portrait-category">${p.kategori}</span>
        </div>
      </div>

      <!-- QR CODE SECTION -->
      <div class="card-portrait-qr-section">
        <canvas class="card-portrait-qr-canvas" width="140" height="140"></canvas>
        <div class="card-portrait-nomor">${p.nomor_peserta}</div>
      </div>

      <!-- BOTTOM ACCENT STRIP -->
      <div class="card-portrait-footer-strip"></div>
    </div>
  `;
}

// Print single portrait card
window.printCurrentCard = function() {
  if (!currentCardParticipant) return;
  document.body.className = 'print-mode-cards';
  window.print();
  document.body.className = '';
};

// Batch Print Portrait Cards (CR80: 54 x 85.6 mm) - EXACT 9 CARDS PER A4 SHEET (3x3 Grid)
window.printBatchCards = function(category) {
  const list = category && category !== 'ALL' 
    ? allParticipants.filter(p => p.kategori === category)
    : allParticipants;

  if (list.length === 0) {
    showToast("Tidak ada peserta untuk kategori ini", "warning");
    return;
  }

  // Chunk participants into groups of 9 (for exact 9 cards per A4 page)
  const pageSize = 9;
  const pages = [];
  for (let i = 0; i < list.length; i += pageSize) {
    pages.push(list.slice(i, i + pageSize));
  }

  const printWindow = window.open('', '_blank');
  let pagesHtml = '';

  pages.forEach((pageList, pageIdx) => {
    pagesHtml += `<div class="a4-sheet-9cards" id="a4-page-${pageIdx + 1}">`;
    pageList.forEach(p => {
      pagesHtml += generatePortraitCardHTML(p);
    });
    pagesHtml += `</div>`;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cetak Kartu Peserta (9 Kartu per Lembar A4) - RAKORDA II JABAR 2026</title>
      <link rel="stylesheet" href="/css/style.css">
      <script src="/js/qrcode.js"><\/script>
      <style>
        @page {
          size: 210mm 297mm portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #e2e8f0;
          margin: 0;
          padding: 10mm 0;
        }
        .a4-sheet-9cards {
          width: 210mm;
          height: 297mm;
          margin: 0 auto 10mm auto;
          background: white;
          padding: 12mm 12mm;
          display: grid;
          grid-template-columns: repeat(3, 54mm);
          grid-template-rows: repeat(3, 85.6mm);
          gap: 6mm 12mm;
          justify-content: center;
          align-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          page-break-after: always;
          page-break-inside: avoid;
        }
        .id-card-cr80-portrait {
          width: 54mm !important;
          height: 85.6mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: 1px dashed #d4af37 !important;
          outline: 0.5px dashed rgba(107, 20, 38, 0.4);
          page-break-inside: avoid;
        }
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .a4-sheet-9cards {
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card-cr80-portrait {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function() {
          const cards = ${JSON.stringify(list)};
          cards.forEach(p => {
            const cardEls = document.querySelectorAll('#card-' + p.id);
            cardEls.forEach(cardEl => {
              const canvas = cardEl.querySelector('.card-portrait-qr-canvas');
              if (canvas && window.drawQRCode) {
                window.drawQRCode(p.qr_code, canvas, 140, '#520c1c', '#ffffff');
              }
            });
          });
          setTimeout(() => { window.print(); }, 900);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// -------------------------------------------------------------
// F4 CERTIFICATE FUNCTIONS (21.5 cm x 33 cm)
// -------------------------------------------------------------
window.onCertParticipantChange = function(selectEl) {
  const pId = selectEl.value;
  const p = allParticipants.find(item => item.id == pId);
  if (p) renderSingleCertificate(p);
};

function renderSingleCertificate(p) {
  currentCertParticipant = p;
  const container = document.getElementById('single-cert-preview');
  const eligibilityAlert = document.getElementById('cert-eligibility-warning');
  if (!container) return;

  const minSessions = parseInt(currentSettings.cert_min_sessions || '4', 10);
  const totalSesi = p.total_hadir || 0;
  const isEligible = totalSesi >= minSessions;

  if (eligibilityAlert) {
    if (!isEligible) {
      eligibilityAlert.style.display = 'flex';
      eligibilityAlert.innerHTML = `
        <span style="font-size:1.4rem">⚠️</span>
        <div>
          <strong>Syarat Belum Terpenuhi:</strong> Peserta ini baru hadir <strong>${totalSesi} dari 6 sesi</strong>. 
          Syarat minimal penerbitan sertifikat adalah <strong>${minSessions} sesi kehadiran</strong>.
        </div>
      `;
    } else {
      eligibilityAlert.style.display = 'none';
    }
  }

  container.innerHTML = generateCertHTML(p);
  const canvas = container.querySelector('.cert-qr-canvas');
  if (canvas && window.drawQRCode) {
    const certVerifyText = `VERIFIKASI-SERTIFIKAT-RAKORDA2026|${p.nomor_peserta}|${p.nama_lengkap}|STATUS:VALID`;
    window.drawQRCode(certVerifyText, canvas, 120, '#6b1426', '#ffffff');
  }
}

function generateCertHTML(p) {
  const certNumber = `${currentSettings.cert_number_prefix || '821.1/BAN-PDM-JBR/RKD-II/XII/2026'}/${String(p.id).padStart(3, '0')}`;
  const signer1Title = currentSettings.signer1_title || "Ketua BAN-PDM Provinsi Jawa Barat";
  const signer1Name = currentSettings.signer1_name || "Tata Sumitra Wirasasmita, S.Si., M.Mgt.";
  const signer1Nip = currentSettings.signer1_nip || "NIP. 19720415 199802 1 001";

  const signer2Title = currentSettings.signer2_title || "Sekretaris BAN-PDM Provinsi Jawa Barat";
  const signer2Name = currentSettings.signer2_name || "Dr. Sandra Taufik Hidayat, M.Ag.";
  const signer2Nip = currentSettings.signer2_nip || "NIP. 19750820 200312 1 002";

  return `
    <div class="cert-f4-landscape" id="cert-${p.id}">
      <div class="cert-outer-border"></div>
      <div class="cert-inner-border"></div>
      <div class="cert-corner-ornament tl"></div>
      <div class="cert-corner-ornament tr"></div>
      <div class="cert-corner-ornament bl"></div>
      <div class="cert-corner-ornament br"></div>

      <!-- HEADER -->
      <div class="cert-header">
        <div class="cert-logos-line" style="justify-content:center;">
          <img src="/assets/logo-rakorda-official.png?v=2" alt="RAKORDA II 2026" class="cert-logo-official" style="height:22mm;">
        </div>
        <div class="cert-title-main">SERTIFIKAT</div>
        <div class="cert-number">Nomor : ${certNumber}</div>
      </div>

      <!-- BODY -->
      <div class="cert-body">
        <div class="cert-given-to">Diberikan kepada :</div>
        <div class="cert-participant-name">${p.nama_lengkap}</div>

        <div class="cert-description">
          Atas partisipasinya aktif sebagai <strong>${p.kategori}</strong> dalam kegiatan:
          <div class="cert-event-name">RAPAT KOORDINASI DAERAH II TAHUN 2026</div>
          <div class="cert-event-name" style="font-size:11pt; color:#6b1426;">BAN-PDM PROVINSI JAWA BARAT</div>
          <div class="cert-event-theme">Tema: "${currentSettings.event_theme || 'Transformasi Akreditasi Menuju Pendidikan Bermutu dan Berkeadilan di Jawa Barat'}"</div>
          <div class="cert-event-meta">
            Diselenggarakan pada tanggal <strong>6 – 8 Desember 2026</strong> di ${currentSettings.event_location || 'HARRIS Hotel & Conventions Festival Citylink, Bandung'}.
          </div>
        </div>
      </div>

      <!-- FOOTER / SIGNATURES -->
      <div class="cert-footer">
        <div class="cert-sig-block">
          <div class="cert-sig-title">${signer2Title}</div>
          <div class="cert-sig-space">
            <svg viewBox="0 0 100 40" style="width:70px; height:35px; stroke:#1e3a8a; fill:none; stroke-width:2.2; stroke-linecap:round;">
              <path d="M10,25 Q30,5 50,22 T70,18 Q85,10 95,28 M45,15 L52,38"/>
            </svg>
          </div>
          <div class="cert-sig-name">${signer2Name}</div>
          <div class="cert-sig-nip">${signer2Nip}</div>
        </div>

        <div class="cert-security-seal">
          <div class="cert-qr-verify">
            <canvas class="cert-qr-canvas" width="120" height="120"></canvas>
          </div>
          <div class="cert-verify-label">VERIFIKASI RESMI BAN-PDM</div>
        </div>

        <div class="cert-sig-block">
          <div class="cert-sig-title">Bandung, 8 Desember 2026<br>${signer1Title}</div>
          <div class="cert-sig-space">
            <svg viewBox="0 0 100 100" style="width:56px; height:56px; position:absolute; left:0; opacity:0.85; stroke:#b91c1c; fill:none;">
              <circle cx="50" cy="50" r="46" stroke-width="2.5" stroke-dasharray="4,2"/>
              <circle cx="50" cy="50" r="38" stroke-width="1.5"/>
              <text x="50" y="32" font-size="7.5" fill="#b91c1c" text-anchor="middle" font-weight="bold">BAN - PDM</text>
              <text x="50" y="74" font-size="6.5" fill="#b91c1c" text-anchor="middle" font-weight="bold">PROV. JAWA BARAT</text>
              <polygon points="50,42 53,50 62,50 55,55 57,63 50,58 43,63 45,55 38,50 47,50" fill="#b91c1c"/>
            </svg>
            <svg viewBox="0 0 100 40" style="width:80px; height:40px; position:relative; stroke:#0f172a; fill:none; stroke-width:2.2; stroke-linecap:round; z-index:2;">
              <path d="M15,28 Q35,8 45,30 T65,15 Q80,25 90,12 M35,18 L40,36"/>
            </svg>
          </div>
          <div class="cert-sig-name">${signer1Name}</div>
          <div class="cert-sig-nip">${signer1Nip}</div>
        </div>
      </div>
    </div>
  `;
}

// Print single certificate
window.printCurrentCertificate = function() {
  if (!currentCertParticipant) return;
  document.body.className = 'print-mode-cert';
  window.print();
  document.body.className = '';
};

// Batch Print Certificates
window.printBatchCertificates = function() {
  const minSessions = parseInt(currentSettings.cert_min_sessions || '4', 10);
  const eligibleList = allParticipants.filter(p => (p.total_hadir || 0) >= minSessions);

  if (eligibleList.length === 0) {
    showToast(`Tidak ada peserta yang memenuhi syarat minimal ${minSessions} sesi kehadiran`, "warning");
    return;
  }

  const printWindow = window.open('', '_blank');
  let certsHtml = '';

  eligibleList.forEach(p => {
    certsHtml += generateCertHTML(p);
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cetak Seluruh Sertifikat (F4 Landscape) - RAKORDA II JABAR 2026</title>
      <link rel="stylesheet" href="/css/style.css">
      <script src="/js/qrcode.js"><\/script>
      <style>
        @page { size: 330mm 215mm landscape; margin: 0; }
        body { margin: 0; padding: 0; background: white; }
        .cert-f4-landscape { page-break-after: always; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style>
    </head>
    <body>
      ${certsHtml}
      <script>
        window.onload = function() {
          const list = ${JSON.stringify(eligibleList)};
          list.forEach(p => {
            const certEl = document.getElementById('cert-' + p.id);
            if (certEl) {
              const canvas = certEl.querySelector('.cert-qr-canvas');
              if (canvas && window.drawQRCode) {
                const text = 'VERIFIKASI-SERTIFIKAT-RAKORDA2026|' + p.nomor_peserta + '|' + p.nama_lengkap + '|STATUS:VALID';
                window.drawQRCode(text, canvas, 120, '#6b1426', '#ffffff');
              }
            }
          });
          setTimeout(() => { window.print(); }, 800);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};
