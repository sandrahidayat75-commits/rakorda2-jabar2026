/**
 * Scanner Module - RAKORDA II JABAR 2026
 * Supports Session-based scanning for 6, 7, 8 Desember 2026
 * Sessions:
 * - H1_S1: 6 Des 16:00 (Pembukaan)
 * - H1_S2: 6 Des 19:30 (Malam)
 * - H2_S1: 7 Des 08:00 (Pagi)
 * - H2_S2: 7 Des 13:00 (Siang)
 * - H2_S3: 7 Des 16:00 (Sore)
 * - H2_S4: 7 Des 19:30 (Malam)
 * - Hari 3: Tidak di-scan
 */

let scannerStream = null;
let scanActive = false;
let selectedSessionId = "H1_REG";
let audioCtx = null;
let lastScannedCode = null;
let lastScanTime = 0;
let currentFacingMode = "environment";

const SESSIONS_META = {
  "H1_REG": { title: "Hari 1: Check-in, ID Card & Kamar", date: "6 Des 2026", time: "14:00 - 16:00" },
  "H1_S1": { title: "Hari 1 - Sesi 1: Pembukaan", date: "6 Des 2026", time: "16:00" },
  "H1_S2": { title: "Hari 1 - Sesi 2: Materi Malam", date: "6 Des 2026", time: "19:30" },
  "H2_S1": { title: "Hari 2 - Sesi 1: Sesi Pagi", date: "7 Des 2026", time: "08:00" },
  "H2_S2": { title: "Hari 2 - Sesi 2: Sesi Siang", date: "7 Des 2026", time: "13:00" },
  "H2_S3": { title: "Hari 2 - Sesi 3: Sesi Sore", date: "7 Des 2026", time: "16:00" },
  "H2_S4": { title: "Hari 2 - Sesi 4: Sesi Malam", date: "7 Des 2026", time: "19:30" }
};

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
}

// Unlock audio on iOS & Android touch
if (typeof document !== 'undefined') {
  ['touchstart', 'touchend', 'click'].forEach(evt => {
    document.addEventListener(evt, () => {
      try {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch(e) {}
    }, { once: true, passive: true });
  });
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    console.warn("Audio feedback error:", e);
  }
}

// Select active session (H1_S1, H1_S2, H2_S1, etc.)
window.setScanSession = function(sessionId, btnElement) {
  selectedSessionId = sessionId;
  document.querySelectorAll('.session-pill').forEach(el => el.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const meta = SESSIONS_META[sessionId] || SESSIONS_META["H1_S1"];
  const labelEl = document.getElementById('active-session-label');
  if (labelEl) {
    labelEl.textContent = `Aktif: ${meta.title} (${meta.time})`;
  }
  showToast(`Sesi presensi diubah ke: ${meta.title}`, 'info');
};

// Start camera stream
window.startScanner = async function() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const video = document.getElementById('camera-video');
  const placeholder = document.getElementById('camera-placeholder');
  const startBtn = document.getElementById('btn-start-camera');
  const stopBtn = document.getElementById('btn-stop-camera');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Kamera tidak didukung pada browser ini. Gunakan fitur upload/manual.", "danger");
    return;
  }

  try {
    scanActive = true;
    const constraints = {
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    scannerStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = scannerStream;
    await video.play();

    if (placeholder) placeholder.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-flex';

    scanLoop();
    showToast("Kamera aktif. Silakan arahkan ke QR Code kartu peserta.", "success");
  } catch (err) {
    console.error("Camera access error:", err);
    scanActive = false;
    // Auto fallback for iOS Safari inside iframe
    showToast("Live stream dibatasi di iframe browser ini. Membuka kamera foto HP...", "warning");
    const fileInput = document.getElementById('qr-file-input');
    if (fileInput) {
      setTimeout(() => { fileInput.click(); }, 300);
    }
  }
};

window.stopScanner = function() {
  scanActive = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
  const video = document.getElementById('camera-video');
  if (video) video.srcObject = null;

  const placeholder = document.getElementById('camera-placeholder');
  const startBtn = document.getElementById('btn-start-camera');
  const stopBtn = document.getElementById('btn-stop-camera');
  if (placeholder) placeholder.style.display = 'flex';
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
};

window.switchCamera = function() {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  if (scanActive) {
    stopScanner();
    startScanner();
  }
};

// Continuous scan loop
async function scanLoop() {
  if (!scanActive) return;
  const video = document.getElementById('camera-video');

  if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
    let detected = false;
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await barcodeDetector.detect(video);
        if (barcodes.length > 0) {
          detected = true;
          handleDetectedCode(barcodes[0].rawValue);
        }
      } catch (err) {}
    }

    if (!detected && typeof jsQR === 'function') {
      try {
        let canvas = document.getElementById('scanner-hidden-canvas');
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.id = 'scanner-hidden-canvas';
          canvas.style.display = 'none';
          document.body.appendChild(canvas);
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
        if (qr && qr.data) {
          handleDetectedCode(qr.data);
        }
      } catch (e) {}
    }
  }

  if (scanActive) {
    requestAnimationFrame(scanLoop);
  }
}

// Process detected QR code
window.handleDetectedCode = async function(code) {
  if (!code) return;
  const now = Date.now();
  if (code === lastScannedCode && (now - lastScanTime) < 3000) {
    return;
  }
  lastScannedCode = code;
  lastScanTime = now;

  const user = window.currentUser || { nama: "Petugas Presensi" };

  // Mitigasi Data: Simpan riwayat scan di memori internal HP (LocalStorage) agar tidak pernah hilang
  try {
    const backupKey = 'RAKORDA_LOCAL_SCANS_LOG';
    const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
    existing.push({
      qr_code: code,
      session_id: selectedSessionId,
      scanned_at: new Date().toISOString(),
      petugas: user.nama
    });
    localStorage.setItem(backupKey, JSON.stringify(existing));
  } catch (e) {}

  try {
    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_code: code,
        session_id: selectedSessionId,
        scanned_by: user.nama
      })
    });

    const data = await res.json();
    displayScanResult(data);
  } catch (err) {
    console.error("Scan API error:", err);
    showToast("Gagal memproses presensi: " + err.message, "danger");
  }
};

function displayScanResult(result) {
  const alertBanner = document.getElementById('scan-alert-box');
  const detailsCard = document.getElementById('scanned-participant-details');
  const noResultBox = document.getElementById('no-scan-placeholder');

  if (!alertBanner) return;

  alertBanner.className = 'scan-alert-banner';

  if (result.status === 'SUCCESS') {
    // HIJAU: BERHASIL HADIR
    playSound('success');
    alertBanner.className = 'scan-alert-banner success';
    alertBanner.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
        <span style="font-size:1.6rem">✅</span>
        <div>
          <div style="font-size:1.15rem; font-weight:900;">BERHASIL HADIR</div>
          <div style="font-size:0.85rem; font-weight:700; opacity:0.95;">
            ${result.session_name || 'Sesi Terpilih'} • Tercatat: ${result.scanned_at}
          </div>
        </div>
      </div>
    `;
    populateParticipantCard(result.participant, result.scanned_at, result.session_name);
  } else if (result.status === 'ALREADY_SCANNED') {
    // MERAH: SUDAH MELAKUKAN PRESENSI
    playSound('warning');
    alertBanner.className = 'scan-alert-banner warning';
    alertBanner.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
        <span style="font-size:1.6rem">⚠️</span>
        <div>
          <div style="font-size:1.15rem; font-weight:900;">SUDAH MELAKUKAN PRESENSI PADA SESI INI</div>
          <div style="font-size:0.85rem; font-weight:600; opacity:0.95;">
            Telah tercatat pada: ${result.scanned_at}
          </div>
        </div>
      </div>
    `;
    if (result.participant) {
      populateParticipantCard(result.participant, result.scanned_at, result.session_name);
    }
  } else {
    // MERAH: QR CODE TIDAK TERDAFTAR
    playSound('warning');
    alertBanner.className = 'scan-alert-banner danger';
    alertBanner.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
        <span style="font-size:1.6rem">❌</span>
        <div>
          <div style="font-size:1.15rem; font-weight:900;">QR CODE TIDAK TERDAFTAR</div>
          <div style="font-size:0.85rem; font-weight:600; opacity:0.9;">Kode: ${result.qr_code || 'Tidak Dikenali'}</div>
        </div>
      </div>
    `;
    if (detailsCard) detailsCard.style.display = 'none';
    if (noResultBox) noResultBox.style.display = 'block';
  }

  if (window.loadDashboardStats) window.loadDashboardStats();
}

function populateParticipantCard(p, timestamp, sessionName) {
  const detailsCard = document.getElementById('scanned-participant-details');
  const noResultBox = document.getElementById('no-scan-placeholder');
  if (detailsCard) detailsCard.style.display = 'block';
  if (noResultBox) noResultBox.style.display = 'none';

  document.getElementById('sp-name').textContent = p.nama_lengkap || '-';
  document.getElementById('sp-nomor').textContent = p.nomor_peserta || '-';
  document.getElementById('sp-instansi').textContent = p.instansi || '-';
  document.getElementById('sp-jabatan').textContent = p.jabatan || '-';
  document.getElementById('sp-hp').textContent = p.no_hp || '-';
  document.getElementById('sp-email').textContent = p.email || '-';
  document.getElementById('sp-time').textContent = `${timestamp || '-'} (${sessionName || ''})`;

  const catPill = document.getElementById('sp-kategori');
  if (catPill) {
    catPill.textContent = p.kategori;
    catPill.className = 'cat-pill ' + (
      p.kategori === 'Peserta Rakorda' ? 'cat-peserta' :
      (p.kategori.includes('BAN') ? 'cat-ban' : 'cat-sek')
    );
  }

  const qrCanvas = document.getElementById('sp-qr-canvas');
  if (qrCanvas && window.drawQRCode) {
    window.drawQRCode(p.qr_code, qrCanvas, 120, '#6b1426');
  }

  const avatar = document.getElementById('sp-avatar');
  if (avatar) {
    const initials = p.nama_lengkap.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    avatar.textContent = initials || 'RK';
  }
}

// Quick Test Simulator
window.simulateTestScan = async function(type) {
  if (type === 'random') {
    const res = await fetch('/api/participants');
    const data = await res.json();
    if (data.participants && data.participants.length > 0) {
      const p = data.participants[Math.floor(Math.random() * data.participants.length)];
      handleDetectedCode(p.qr_code);
    }
  } else if (type === 'invalid') {
    handleDetectedCode('RKD26-INVALID-CODE-999');
  }
};

// Scan via Native Camera Capture (iPhone / Android)
window.handleQRFileScan = async function(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  showToast("📸 Memproses foto QR Code...", "info");
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = async function() {
      try {
        let canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let codeText = null;
        if (typeof jsQR === 'function') {
          const qr = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });
          if (qr && qr.data) codeText = qr.data;
        }

        if (!codeText && 'BarcodeDetector' in window) {
          try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0) codeText = barcodes[0].rawValue;
          } catch(err) {}
        }

        if (codeText) {
          handleDetectedCode(codeText);
        } else {
          showToast("QR Code tidak terdeteksi pada foto. Pastikan kartu QR terlihat jelas dan terang.", "warning");
        }
      } catch(err) {
        showToast("Gagal memproses gambar: " + err.message, "danger");
      }
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};
