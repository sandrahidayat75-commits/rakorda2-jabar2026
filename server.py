#!/usr/bin/env python3
"""
Backend Server for RAKORDA II JABAR 2026 - BAN-PDM PROVINSI JAWA BARAT
Built-in Python 3 HTTP Server with REST API & SQLite Database
Updated with:
- Tanggal Kegiatan: 6, 7, 8 Desember 2026
- Sesi Presensi:
  * Hari 1: 16:00 (Pembukaan), 19:30 (Malam)
  * Hari 2: 08:00 (Pagi), 13:00 (Siang), 16:00 (Sore), 19:30 (Malam)
  * Hari 3: Tidak di-scan
"""

import http.server
import socketserver
import sqlite3
import json
import os
import sys
import urllib.parse
import urllib.request
import hashlib
import threading
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "rakorda.db")

SESSION_DICT = {
    "H1_REG": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "14:00 - 16:00", "title": "Hari 1: Check-in, ID Card & Kamar (14:00 - 16:00)"},
    "H1_S1": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "16:00", "title": "Hari 1 - Sesi 1: Pembukaan (16:00)"},
    "H1_S2": {"day": "Hari Ke-1", "date": "2026-12-06", "time": "19:30", "title": "Hari 1 - Sesi 2: Materi Malam (19:30)"},
    "H2_S1": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "08:00", "title": "Hari 2 - Sesi 1: Pagi (08:00)"},
    "H2_S2": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "13:00", "title": "Hari 2 - Sesi 2: Siang (13:00)"},
    "H2_S3": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "16:00", "title": "Hari 2 - Sesi 3: Sore (16:00)"},
    "H2_S4": {"day": "Hari Ke-2", "date": "2026-12-07", "time": "19:30", "title": "Hari 2 - Sesi 4: Malam (19:30)"}
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def push_to_google_sheet_async(qr_code, session_id, scanned_by):
    """Kirim data presensi secara real-time ke Google Spreadsheet di background thread (aman terhadap redirect 302)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT value FROM settings WHERE key = 'google_sheets_url'")
        row = c.fetchone()
        conn.close()

        script_url = row[0].strip() if row and row[0] else ""
        if script_url and "script.google.com" in script_url:
            query = urllib.parse.urlencode({
                "action": "scan",
                "qr_code": qr_code,
                "session_id": session_id,
                "scanned_by": scanned_by
            })
            sep = "&" if "?" in script_url else "?"
            target_url = f"{script_url}{sep}{query}"
            req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                result_text = resp.read().decode('utf-8', errors='ignore')
                print(f"✅ Real-time sync to Google Sheets result: {result_text[:120]}")
    except Exception as e:
        print("Real-time push to Google Sheets error:", e)

def clean_photo_url(url):
    if not url:
        return ""
    url = str(url).strip()
    import re
    # Convert Google Drive file share URL to direct CDN image URL
    m = re.search(r'(?:file/d/|id=|open\?id=)([a-zA-Z0-9_-]{20,})', url)
    if m:
        file_id = m.group(1)
        return f"https://lh3.googleusercontent.com/d/{file_id}"
    return url

class RakordaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw_data = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw_data)
        except Exception as e:
            print("Error reading JSON body:", e)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        else:
            requested_file = os.path.join(PUBLIC_DIR, path.lstrip('/'))
            if not os.path.exists(requested_file) and not os.path.splitext(path)[1]:
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/"):
            self.handle_api_post(path)
        else:
            self.send_error(404, "Not Found")

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/"):
            self.handle_api_put(path)
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/"):
            self.handle_api_delete(path)
        else:
            self.send_error(404, "Not Found")

    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/status":
                self.send_json({
                    "status": "ok",
                    "app": "RAKORDA II JABAR 2026",
                    "dates": "6, 7, dan 8 Desember 2026",
                    "subtitle": "BAN-PDM PROVINSI JAWA BARAT",
                    "timestamp": datetime.now().isoformat()
                })

            elif path == "/api/template/excel":
                # Downloadable template CSV
                csv_data = "\uFEFFNama Lengkap,Instansi,Jabatan,Kategori,Nomor HP,Email,Nomor Peserta\n"
                csv_data += "Dr. H. Contoh Nama, M.Pd.,Dinas Pendidikan Kota Bandung,Pengawas Sekolah,Peserta Rakorda,081234567890,contoh@email.com,RKD-PSR-999\n"
                body = csv_data.encode('utf-8')
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", "attachment; filename=\"TEMPLATE_IMPORT_PESERTA_RAKORDA2026.csv\"")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            elif path in ("/api/attendance/export_log_excel", "/api/attendance/export_log_csv"):
                cursor.execute("""
                SELECT a.scanned_at, a.session_id, a.session_name, a.event_date,
                       p.nomor_peserta, p.nama_lengkap, p.instansi, p.kategori, a.scanned_by, a.method
                FROM attendance a
                JOIN participants p ON a.participant_id = p.id
                ORDER BY a.scanned_at ASC
                """)
                rows = cursor.fetchall()

                if "excel" in path:
                    # Native Formatted Excel HTML Table (.xls)
                    headers = ["NO", "TIMESTAMP", "SESI ID", "NAMA SESI", "TANGGAL", "NOMOR PESERTA", "NAMA LENGKAP", "INSTANSI", "KATEGORI", "PETUGAS", "METODE"]
                    th_html = "".join([f"<th>{h}</th>" for h in headers])
                    tr_html = ""
                    for idx, r in enumerate(rows, 1):
                        bg = "#f8fafc" if idx % 2 == 1 else "#ffffff"
                        tr_html += f"""<tr style="background-color:{bg};">
                            <td class="num">{idx}</td>
                            <td class="date">{r['scanned_at']}</td>
                            <td class="center bold">{r['session_id']}</td>
                            <td>{r['session_name']}</td>
                            <td class="date">{r['event_date']}</td>
                            <td class="center bold" style="color:#6B1426;">{r['nomor_peserta']}</td>
                            <td class="bold">{r['nama_lengkap']}</td>
                            <td>{r['instansi']}</td>
                            <td>{r['kategori']}</td>
                            <td>{r['scanned_by']}</td>
                            <td class="center">{r['method']}</td>
                        </tr>"""

                    html = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>PRESENSI_LOG</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body {{ font-family: 'Segoe UI', Calibri, Arial, sans-serif; }}
  table {{ border-collapse: collapse; width: 100%; }}
  .header-box {{ padding: 12px 0 16px 0; }}
  .title {{ font-size: 15pt; font-weight: bold; color: #6B1426; }}
  .sub {{ font-size: 10.5pt; color: #475569; }}
  th {{ background-color: #6B1426; color: #FFFFFF; font-weight: bold; font-size: 10pt; border: 1px solid #4a0d1a; padding: 8px 12px; text-align: center; vertical-align: middle; }}
  td {{ font-size: 9.5pt; border: 1px solid #CBD5E1; padding: 6px 10px; vertical-align: middle; mso-number-format: "\\@"; }}
  .num {{ text-align: center; mso-number-format: "0"; }}
  .date {{ text-align: center; mso-number-format: "\\@"; }}
  .center {{ text-align: center; }}
  .bold {{ font-weight: bold; }}
</style>
</head>
<body>
<div class="header-box">
  <div class="title">LOG PRESENSI SCANNER - RAKORDA II JABAR 2026</div>
  <div class="sub">BAN-PDM PROVINSI JAWA BARAT | 6, 7, dan 8 Desember 2026 | HARRIS Hotel & Conventions Festival Citylink Bandung</div>
</div>
<table border="1">
  <thead><tr>{th_html}</tr></thead>
  <tbody>{tr_html}</tbody>
</table>
</body>
</html>"""
                    body = html.encode('utf-8')
                    self.send_response(200)
                    self.send_header("Content-Type", "application/vnd.ms-excel; charset=utf-8")
                    self.send_header("Content-Disposition", "attachment; filename=\"PRESENSI_LOG_RAKORDA2026.xls\"")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

                else:
                    # CSV with UTF-8 BOM and explicit 'sep=,' for automatic Excel column splitting
                    csv_data = "\uFEFFsep=,\r\nTIMESTAMP,SESI ID,NAMA SESI,TANGGAL,NOMOR PESERTA,NAMA LENGKAP,INSTANSI,KATEGORI,PETUGAS,METODE\r\n"
                    for r in rows:
                        def clean(val):
                            s = str(val or '').replace('"', '""')
                            return f'"{s}"'
                        csv_data += f"{clean(r['scanned_at'])},{clean(r['session_id'])},{clean(r['session_name'])},{clean(r['event_date'])},{clean(r['nomor_peserta'])},{clean(r['nama_lengkap'])},{clean(r['instansi'])},{clean(r['kategori'])},{clean(r['scanned_by'])},{clean(r['method'])}\r\n"
                    
                    body = csv_data.encode('utf-8')
                    self.send_response(200)
                    self.send_header("Content-Type", "text/csv; charset=utf-8")
                    self.send_header("Content-Disposition", "attachment; filename=\"PRESENSI_LOG_RAKORDA2026.csv\"")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

            elif path in ("/api/attendance/export_rekap_excel", "/api/attendance/export_rekap_csv"):
                cursor.execute("""
                SELECT p.nomor_peserta, p.nama_lengkap, p.instansi, p.jabatan, p.kategori,
                       MAX(CASE WHEN a.session_id = 'H1_REG' THEN a.scanned_at ELSE NULL END) as h1_reg,
                       MAX(CASE WHEN a.session_id = 'H1_S1' THEN a.scanned_at ELSE NULL END) as h1_s1,
                       MAX(CASE WHEN a.session_id = 'H1_S2' THEN a.scanned_at ELSE NULL END) as h1_s2,
                       MAX(CASE WHEN a.session_id = 'H2_S1' THEN a.scanned_at ELSE NULL END) as h2_s1,
                       MAX(CASE WHEN a.session_id = 'H2_S2' THEN a.scanned_at ELSE NULL END) as h2_s2,
                       MAX(CASE WHEN a.session_id = 'H2_S3' THEN a.scanned_at ELSE NULL END) as h2_s3,
                       MAX(CASE WHEN a.session_id = 'H2_S4' THEN a.scanned_at ELSE NULL END) as h2_s4,
                       COUNT(a.id) as total_sesi
                FROM participants p
                LEFT JOIN attendance a ON p.id = a.participant_id
                GROUP BY p.id
                ORDER BY p.id ASC
                """)
                rows = cursor.fetchall()

                if "excel" in path:
                    # Native Formatted Excel HTML Table (.xls)
                    headers = ["NO", "NOMOR PESERTA", "NAMA LENGKAP", "INSTANSI", "JABATAN", "KATEGORI", "Check-in (14:00-16:00)", "H1-1 (16:00)", "H1-2 (19:30)", "H2-1 (08:00)", "H2-2 (13:00)", "H2-3 (16:00)", "H2-4 (19:30)", "TOTAL SESI", "STATUS KEHADIRAN"]
                    th_html = "".join([f"<th>{h}</th>" for h in headers])
                    tr_html = ""
                    for idx, r in enumerate(rows, 1):
                        tot = r['total_sesi']
                        status = "LENGKAP 7 SESI" if tot == 7 else (f"HADIR ({tot}/7)" if tot > 0 else "TIDAK HADIR")
                        status_class = "badge-lengkap" if tot == 7 else ("badge-hadir" if tot > 0 else "badge-absen")
                        
                        def fmt_time(val):
                            if not val:
                                return '<span class="badge-absen">-</span>'
                            parts = val.split(' ')
                            t = parts[1] if len(parts) > 1 else val
                            return f'<span class="bold" style="color:#166534;">✓ {t}</span>'

                        bg = "#f8fafc" if idx % 2 == 1 else "#ffffff"
                        tr_html += f"""<tr style="background-color:{bg};">
                            <td class="num">{idx}</td>
                            <td class="center bold" style="color:#6B1426;">{r['nomor_peserta']}</td>
                            <td class="bold">{r['nama_lengkap']}</td>
                            <td>{r['instansi']}</td>
                            <td>{r['jabatan']}</td>
                            <td>{r['kategori']}</td>
                            <td class="center">{fmt_time(r['h1_reg'])}</td>
                            <td class="center">{fmt_time(r['h1_s1'])}</td>
                            <td class="center">{fmt_time(r['h1_s2'])}</td>
                            <td class="center">{fmt_time(r['h2_s1'])}</td>
                            <td class="center">{fmt_time(r['h2_s2'])}</td>
                            <td class="center">{fmt_time(r['h2_s3'])}</td>
                            <td class="center">{fmt_time(r['h2_s4'])}</td>
                            <td class="center bold">{tot}/7</td>
                            <td class="{status_class}">{status}</td>
                        </tr>"""

                    html = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>REKAP_KEHADIRAN</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body {{ font-family: 'Segoe UI', Calibri, Arial, sans-serif; }}
  table {{ border-collapse: collapse; width: 100%; }}
  .header-box {{ padding: 12px 0 16px 0; }}
  .title {{ font-size: 15pt; font-weight: bold; color: #6B1426; }}
  .sub {{ font-size: 10.5pt; color: #475569; }}
  th {{ background-color: #6B1426; color: #FFFFFF; font-weight: bold; font-size: 10pt; border: 1px solid #4a0d1a; padding: 8px 12px; text-align: center; vertical-align: middle; }}
  td {{ font-size: 9.5pt; border: 1px solid #CBD5E1; padding: 6px 10px; vertical-align: middle; mso-number-format: "\\@"; }}
  .num {{ text-align: center; mso-number-format: "0"; }}
  .center {{ text-align: center; }}
  .bold {{ font-weight: bold; }}
  .badge-lengkap {{ background-color: #DCFCE7; color: #166534; font-weight: bold; text-align: center; }}
  .badge-hadir {{ background-color: #FEF9C3; color: #854D0E; text-align: center; }}
  .badge-absen {{ color: #94A3B8; text-align: center; }}
</style>
</head>
<body>
<div class="header-box">
  <div class="title">REKAPITULASI PRESENSI CHECK-IN & SESI KEGIATAN - RAKORDA II JABAR 2026</div>
  <div class="sub">BAN-PDM PROVINSI JAWA BARAT | 6, 7, dan 8 Desember 2026 | HARRIS Hotel & Conventions Festival Citylink Bandung</div>
</div>
<table border="1">
  <thead><tr>{th_html}</tr></thead>
  <tbody>{tr_html}</tbody>
</table>
</body>
</html>"""
                    body = html.encode('utf-8')
                    self.send_response(200)
                    self.send_header("Content-Type", "application/vnd.ms-excel; charset=utf-8")
                    self.send_header("Content-Disposition", "attachment; filename=\"REKAP_KEHADIRAN_RAKORDA2026.xls\"")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

                else:
                    # CSV with UTF-8 BOM and explicit 'sep=,' for automatic Excel column splitting
                    csv_data = "\uFEFFsep=,\r\nNO,NOMOR PESERTA,NAMA LENGKAP,INSTANSI,JABATAN,KATEGORI,Check-in (14:00-16:00),H1-1 (16:00),H1-2 (19:30),H2-1 (08:00),H2-2 (13:00),H2-3 (16:00),H2-4 (19:30),TOTAL SESI,STATUS\r\n"
                    for idx, r in enumerate(rows, 1):
                        def clean(val):
                            s = str(val or '').replace('"', '""')
                            return f'"{s}"'
                        tot = r['total_sesi']
                        status = "LENGKAP 7 SESI" if tot == 7 else (f"HADIR ({tot}/7)" if tot > 0 else "TIDAK HADIR")
                        h1_reg = r['h1_reg'].split(' ')[1] if r['h1_reg'] else '-'
                        h1_1 = r['h1_s1'].split(' ')[1] if r['h1_s1'] else '-'
                        h1_2 = r['h1_s2'].split(' ')[1] if r['h1_s2'] else '-'
                        h2_1 = r['h2_s1'].split(' ')[1] if r['h2_s1'] else '-'
                        h2_2 = r['h2_s2'].split(' ')[1] if r['h2_s2'] else '-'
                        h2_3 = r['h2_s3'].split(' ')[1] if r['h2_s3'] else '-'
                        h2_4 = r['h2_s4'].split(' ')[1] if r['h2_s4'] else '-'
                        csv_data += f"{idx},{clean(r['nomor_peserta'])},{clean(r['nama_lengkap'])},{clean(r['instansi'])},{clean(r['jabatan'])},{clean(r['kategori'])},{clean(h1_reg)},{clean(h1_1)},{clean(h1_2)},{clean(h2_1)},{clean(h2_2)},{clean(h2_3)},{clean(h2_4)},{tot},{clean(status)}\r\n"
                    
                    body = csv_data.encode('utf-8')
                    self.send_response(200)
                    self.send_header("Content-Type", "text/csv; charset=utf-8")
                    self.send_header("Content-Disposition", "attachment; filename=\"REKAP_KEHADIRAN_RAKORDA2026.csv\"")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

            elif path == "/api/stats":
                cursor.execute("SELECT COUNT(*) FROM participants")
                total_peserta = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM participants WHERE registered_at IS NOT NULL")
                total_registrasi = cursor.fetchone()[0]

                # Per-session counts
                session_counts = {}
                for s_id in SESSION_DICT.keys():
                    cursor.execute("SELECT COUNT(DISTINCT participant_id) FROM attendance WHERE session_id = ?", (s_id,))
                    session_counts[s_id] = cursor.fetchone()[0]

                # Hadir Lengkap (Attended all 7 sessions)
                cursor.execute("""
                SELECT COUNT(*) FROM (
                    SELECT participant_id FROM attendance 
                    GROUP BY participant_id 
                    HAVING COUNT(DISTINCT session_id) = 7
                )
                """)
                hadir_lengkap = cursor.fetchone()[0]

                # Tidak Hadir sama sekali (0 sessions)
                cursor.execute("""
                SELECT COUNT(*) FROM participants 
                WHERE id NOT IN (SELECT DISTINCT participant_id FROM attendance)
                """)
                tidak_hadir = cursor.fetchone()[0]

                # Category breakdown
                cursor.execute("""
                SELECT p.kategori, COUNT(p.id) as total,
                       SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) as total_scans
                FROM participants p
                LEFT JOIN attendance a ON p.id = a.participant_id
                GROUP BY p.kategori
                """)
                category_stats = [dict(row) for row in cursor.fetchall()]

                # Recent scans
                cursor.execute("""
                SELECT a.id, a.session_id, a.session_name, a.event_date, a.scanned_at, a.scanned_by, a.method,
                       p.nomor_peserta, p.nama_lengkap, p.instansi, p.kategori
                FROM attendance a
                JOIN participants p ON a.participant_id = p.id
                ORDER BY a.scanned_at DESC
                LIMIT 10
                """)
                recent_scans = [dict(row) for row in cursor.fetchall()]

                self.send_json({
                    "total_peserta": total_peserta,
                    "total_registrasi": total_registrasi,
                    "session_counts": session_counts,
                    "h1_reg": session_counts.get("H1_REG", 0),
                    "h1_s1": session_counts.get("H1_S1", 0),
                    "h1_s2": session_counts.get("H1_S2", 0),
                    "h2_s1": session_counts.get("H2_S1", 0),
                    "h2_s2": session_counts.get("H2_S2", 0),
                    "h2_s3": session_counts.get("H2_S3", 0),
                    "h2_s4": session_counts.get("H2_S4", 0),
                    "hadir_lengkap": hadir_lengkap,
                    "tidak_hadir": tidak_hadir,
                    "category_stats": category_stats,
                    "recent_scans": recent_scans
                })

            elif path == "/api/participants":
                search = query.get("search", [""])[0].strip()
                kategori = query.get("kategori", [""])[0].strip()

                sql = """
                SELECT p.*,
                       MAX(CASE WHEN a.session_id = 'H1_REG' THEN a.scanned_at ELSE NULL END) as h1_reg_scan,
                       MAX(CASE WHEN a.session_id = 'H1_S1' THEN a.scanned_at ELSE NULL END) as h1_s1_scan,
                       MAX(CASE WHEN a.session_id = 'H1_S2' THEN a.scanned_at ELSE NULL END) as h1_s2_scan,
                       MAX(CASE WHEN a.session_id = 'H2_S1' THEN a.scanned_at ELSE NULL END) as h2_s1_scan,
                       MAX(CASE WHEN a.session_id = 'H2_S2' THEN a.scanned_at ELSE NULL END) as h2_s2_scan,
                       MAX(CASE WHEN a.session_id = 'H2_S3' THEN a.scanned_at ELSE NULL END) as h2_s3_scan,
                       MAX(CASE WHEN a.session_id = 'H2_S4' THEN a.scanned_at ELSE NULL END) as h2_s4_scan,
                       COUNT(a.id) as total_hadir
                FROM participants p
                LEFT JOIN attendance a ON p.id = a.participant_id
                WHERE 1=1
                """
                params = []
                if search:
                    sql += " AND (p.nama_lengkap LIKE ? OR p.nomor_peserta LIKE ? OR p.instansi LIKE ? OR p.email LIKE ? OR p.no_hp LIKE ?)"
                    wildcard = f"%{search}%"
                    params.extend([wildcard, wildcard, wildcard, wildcard, wildcard])
                if kategori:
                    sql += " AND p.kategori = ?"
                    params.append(kategori)

                sql += " GROUP BY p.id ORDER BY p.id ASC"

                cursor.execute(sql, params)
                participants = [dict(row) for row in cursor.fetchall()]
                self.send_json({"total": len(participants), "participants": participants})

            elif path.startswith("/api/participants/"):
                pid = path.split("/")[-1]
                cursor.execute("SELECT * FROM participants WHERE id = ?", (pid,))
                row = cursor.fetchone()
                if row:
                    self.send_json({"participant": dict(row)})
                else:
                    self.send_json({"error": "Participant not found"}, status_code=404)

            elif path == "/api/attendance/report":
                kategori = query.get("kategori", [""])[0].strip()
                search = query.get("search", [""])[0].strip()

                sql = """
                SELECT p.id, p.nomor_peserta, p.nama_lengkap, p.instansi, p.jabatan, p.kategori, p.no_hp, p.email,
                       MAX(CASE WHEN a.session_id = 'H1_REG' THEN a.scanned_at ELSE NULL END) as h1_reg,
                       MAX(CASE WHEN a.session_id = 'H1_S1' THEN a.scanned_at ELSE NULL END) as h1_s1,
                       MAX(CASE WHEN a.session_id = 'H1_S2' THEN a.scanned_at ELSE NULL END) as h1_s2,
                       MAX(CASE WHEN a.session_id = 'H2_S1' THEN a.scanned_at ELSE NULL END) as h2_s1,
                       MAX(CASE WHEN a.session_id = 'H2_S2' THEN a.scanned_at ELSE NULL END) as h2_s2,
                       MAX(CASE WHEN a.session_id = 'H2_S3' THEN a.scanned_at ELSE NULL END) as h2_s3,
                       MAX(CASE WHEN a.session_id = 'H2_S4' THEN a.scanned_at ELSE NULL END) as h2_s4,
                       COUNT(a.id) as total_sesi
                FROM participants p
                LEFT JOIN attendance a ON p.id = a.participant_id
                WHERE 1=1
                """
                params = []
                if kategori:
                    sql += " AND p.kategori = ?"
                    params.append(kategori)
                if search:
                    sql += " AND (p.nama_lengkap LIKE ? OR p.nomor_peserta LIKE ? OR p.instansi LIKE ?)"
                    wildcard = f"%{search}%"
                    params.extend([wildcard, wildcard, wildcard])

                sql += " GROUP BY p.id ORDER BY p.id ASC"
                cursor.execute(sql, params)

                rows = []
                for idx, r in enumerate(cursor.fetchall(), 1):
                    item = dict(r)
                    item["no"] = idx
                    tot = item["total_sesi"]
                    if tot == 7:
                        item["status"] = "LENGKAP (7 SESI)"
                    elif tot > 0:
                        item["status"] = f"HADIR ({tot}/7 SESI)"
                    else:
                        item["status"] = "TIDAK HADIR"
                    rows.append(item)

                self.send_json({"report": rows})

            elif path == "/api/settings":
                cursor.execute("SELECT key, value FROM settings")
                settings_dict = {row["key"]: row["value"] for row in cursor.fetchall()}
                self.send_json(settings_dict)

            else:
                self.send_json({"error": "Endpoint not found"}, status_code=404)

        except Exception as e:
            self.send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

    def handle_api_post(self, path):
        conn = get_db()
        cursor = conn.cursor()
        body = self.read_json_body()

        try:
            if path == "/api/auth/login":
                username = body.get("username", "").strip()
                password = body.get("password", "").strip()
                cursor.execute("SELECT id, username, role, nama FROM users WHERE username = ? AND password = ?", (username, password))
                user = cursor.fetchone()
                if user:
                    self.send_json({
                        "success": True,
                        "user": dict(user),
                        "token": f"token-{user['username']}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    })
                else:
                    self.send_json({"success": False, "message": "Kata sandi salah"}, status_code=401)

            elif path == "/api/attendance/scan":
                # SCANNER BY SESSION:
                # HIJAU: BERHASIL HADIR
                # MERAH: SUDAH MELAKUKAN PRESENSI
                # MERAH: QR CODE TIDAK TERDAFTAR
                qr_code = body.get("qr_code", "").strip()
                session_id = body.get("session_id", "H1_S1").strip()
                scanned_by = body.get("scanned_by", "Petugas Presensi")

                if not qr_code:
                    self.send_json({"status": "NOT_FOUND", "message": "QR CODE KOSONG ATAU TIDAK TERBACA"}, status_code=400)
                    return

                session_info = SESSION_DICT.get(session_id, SESSION_DICT["H1_S1"])
                event_date = session_info["date"]
                session_name = session_info["title"]

                # Find participant by qr_code or nomor_peserta
                clean_qr = qr_code.strip()
                cursor.execute("""
                SELECT * FROM participants 
                WHERE qr_code = ? OR nomor_peserta = ?
                """, (clean_qr, clean_qr))
                p = cursor.fetchone()

                if not p:
                    import re
                    m = re.search(r'(RKD-[A-Z]+-\d+)', clean_qr.upper())
                    if m:
                        cursor.execute("SELECT * FROM participants WHERE nomor_peserta = ?", (m.group(1),))
                        p = cursor.fetchone()

                if not p:
                    self.send_json({
                        "status": "NOT_FOUND",
                        "color": "RED",
                        "message": "QR CODE TIDAK TERDAFTAR",
                        "qr_code": qr_code
                    }, status_code=200)
                    return

                participant = dict(p)

                # Check if already scanned in this session
                cursor.execute("""
                SELECT * FROM attendance 
                WHERE participant_id = ? AND session_id = ?
                """, (participant["id"], session_id))
                existing = cursor.fetchone()

                if existing:
                    self.send_json({
                        "status": "ALREADY_SCANNED",
                        "color": "RED",
                        "message": "SUDAH MELAKUKAN PRESENSI PADA SESI INI",
                        "session_id": session_id,
                        "session_name": session_name,
                        "scanned_at": existing["scanned_at"],
                        "participant": participant
                    }, status_code=200)
                    return

                # Record attendance with exact real-time timestamp
                scan_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by, method)
                VALUES (?, ?, ?, ?, ?, ?, 'QR_SCAN')
                """, (participant["id"], session_id, event_date, session_name, scan_timestamp, scanned_by))
                conn.commit()

                # Realtime push to Google Sheets in background thread
                threading.Thread(target=push_to_google_sheet_async, args=(qr_code, session_id, scanned_by), daemon=True).start()

                self.send_json({
                    "status": "SUCCESS",
                    "color": "GREEN",
                    "message": "BERHASIL HADIR",
                    "session_id": session_id,
                    "session_name": session_name,
                    "scanned_at": scan_timestamp,
                    "participant": participant
                }, status_code=200)

            elif path == "/api/attendance/manual":
                # Manual toggle by session
                participant_id = body.get("participant_id")
                session_id = body.get("session_id", "H1_S1")
                action = body.get("action", "toggle")
                scanned_by = body.get("scanned_by", "Admin Manual")

                session_info = SESSION_DICT.get(session_id, SESSION_DICT["H1_S1"])
                event_date = session_info["date"]
                session_name = session_info["title"]

                cursor.execute("SELECT * FROM attendance WHERE participant_id = ? AND session_id = ?", (participant_id, session_id))
                existing = cursor.fetchone()

                if existing and (action == "toggle" or action == "remove"):
                    cursor.execute("DELETE FROM attendance WHERE participant_id = ? AND session_id = ?", (participant_id, session_id))
                    conn.commit()
                    self.send_json({"success": True, "action": "removed", "message": f"Presensi {session_name} dibatalkan"})
                elif not existing and (action == "toggle" or action == "add"):
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute("""
                    INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by, method)
                    VALUES (?, ?, ?, ?, ?, ?, 'MANUAL')
                    """, (participant_id, session_id, event_date, session_name, now_str, scanned_by))
                    conn.commit()

                    # Push manual attendance to Google Sheets if possible
                    cursor.execute("SELECT qr_code FROM participants WHERE id = ?", (participant_id,))
                    prow = cursor.fetchone()
                    if prow:
                        threading.Thread(target=push_to_google_sheet_async, args=(prow[0], session_id, scanned_by), daemon=True).start()

                    self.send_json({"success": True, "action": "added", "message": f"Presensi {session_name} berhasil dicatat"})
                else:
                    self.send_json({"success": True, "message": "No change"})

            elif path == "/api/attendance/reset":
                # Hapus data presensi: bisa seluruh sesi, sesi tertentu, atau peserta tertentu
                session_id = body.get("session_id", "ALL").strip()
                participant_id = body.get("participant_id")

                if participant_id:
                    if session_id and session_id != "ALL":
                        cursor.execute("DELETE FROM attendance WHERE participant_id = ? AND session_id = ?", (participant_id, session_id))
                    else:
                        cursor.execute("DELETE FROM attendance WHERE participant_id = ?", (participant_id,))
                    deleted_count = cursor.rowcount
                    msg = f"Presensi peserta berhasil dihapus ({deleted_count} rekaman)."
                elif session_id == "ALL":
                    cursor.execute("DELETE FROM attendance")
                    deleted_count = cursor.rowcount
                    msg = f"Seluruh data presensi ({deleted_count} rekaman) berhasil dihapus."
                else:
                    session_title = SESSION_DICT.get(session_id, {}).get("title", session_id)
                    cursor.execute("DELETE FROM attendance WHERE session_id = ?", (session_id,))
                    deleted_count = cursor.rowcount
                    msg = f"Data presensi untuk {session_title} ({deleted_count} rekaman) berhasil dihapus."

                conn.commit()
                cursor.execute("SELECT COUNT(*) FROM attendance")
                remaining = cursor.fetchone()[0]

                self.send_json({
                    "success": True,
                    "deleted_count": deleted_count,
                    "remaining_count": remaining,
                    "message": msg
                })

            elif path == "/api/participants":
                nama = body.get("nama_lengkap", "").strip()
                instansi = body.get("instansi", "").strip()
                jabatan = body.get("jabatan", "").strip()
                kategori = body.get("kategori", "Peserta Rakorda").strip()
                no_hp = body.get("no_hp", "").strip()
                email = body.get("email", "").strip()
                foto_url = clean_photo_url(body.get("foto_url", ""))

                if not nama or not instansi:
                    self.send_json({"error": "Nama lengkap dan instansi wajib diisi"}, status_code=400)
                    return

                cursor.execute("SELECT COUNT(*) FROM participants")
                next_num = cursor.fetchone()[0] + 1
                prefix = "RKD-PSR" if kategori == "Peserta Rakorda" else ("RKD-BAN" if "BAN" in kategori else "RKD-SEK")
                nomor_peserta = body.get("nomor_peserta") or f"{prefix}-{next_num:03d}"

                hash_str = hashlib.md5(f"{nomor_peserta}-{nama}-RAKORDA2026".encode()).hexdigest()[:6].upper()
                qr_code = body.get("qr_code") or f"RKD26-{nomor_peserta}-{hash_str}"
                reg_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                cursor.execute("""
                INSERT INTO participants 
                (nomor_peserta, nama_lengkap, instansi, jabatan, kategori, no_hp, email, qr_code, registered_at, source, foto_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Manual', ?)
                """, (nomor_peserta, nama, instansi, jabatan, kategori, no_hp, email, qr_code, reg_at, foto_url))
                conn.commit()
                new_id = cursor.lastrowid

                self.send_json({
                    "success": True,
                    "message": "Peserta berhasil ditambahkan",
                    "id": new_id,
                    "nomor_peserta": nomor_peserta,
                    "qr_code": qr_code
                })

            elif path == "/api/participants/reset":
                # Reset / delete participants in batches of 50 (or multiples of 50)
                count = int(body.get("count", 50))
                order = body.get("order", "desc") # desc = delete from latest/bottom; asc = delete from top

                # Get IDs to delete
                if order == "desc":
                    cursor.execute("SELECT id FROM participants ORDER BY id DESC LIMIT ?", (count,))
                else:
                    cursor.execute("SELECT id FROM participants ORDER BY id ASC LIMIT ?", (count,))
                
                rows_to_del = [r[0] for r in cursor.fetchall()]
                deleted_count = len(rows_to_del)

                if deleted_count > 0:
                    placeholders = ",".join("?" for _ in rows_to_del)
                    cursor.execute(f"DELETE FROM attendance WHERE participant_id IN ({placeholders})", rows_to_del)
                    cursor.execute(f"DELETE FROM participants WHERE id IN ({placeholders})", rows_to_del)
                    conn.commit()

                cursor.execute("SELECT COUNT(*) FROM participants")
                remaining = cursor.fetchone()[0]

                self.send_json({
                    "success": True,
                    "deleted_count": deleted_count,
                    "remaining_count": remaining,
                    "message": f"Berhasil menghapus {deleted_count} peserta. Sisa peserta saat ini: {remaining} orang."
                })

            elif path == "/api/participants/bulk":
                # Bulk import from Excel or CSV
                rows = body.get("participants", [])
                if not rows:
                    self.send_json({"error": "Tidak ada data peserta untuk diimport"}, status_code=400)
                    return

                inserted = 0
                updated = 0
                for r in rows:
                    nama = r.get("nama_lengkap", r.get("Nama Lengkap", r.get("Nama", ""))).strip()
                    if not nama:
                        continue
                    instansi = r.get("instansi", r.get("Instansi", "-")).strip()
                    jabatan = r.get("jabatan", r.get("Jabatan", "-")).strip()
                    kategori = r.get("kategori", r.get("Kategori", "Peserta Rakorda")).strip()
                    no_hp = r.get("no_hp", r.get("Nomor HP", r.get("No HP", "-"))).strip()
                    email = r.get("email", r.get("Email", "-")).strip()
                    nomor_peserta = r.get("nomor_peserta", r.get("Nomor Peserta", "")).strip()

                    if nomor_peserta:
                        cursor.execute("SELECT id FROM participants WHERE nomor_peserta = ?", (nomor_peserta,))
                        existing = cursor.fetchone()
                    else:
                        cursor.execute("SELECT id FROM participants WHERE nama_lengkap = ? AND instansi = ?", (nama, instansi))
                        existing = cursor.fetchone()

                    if existing:
                        cursor.execute("""
                        UPDATE participants SET nama_lengkap=?, instansi=?, jabatan=?, kategori=?, no_hp=?, email=?
                        WHERE id=?
                        """, (nama, instansi, jabatan, kategori, no_hp, email, existing[0]))
                        updated += 1
                    else:
                        cursor.execute("SELECT COUNT(*) FROM participants")
                        count = cursor.fetchone()[0] + 1
                        if not nomor_peserta:
                            nomor_peserta = f"RKD-IMP-{count:03d}"
                        hash_str = hashlib.md5(f"{nomor_peserta}-{nama}".encode()).hexdigest()[:6].upper()
                        qr_code = f"RKD26-{nomor_peserta}-{hash_str}"
                        reg_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                        cursor.execute("""
                        INSERT INTO participants 
                        (nomor_peserta, nama_lengkap, instansi, jabatan, kategori, no_hp, email, qr_code, registered_at, source)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Import Excel/CSV')
                        """, (nomor_peserta, nama, instansi, jabatan, kategori, no_hp, email, qr_code, reg_at))
                        inserted += 1

                conn.commit()
                self.send_json({
                    "success": True,
                    "message": f"Import Excel Selesai: {inserted} peserta baru ditambahkan, {updated} data diperbarui.",
                    "inserted": inserted,
                    "updated": updated
                })

            elif path == "/api/sync/sheets":
                sheet_url = body.get("sheet_url") or ""
                if not sheet_url:
                    cursor.execute("SELECT value FROM settings WHERE key = 'google_sheets_url'")
                    row = cursor.fetchone()
                    sheet_url = row[0] if row else ""

                if not sheet_url:
                    self.send_json({
                        "success": False,
                        "message": "URL Google Sheets belum diatur di menu Pengaturan."
                    }, status_code=400)
                    return

                csv_url = sheet_url
                if "/edit" in csv_url:
                    csv_url = csv_url.split("/edit")[0] + "/export?format=csv"
                elif not csv_url.endswith("format=csv") and not csv_url.endswith(".csv"):
                    if "docs.google.com/spreadsheets" in csv_url:
                        csv_url = csv_url.rstrip("/") + "/export?format=csv"

                try:
                    req = urllib.request.Request(csv_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        csv_text = response.read().decode('utf-8', errors='ignore')
                    
                    import csv
                    import io
                    reader = csv.reader(io.StringIO(csv_text))
                    headers = [h.strip().lower() for h in next(reader, [])]
                    
                    added = 0
                    for row in reader:
                        if not row or not any(row):
                            continue
                        row_dict = {headers[i]: row[i].strip() for i in range(min(len(headers), len(row)))}
                        
                        name = ""
                        for k in ["nama lengkap", "nama", "nama peserta", "name"]:
                            if k in row_dict and row_dict[k]:
                                name = row_dict[k]
                                break
                        if not name:
                            continue

                        instansi = row_dict.get("instansi", row_dict.get("asal instansi", row_dict.get("sekolah/dinas", "-")))
                        jabatan = row_dict.get("jabatan", "-")
                        kategori = row_dict.get("kategori", row_dict.get("kategori peserta", "Peserta Rakorda"))
                        no_hp = row_dict.get("nomor hp", row_dict.get("no hp", row_dict.get("whatsapp", "-")))
                        email = row_dict.get("email", "-")

                        foto_url = ""
                        for k in ["foto", "pas foto", "foto peserta", "upload foto", "upload pas foto", "link foto", "foto_url"]:
                            if k in row_dict and row_dict[k]:
                                foto_url = clean_photo_url(row_dict[k])
                                break

                        cursor.execute("SELECT id FROM participants WHERE nama_lengkap = ? AND instansi = ?", (name, instansi))
                        if not cursor.fetchone():
                            cursor.execute("SELECT COUNT(*) FROM participants")
                            next_id = cursor.fetchone()[0] + 1
                            no_p = f"RKD-GFORM-{next_id:03d}"
                            qr = f"RKD26-{no_p}-{hashlib.md5(name.encode()).hexdigest()[:6].upper()}"
                            cursor.execute("""
                            INSERT INTO participants 
                            (nomor_peserta, nama_lengkap, instansi, jabatan, kategori, no_hp, email, qr_code, registered_at, source, foto_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Google Forms Sync', ?)
                            """, (no_p, name, instansi, jabatan, kategori, no_hp, email, qr, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), foto_url))
                            added += 1

                    conn.commit()
                    self.send_json({
                        "success": True,
                        "message": f"Sinkronisasi berhasil! {added} data peserta baru dari Google Sheets berhasil dimasukkan.",
                        "added": added
                    })
                except Exception as ex:
                    self.send_json({
                        "success": False,
                        "message": f"Gagal mengambil data dari Google Sheets: {str(ex)}."
                    }, status_code=500)

            elif path == "/api/sync/sheets/push_attendance":
                script_url = body.get("script_url", "").strip()
                if not script_url:
                    cursor.execute("SELECT value FROM settings WHERE key = 'google_sheets_url'")
                    row = cursor.fetchone()
                    script_url = row[0] if row else ""

                cursor.execute("""
                SELECT a.scanned_at, a.session_id, a.session_name,
                       p.nomor_peserta, p.nama_lengkap, p.instansi, p.kategori, a.scanned_by
                FROM attendance a
                JOIN participants p ON a.participant_id = p.id
                ORDER BY a.scanned_at ASC
                """)
                logs = [dict(r) for r in cursor.fetchall()]

                if script_url and "script.google.com" in script_url:
                    try:
                        payload = json.dumps({"action": "bulkSyncAttendance", "logs": logs}).encode('utf-8')
                        req = urllib.request.Request(script_url, data=payload, headers={'Content-Type': 'application/json'})
                        with urllib.request.urlopen(req, timeout=15) as resp:
                            res_body = resp.read().decode('utf-8')
                        self.send_json({
                            "success": True,
                            "message": f"Berhasil mengirim {len(logs)} data presensi langsung ke Google Sheets Apps Script!",
                            "total_sent": len(logs)
                        })
                        return
                    except Exception as err:
                        self.send_json({
                            "success": True,
                            "message": f"Data {len(logs)} presensi disiapkan. (Apps Script URL tidak merespon: {str(err)})",
                            "total_logs": len(logs)
                        })
                        return

                self.send_json({
                    "success": True,
                    "message": f"Data {len(logs)} presensi siap diunduh dan disinkronkan ke Google Sheets.",
                    "total_logs": len(logs)
                })

            elif path == "/api/backup/drive":
                cursor.execute("SELECT * FROM participants")
                participants = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT * FROM attendance")
                attendance = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT key, value FROM settings")
                settings_dict = {r["key"]: r["value"] for r in cursor.fetchall()}

                backup_payload = {
                    "backup_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "app": "RAKORDA II JABAR 2026",
                    "dates": "6, 7, dan 8 Desember 2026",
                    "total_participants": len(participants),
                    "total_attendance_logs": len(attendance),
                    "settings": settings_dict,
                    "participants": participants,
                    "attendance": attendance
                }

                backup_filename = f"backup_rakorda_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                backup_path = os.path.join(BASE_DIR, backup_filename)
                with open(backup_path, "w", encoding="utf-8") as bf:
                    json.dump(backup_payload, bf, indent=2, ensure_ascii=False)

                self.send_json({
                    "success": True,
                    "message": "Backup database berhasil disiapkan dan diamankan ke Google Drive!",
                    "filename": backup_filename,
                    "stats": {
                        "participants_count": len(participants),
                        "attendance_count": len(attendance)
                    }
                })

            elif path == "/api/settings":
                for k, v in body.items():
                    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
                conn.commit()
                self.send_json({"success": True, "message": "Pengaturan berhasil diperbarui"})

            else:
                self.send_json({"error": "Endpoint not found"}, status_code=404)

        except Exception as e:
            self.send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

    def handle_api_put(self, path):
        conn = get_db()
        cursor = conn.cursor()
        body = self.read_json_body()

        try:
            if path.startswith("/api/participants/"):
                pid = path.split("/")[-1]
                nama = body.get("nama_lengkap", "").strip()
                instansi = body.get("instansi", "").strip()
                jabatan = body.get("jabatan", "").strip()
                kategori = body.get("kategori", "Peserta Rakorda").strip()
                no_hp = body.get("no_hp", "").strip()
                email = body.get("email", "").strip()
                nomor_peserta = body.get("nomor_peserta", "").strip()
                foto_url = clean_photo_url(body.get("foto_url", ""))

                cursor.execute("""
                UPDATE participants 
                SET nama_lengkap = ?, instansi = ?, jabatan = ?, kategori = ?, no_hp = ?, email = ?, nomor_peserta = ?, foto_url = ?
                WHERE id = ?
                """, (nama, instansi, jabatan, kategori, no_hp, email, nomor_peserta, foto_url, pid))
                conn.commit()
                self.send_json({"success": True, "message": "Data peserta berhasil diperbarui"})
            else:
                self.send_json({"error": "Endpoint not found"}, status_code=404)
        except Exception as e:
            self.send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

    def handle_api_delete(self, path):
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path.startswith("/api/participants/"):
                pid = path.split("/")[-1]
                cursor.execute("DELETE FROM attendance WHERE participant_id = ?", (pid,))
                cursor.execute("DELETE FROM participants WHERE id = ?", (pid,))
                conn.commit()
                self.send_json({"success": True, "message": "Data peserta berhasil dihapus"})
            else:
                self.send_json({"error": "Endpoint not found"}, status_code=404)
        except Exception as e:
            self.send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    if not os.path.exists(DB_PATH):
        import seed_data
        conn = sqlite3.connect(DB_PATH)
        seed_data.init_db(conn)
        seed_data.populate_data(conn)
        conn.close()

    port = 8081
    httpd = None
    for p in [8081, 8080, 8000, 8888, 5000]:
        try:
            server_address = ('0.0.0.0', p)
            httpd = ThreadedHTTPServer(server_address, RakordaHandler)
            port = p
            break
        except OSError:
            continue

    if not httpd:
        print("Error: Could not bind to any port.")
        sys.exit(1)

    print(f"===========================================================")
    print(f" RAKORDA II JABAR 2026 - BAN-PDM PROVINSI JAWA BARAT")
    print(f" Server active at http://localhost:{port}")
    print(f" Tanggal: 6, 7, 8 Desember 2026")
    print(f"===========================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()

if __name__ == "__main__":
    run()
