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

// Dual Audio Chimes (Embedded WAV Fallback for iOS/Android)
const AUDIO_SUCCESS_B64 = "data:audio/wav;base64,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xJhZN0qFu8SaWzdJg7rFm104SIG4xZ1fOUd/t8WfYTpGfbXFoGM7RXu0xaJlPER5ssWjZzxEd7DFpWk+Q3WvxKZrP0JzrcSobUBCcqvEqW9BQXCqw6pxQkFuqMOrc0NAbKbDrXVEQGukwq53RkBpo8GveEdAZ6HBsHpIP2afwLF8Sj9knb+yfks/Y5u/s4BNP2GZvrOCTj9gmL20hFA/Xpa8tYVRP12Uu7WHU0Bckrq2iVRAW5C5topWQFmPuLeMV0BYjbe3jllBV4u2uI9bQVaJtbiRXEJViLS4kl5CVIayuZRgQ1OEsbmVYURSgrC5l2NEUYGvuZhlRVF/rbmZZkZQfay5m2hGT3yquZxqR096qbmda0hOeai4nm1JTnemuJ9uSk11pbigcEtNdKO4oXJMTHOit6JzTUxxoLejdU5McJ+2pHdPTG6dtqV4UEttnLWmelFLbJq1p3tTS2qZtKd9VEtpl7OoflVLaJazqYBWS2eUsqmBV0tmk7Gqg1lLZZGwqoRaTGSQsKuFW0xjjq+rh11MYo2urIheTGGMrayJX01giqysi2FNX4mrrIxiTl6Hqq2NY05dhqmtjmVPXYSorZBmT1yDp62RZ1BbgqatkmlQW4ClrZNqUVp/pK2Ua1JafqKtlW1SWXyhrJZuU1l7oKyXb1RZep+smHFVWHmerJhyVVh4nauZc1ZYdpurmnVXWHWaq5t2WFd0maqbd1lXc5iqnHhaV3KXqZ16W1dxlamde1xXcJSonnxdV2+TqJ59Xldukqeffl9XbZGnn4BgV22Ppp+BYVhsjqWggmJYa42loINjWGqMpKCEZFhpi6OhhWVZaYqioYZmWWiIoqGHZ1loh6GhiGhaZ4agoYlpWmaFn6GKalpmhJ6himtbZYOdoYtsW2WCnaGMbVxlgZyhjW5dZICboY5wXWR/mqGOcV5kfpmhj3JeY32YoJBzX2N8l6CQdGBje5agkXVgY3qVn5F2YWN6lJ+Sd2JjeZOfknhiY3iTnpN4Y2N3kp6TeWRjd5GelHplY3aQnZR7ZWN1j52UfGZjdI6clX1nY3SNnJV+aGNzjJuVf2hjc4ublX9pY3KKmpWAamRyipmWgWtkcYmZloJsZHGImJaCbGVwh5iWg21lcIaXloRuZXCFlpaEb2ZvhZaWhXBmb4SVloVwZm+DlJaGcWc=";
const AUDIO_WARNING_B64 = "data:audio/wav;base64,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ZnmMnq+/zNbe4uLf2c/DtKSSf21bSjwvJiAdHSEoMz9PYHKElqi4xtHa3+Hf2tLHuqqZh3VjUkM1KyMfHiEmLztJWWp9j6Cwv8vV3N/f29XLvrCgjnxqWUk8MCciICElLTdEU2R1h5mpuMXQ2Nze3NbOw7WmlYNyYVBCNiwlIiEkKzRATl1ugJGisr/L09nc29fQxrqrm4p5aFhJPDEpJCMkKTE8SVdoeYqbq7nFz9ba2tjSyb6xopGAb19PQjYuKCUlKS84RFJhcoOUpLK/ytLX2dfTzMK1p5iHdmZWSDwyKycmKC42QE1ca3yNnay5xM3U19fUzsW6rJ2OfW1dT0I3LyooKS0zPUlWZXWGlqWzv8nQ1NXUz8e9saOUhHRkVUg9NC0qKiwyOkVRYG9/j56sucTM0dTT0MnAtaiainprXE5CODEtKywxOEFNWml5iJims77HztHS0MvDua2fkIFxYlRIPTUwLS0wNj5JVWNygpGgrbnDys/R0MzFvLGklod4aVtOQzozLy4wNTxGUV5tfIuZp7O+xsvOz8zHv7Wpm41+b2FUSD43MjAxNDpDTVlndoSToa24wcjMzczIwbitoJKEdWdaTkM7NTIyNDlASlVicH6Nm6izvcTJy8vIw7uxpZiKe21gU0hAOTUzNDg+R1Fda3mHlaKuuMDGycrIxL20qZ2PgXNmWU5EPTg1NTg9RE5ZZnOBj5yos7zCx8jIxL62rKGUh3lsX1NJQTs3Njg8QktVYW57iZairbe+xMbHxMC5sKWZjH9xZVlORT86ODk8QUhSXWl2g5CdqLK6wMTFxMC6sqmdkYR3al5TSkM9Ojo8QEZPWWVxfouXo622vcHDw8G8tayhlol8cGRYT0dBPTs8P0VMVmBseYWSnaixub7BwsC8tq6lmo6CdWleVEtEQD09P0RKU11odICMmKOttLu+wMC9uLGonpKGem5jWVBIQ0A/QENJUFpkb3uHk56osLe8vr69uLKroZeLf3NoXlRMRkJAQUNITldga3aCjpmjrLO4vL28ubStpJqPhHhtYllRSkVCQkNHTVRdZ3J9iZSep6+1ubu7ubWvp56TiH1yZ15VTkhFRERHTFJaZG55hI+Zo6uxtrm6uLWwqaGXjYJ3bGJZUkxIRUVHS1FYYWp1f4qVnqeus7a4uLWxq6OakIZ7cWdeVk9LSEdIS1BWXmdxe4aQmqKqr7S2trWxrKWdlIqAdWtiWlNOSklJS09UXGRtd4GLlZ6mrLG0tbSxraegl46EenBnXldRTUtKS05TWmFqc32HkZqhqK2xs7OxrqiimpGIfnRrYltVUE1MTE9TWF9ncHmDjJWdpKqusbKxrqmjnJSLgnhvZ19YU1BOTU9SV11lbXZ/iJGZoaerrrCwrqqlnpeOhXxza2NcV1JQT1BSVlxianJ7hI2VnaOorK6uraqmoJmRiYB3b2dgWlVSUVFTVlthaHB4gYmRmZ+lqaytrKqmoZuUjIN7c2tkXVhVU1JTVlpfZm11fYWOlZyipqmrq6mmop2Wj4d+dm5nYVxYVVRUVlleZGtyeoKKkZieo6epqammo56YkYmCenJrZF9bV1ZWV1ldYmlwd3+GjpWboKSmqKemo5+Zk4yFfXZuaGJeWlhXWFpdYWdtdHyDipGXnaGkpqalo5+alY6HgHlya2ZhXVpZWVpdYWZrcnmAh46UmZ6hpKSkop+blpCKg3x1b2lkYF1bWltdYGVqcHZ9hIuRlpufoaOjop+cl5KMhX94cmxnYl9dXFxeYGRpbnR7gYeOk5icn6GhoZ+cmJOOiIF7dW9qZWJfXl5fYWRobXJ4foWLkJWZnJ6gn56cmJSPioR+eHJtaGRiYF9gYWRnbHF2fIKIjZKWmpyenp2bmZWQi4aAenVwa2dkYmFhYmRna291eoCFio+Ul5qcnJybmJWRjYiCfXhybmpnZGNiY2Vnam5zeH2DiI2RlZeZm5uamJWSjomEf3p1cW1pZ2VkZGVnam5yd3uAhYqOkpWXmZmZl5WSj4qGgXx4c29saWdmZmZoam1xdXp+g4iMj5OVl5eXlpWS";

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
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

// Buka kunci audio di HP Android & iOS saat layar pertama kali disentuh / diklik
if (typeof document !== 'undefined') {
  const unlockAudio = () => {
    try {
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch(e) {}
  };
  ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { passive: true });
  });
}

/**
 * Mainkan suara scanner dengan Dual Engine (Web Audio API + HTML5 Audio Fallback)
 * Memastikan suara 100% berbunyi kencang di HP iPhone, Android, dan Laptop!
 */
window.playSound = async function(type) {
  let played = false;

  // 1. Engine Utama: Web Audio API (Chime frekuensi tinggi nyaring khas scanner kasir/bandara)
  try {
    initAudio();
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        // Nada Sukses: Crisp dual-tone (1174Hz D6 -> 1760Hz A6) nyaring & tegas
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now);
        osc.frequency.setValueAtTime(1760.00, now + 0.07);
        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
        played = true;
      } else {
        // Nada Peringatan / Sudah Absen: 2-tone descending buzz (440Hz -> 330Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        played = true;
      }
    }
  } catch (e) {
    console.warn("WebAudio playback error, fallback to HTML5 Audio:", e);
  }

  // 2. Engine Cadangan: HTML5 Audio Object (Untuk HP yang memblokir WebAudio saat silent/kebijakan browser)
  try {
    const audioSrc = (type === 'success') ? AUDIO_SUCCESS_B64 : AUDIO_WARNING_B64;
    const snd = new Audio(audioSrc);
    snd.volume = 1.0;
    const playPromise = snd.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("HTML5 audio autoplay prevented:", err);
      });
    }
  } catch (e) {}
};

/**
 * Tombol tes suara agar pengguna bisa langsung mendengarkan nada scanner & memastikan volume HP aktif
 */
window.testBeepSound = function() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  window.playSound('success');
  if (typeof showToast === 'function') {
    showToast("🔊 Nada scanner berbunyi (Pastikan HP tidak dalam mode Silent/Hening)", "success");
  }
};

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
