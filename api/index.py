import os
import json
import urllib.parse
import urllib.request
import hashlib
from datetime import datetime
from http.server import BaseHTTPRequestHandler

SESSION_DICT = {
    "H1_REG": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "14:00 - 16:00", "title": "Hari 1: Check-in, ID Card & Kamar (14:00 - 16:00)"},
    "H1_S1": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "16:00", "title": "Hari 1 - Sesi 1: Pembukaan (16:00)"},
    "H1_S2": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "19:30", "title": "Hari 1 - Sesi 2: Materi Malam (19:30)"},
    "H2_S1": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "08:00", "title": "Hari 2 - Sesi 1: Pagi (08:00)"},
    "H2_S2": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "13:00", "title": "Hari 2 - Sesi 2: Siang (13:00)"},
    "H2_S3": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "16:00", "title": "Hari 2 - Sesi 3: Sore (16:00)"},
    "H2_S4": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "19:30", "title": "Hari 2 - Sesi 4: Malam (19:30)"}
}

DEFAULT_PARTICIPANTS = [
    {"id": 1, "nomor_peserta": "RKD-BAN-001", "nama_lengkap": "Tata Sumitra Wirasasmita, S.Si., M.Mgt.", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Ketua/Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "tata.sumitra.wirasasmita@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-001-BBDB4A"},
    {"id": 2, "nomor_peserta": "RKD-BAN-002", "nama_lengkap": "Dr. Sandra Taufik Hidayat, M.Ag.", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretaris/Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "sandra.taufik.hidayat@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-002-B2E7D1"},
    {"id": 3, "nomor_peserta": "RKD-BAN-003", "nama_lengkap": "Dr. Asep Saepudin, M.Pd", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "asep.saepudin.mpd@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-003-206112"},
    {"id": 4, "nomor_peserta": "RKD-BAN-004", "nama_lengkap": "Dr. Budi Santoso, S.T., M.Pd", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "budi.santoso..mpd@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-004-EE51E8"},
    {"id": 5, "nomor_peserta": "RKD-BAN-005", "nama_lengkap": "Dadang Setiawan, S.Pd", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "dadang.setiawan.spd@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-005-C85E07"},
    {"id": 6, "nomor_peserta": "RKD-BAN-006", "nama_lengkap": "Dr. Dini Irawati, M.Pd.", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "dini.irawati@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-006-03A899"},
    {"id": 7, "nomor_peserta": "RKD-BAN-007", "nama_lengkap": "Dr. Eko Sulistiono, S.Pd., M.Pd", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "eko.sulistiono..mpd@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-007-E1B811"},
    {"id": 8, "nomor_peserta": "RKD-BAN-008", "nama_lengkap": "Dr. Nurul Fahimah., S.Pd., M.Si", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "nurul.fahima..msi@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-008-1E8255"},
    {"id": 9, "nomor_peserta": "RKD-BAN-009", "nama_lengkap": "Dr. Saripudin, M.Pd.", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "saripudin@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-009-475EE3"},
    {"id": 10, "nomor_peserta": "RKD-BAN-010", "nama_lengkap": "Dr. H. Ujang Syarip Hidayat, M.Pd.", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "ujang.syarip.hidayat@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-010-F3CF0B"},
    {"id": 11, "nomor_peserta": "RKD-BAN-011", "nama_lengkap": "Dra. Yayah Kusbudiah, M.M.Pd", "instansi": "BAN-PDM Provinsi Jawa Barat", "jabatan": "Anggota", "kategori": "Anggota BAN-PDM", "no_hp": "0812xxxxxxxx", "email": "yayah.kusbudiah@banpdm-jabar.or.id", "qr_code": "RKD26-RKD-BAN-011-996BDD"},
    {"id": 12, "nomor_peserta": "RKD-SEK-001", "nama_lengkap": "Susan Susanto, S.E", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "KPKK", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "susan.susanto@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-001-2C98BB"},
    {"id": 13, "nomor_peserta": "RKD-SEK-002", "nama_lengkap": "Iwan Suherman, S.H.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "iwan.suherman@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-002-7F5E5B"},
    {"id": 14, "nomor_peserta": "RKD-SEK-003", "nama_lengkap": "Rosi Siti Nurjanah, S.T.P.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "rosi.siti.nurjanah@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-003-99B589"},
    {"id": 15, "nomor_peserta": "RKD-SEK-004", "nama_lengkap": "Mokhamad Taufiq Hidayatullah, S.S.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "mokhamad.taufiq.hidayatullah@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-004-9B6B77"},
    {"id": 16, "nomor_peserta": "RKD-SEK-005", "nama_lengkap": "Aji Fazlurrahman, S.H.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "aji.fazlurrahman@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-005-60C5BE"},
    {"id": 17, "nomor_peserta": "RKD-SEK-006", "nama_lengkap": "Ariz Rizaludin, S.H.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "ariz.rizaludin@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-006-CF5FA1"},
    {"id": 18, "nomor_peserta": "RKD-SEK-007", "nama_lengkap": "Asep Zamaludin, S.Sos", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "asep.zamaludin.os@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-007-F8A56A"},
    {"id": 19, "nomor_peserta": "RKD-SEK-008", "nama_lengkap": "Lisma Ula Yanuardi, S.Pd.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "lisma.ula.yanuardi@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-008-DCE0CB"},
    {"id": 20, "nomor_peserta": "RKD-SEK-009", "nama_lengkap": "Mohamad Heri Hadian, S.Pd.I.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "mohamad.heri.hadian.i@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-009-E57663"},
    {"id": 21, "nomor_peserta": "RKD-SEK-010", "nama_lengkap": "Saraswati, S.Pt.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "saraswati@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-010-7D3D4A"},
    {"id": 22, "nomor_peserta": "RKD-SEK-011", "nama_lengkap": "Wahidah Safinatunnajah Yusuf", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "wahidah.safinatunnajah.yusuf@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-011-8BAA14"},
    {"id": 23, "nomor_peserta": "RKD-SEK-012", "nama_lengkap": "Abdul Roup, S.T.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "abdul.roup@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-012-EA97AE"},
    {"id": 24, "nomor_peserta": "RKD-SEK-013", "nama_lengkap": "Dadan Ramdani, S.Sos.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "dadan.ramdani.os@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-013-282CB2"},
    {"id": 25, "nomor_peserta": "RKD-SEK-014", "nama_lengkap": "Hilmi Haidar NS, S.E.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "hilmi.haidar.ns@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-014-8FF825"},
    {"id": 26, "nomor_peserta": "RKD-SEK-015", "nama_lengkap": "Kankan Yudistira, S.ST.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "kankan.yudistira.t@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-015-0EF5C3"},
    {"id": 27, "nomor_peserta": "RKD-SEK-016", "nama_lengkap": "Yusup Taptajani, S.E.", "instansi": "Sekretariat BAN-PDM Provinsi Jawa Barat", "jabatan": "Sekretariat", "kategori": "Sekretariat", "no_hp": "0813xxxxxxxx", "email": "yusup.taptajani@sekretariat.banpdm-jabar.or.id", "qr_code": "RKD26-RKD-SEK-016-855EFE"}
]

# In-memory storage for serverless runtime
ATTENDANCE_CACHE = []

class handler(BaseHTTPRequestHandler):
    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/status":
            self.send_json({
                "status": "ok",
                "app": "RAKORDA II JABAR 2026 - Vercel Cloud",
                "dates": "6, 7, 8 Desember 2026",
                "subtitle": "BAN-PDM PROVINSI JAWA BARAT",
                "timestamp": datetime.now().isoformat()
            })

        elif path == "/api/settings":
            self.send_json({
                "cert_min_days": "2",
                "app_title": "RAKORDA II JABAR 2026",
                "app_subtitle": "BAN-PDM PROVINSI JAWA BARAT",
                "event_theme": "Transformasi Akreditasi Menuju Pendidikan Bermutu dan Berkeadilan di Jawa Barat",
                "event_dates_str": "6, 7, dan 8 Desember 2026",
                "event_dates": "[\"2026-12-06\", \"2026-12-07\", \"2026-12-08\"]",
                "event_location": "HARRIS Hotel & Conventions Festival Citylink, Bandung",
                "cert_number_prefix": "821.1/BAN-PDM-JBR/RKD-II/XII/2026",
                "cert_min_sessions": "4",
                "signer1_title": "Ketua BAN-PDM Provinsi Jawa Barat",
                "signer1_name": "Tata Sumitra Wirasasmita, S.Si., M.Mgt.",
                "signer1_nip": "NIP. 19680512 199303 1 004",
                "signer2_title": "Sekretaris BAN-PDM Provinsi Jawa Barat",
                "signer2_name": "Dr. Sandra Taufik Hidayat, M.Ag.",
                "signer2_nip": "NIP. 19740921 199903 2 002"
            })

        elif path == "/api/participants":
            kategori = query.get("kategori", [""])[0].strip()
            search = query.get("search", [""])[0].strip().lower()
            res = []
            for p in DEFAULT_PARTICIPANTS:
                if kategori and p.get("kategori") != kategori:
                    continue
                if search and search not in p.get("nama_lengkap", "").lower() and search not in p.get("nomor_peserta", "").lower():
                    continue
                res.append(p)
            self.send_json({"total": len(res), "participants": res})

        elif path == "/api/stats":
            self.send_json({
                "total_peserta": len(DEFAULT_PARTICIPANTS),
                "total_registrasi": len(DEFAULT_PARTICIPANTS),
                "h1_reg": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H1_REG"]),
                "h1_s1": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H1_S1"]),
                "h1_s2": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H1_S2"]),
                "h2_s1": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H2_S1"]),
                "h2_s2": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H2_S2"]),
                "h2_s3": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H2_S3"]),
                "h2_s4": len([a for a in ATTENDANCE_CACHE if a.get("session_id") == "H2_S4"]),
                "hadir_lengkap": 0,
                "tidak_hadir": len(DEFAULT_PARTICIPANTS),
                "recent_scans": ATTENDANCE_CACHE[-10:][::-1]
            })

        elif path == "/api/attendance/report":
            report = []
            for idx, p in enumerate(DEFAULT_PARTICIPANTS, 1):
                p_att = [a for a in ATTENDANCE_CACHE if a.get("participant_id") == p["id"]]
                tot = len(set([a["session_id"] for a in p_att]))
                row = dict(p)
                row["no"] = idx
                row["total_sesi"] = tot
                row["status"] = "LENGKAP 7 SESI" if tot == 7 else (f"HADIR ({tot}/7)" if tot > 0 else "TIDAK HADIR")
                for s_id in SESSION_DICT.keys():
                    match = [a for a in p_att if a["session_id"] == s_id]
                    row[s_id.lower()] = match[0]["scanned_at"] if match else None
                report.append(row)
            self.send_json({"report": report})

        else:
            self.send_json({"error": "Endpoint not found"}, status_code=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('content-length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}

        if path == "/api/attendance/scan":
            qr_code = body.get("qr_code", "").strip()
            session_id = body.get("session_id", "H1_REG").strip()
            scanned_by = body.get("scanned_by", "Petugas").strip()

            participant = None
            for p in DEFAULT_PARTICIPANTS:
                if p["qr_code"].upper() == qr_code.upper() or p["nomor_peserta"].upper() == qr_code.upper() or p["nomor_peserta"].upper() in qr_code.upper():
                    participant = p
                    break

            if not participant:
                self.send_json({"status": "NOT_FOUND", "message": f"QR Code '{qr_code}' tidak terdaftar!"})
                return

            # Check already scanned
            already = [a for a in ATTENDANCE_CACHE if a.get("participant_id") == participant["id"] and a.get("session_id") == session_id]
            if already:
                self.send_json({
                    "status": "ALREADY_SCANNED",
                    "message": f"{participant['nama_lengkap']} sudah presensi sesi ini pada {already[0]['scanned_at']}.",
                    "scanned_at": already[0]["scanned_at"],
                    "session_name": SESSION_DICT.get(session_id, {}).get("title", session_id),
                    "participant": participant
                })
                return

            scan_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            record = {
                "participant_id": participant["id"],
                "session_id": session_id,
                "session_name": SESSION_DICT.get(session_id, {}).get("title", session_id),
                "event_date": SESSION_DICT.get(session_id, {}).get("date", "2026-12-06"),
                "scanned_at": scan_time,
                "scanned_by": scanned_by,
                "participant": participant
            }
            ATTENDANCE_CACHE.append(record)

            self.send_json({
                "status": "SUCCESS",
                "message": f"Presensi berhasil! {participant['nama_lengkap']} tercatat hadir.",
                "scanned_at": scan_time,
                "session_name": record["session_name"],
                "participant": participant
            })

        else:
            self.send_json({"error": "Endpoint not found"}, status_code=404)
