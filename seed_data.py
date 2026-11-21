#!/usr/bin/env python3
"""
Seed data generator for RAKORDA II JABAR 2026
Updated with:
- Tanggal Kegiatan: 6, 7, 8 Desember 2026
- Sesi Presensi:
  * Hari 1 (6 Des 2026):
    - Sesi 1: Pembukaan (16:00) -> H1_S1
    - Sesi 2: Sesi Malam (19:30) -> H1_S2
  * Hari 2 (7 Des 2026):
    - Sesi 1: Pukul 08:00 -> H2_S1
    - Sesi 2: Pukul 13:00 -> H2_S2
    - Sesi 3: Pukul 16:00 -> H2_S3
    - Sesi 4: Pukul 19:30 -> H2_S4
  * Hari 3 (8 Des 2026):
    - Tidak di-scan
"""

import sqlite3
import hashlib
import json
import os
import random
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "rakorda.db")

SESSIONS = [
    {"id": "H1_REG", "day": "Hari Ke-1", "date": "2026-12-06", "time": "14:00 - 16:00", "title": "Hari 1: Check-in, ID Card & Kamar (14:00 - 16:00)"},
    {"id": "H1_S1", "day": "Hari Ke-1", "date": "2026-12-06", "time": "16:00", "title": "Hari 1 - Sesi 1: Pembukaan (16:00)"},
    {"id": "H1_S2", "day": "Hari Ke-1", "date": "2026-12-06", "time": "19:30", "title": "Hari 1 - Sesi 2: Materi Malam (19:30)"},
    {"id": "H2_S1", "day": "Hari Ke-2", "date": "2026-12-07", "time": "08:00", "title": "Hari 2 - Sesi 1: Pagi (08:00)"},
    {"id": "H2_S2", "day": "Hari Ke-2", "date": "2026-12-07", "time": "13:00", "title": "Hari 2 - Sesi 2: Siang (13:00)"},
    {"id": "H2_S3", "day": "Hari Ke-2", "date": "2026-12-07", "time": "16:00", "title": "Hari 2 - Sesi 3: Sore (16:00)"},
    {"id": "H2_S4", "day": "Hari Ke-2", "date": "2026-12-07", "time": "19:30", "title": "Hari 2 - Sesi 4: Malam (19:30)"}
]

def init_db(conn):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomor_peserta TEXT UNIQUE NOT NULL,
        nama_lengkap TEXT NOT NULL,
        instansi TEXT NOT NULL,
        jabatan TEXT NOT NULL,
        kategori TEXT NOT NULL,
        no_hp TEXT NOT NULL,
        email TEXT NOT NULL,
        qr_code TEXT UNIQUE NOT NULL,
        registered_at TEXT NOT NULL,
        source TEXT DEFAULT 'Manual'
    )
    """)

    # Drop and recreate attendance table to support session_id uniqueness
    cursor.execute("DROP TABLE IF EXISTS attendance")
    cursor.execute("""
    CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        event_date TEXT NOT NULL,
        session_name TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        scanned_by TEXT NOT NULL,
        method TEXT DEFAULT 'QR_SCAN',
        notes TEXT,
        UNIQUE(participant_id, session_id),
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        nama TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Default settings
    default_settings = {
        "app_title": "RAKORDA II JABAR 2026",
        "app_subtitle": "BAN-PDM PROVINSI JAWA BARAT",
        "event_theme": "Transformasi Akreditasi Menuju Pendidikan Bermutu dan Berkeadilan di Jawa Barat",
        "event_dates_str": "6, 7, dan 8 Desember 2026",
        "event_dates": json.dumps(["2026-12-06", "2026-12-07", "2026-12-08"]),
        "event_location": "HARRIS Hotel & Conventions Festival Citylink, Bandung",
        "cert_number_prefix": "821.1/BAN-PDM-JBR/RKD-II/XII/2026",
        "cert_min_sessions": "4",  # Minimum sessions attended (e.g. 4 out of 6)
        "signer1_title": "Ketua BAN-PDM Provinsi Jawa Barat",
        "signer1_name": "Tata Sumitra Wirasasmita, S.Si., M.Mgt.",
        "signer1_nip": "NIP. 19720415 199802 1 001",
        "signer2_title": "Sekretaris BAN-PDM Provinsi Jawa Barat",
        "signer2_name": "Dr. Sandra Taufik Hidayat, M.Ag.",
        "signer2_nip": "NIP. 19750820 200312 1 002",
        "google_sheets_url": "",
        "google_sheets_sync_interval": "10",
        "google_drive_folder_id": "",
        "google_drive_service_account": ""
    }

    for k, v in default_settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))

    # Default users
    users = [
        ("admin", "admin2026", "ADMIN", "Administrator Rakorda"),
        ("petugas", "petugas2026", "PETUGAS", "Petugas Presensi Meja")
    ]
    for u in users:
        cursor.execute("INSERT OR REPLACE INTO users (username, password, role, nama) VALUES (?, ?, ?, ?)", u)

    conn.commit()

def generate_qr(nomor, nama):
    hash_str = hashlib.md5(f"{nomor}-{nama}-RAKORDA2026-JABAR".encode()).hexdigest()[:6].upper()
    return f"RKD26-{nomor}-{hash_str}"

def populate_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM participants")
    count = cursor.fetchone()[0]

    if count < 277:
        cursor.execute("DELETE FROM participants")
        participants = []

        # 1. 11 Anggota BAN-PDM Jawa Barat
        anggota_ban = [
            ("Tata Sumitra Wirasasmita, S.Si., M.Mgt.", "Ketua/Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Sandra Taufik Hidayat, M.Ag.", "Sekretaris/Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Asep Saepudin, M.Pd", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Budi Santoso, S.T., M.Pd", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dadang Setiawan, S.Pd", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Dini Irawati, M.Pd.", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Eko Sulistiono, S.Pd., M.Pd", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Nurul Fahimah., S.Pd., M.Si", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. Saripudin, M.Pd.", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dr. H. Ujang Syarip Hidayat, M.Pd.", "Anggota", "BAN-PDM Provinsi Jawa Barat"),
            ("Dra. Yayah Kusbudiah, M.M.Pd", "Anggota", "BAN-PDM Provinsi Jawa Barat")
        ]

        nomor_counter = 1
        for nama, jabatan, instansi in anggota_ban:
            no_peserta = f"RKD-BAN-{nomor_counter:03d}"
            qr = generate_qr(no_peserta, nama)
            no_hp = f"0812{random.randint(10000000, 99999999)}"
            email = nama.lower().replace("prof.", "").replace("dr.", "").replace("dra.", "").replace("drs.", "").replace("h.", "").replace("hj.", "").replace("m.pd.", "").replace("m.si.", "").replace("m.m.", "").replace(",", "").replace(".", "").strip().replace(" ", ".") + "@banpdm-jabar.or.id"
            participants.append((
                no_peserta, nama, instansi, jabatan, "Anggota BAN-PDM", no_hp, email, qr, "2026-11-15 09:00:00", "Official"
            ))
            nomor_counter += 1

        # 2. 16 Sekretariat BAN-PDM
        sekretariat_data = [
            ("Susan Susanto", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Iwan Suherman", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Rosi Siti Nurjanah", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Mokhamad Taufiq Hidayatullah", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Aji Fazlurrahman", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Ariz Rizaludin", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Asep Zamaludin", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Lisma Ula Yanuardi", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Mohamad Heri Hadian", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Saraswati", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Wahidah Safinatunnajah Yusuf", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Abdul Roup", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Dadan Ramdani", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Hilmi Haidar NS.", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Kankan Yudistira", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat"),
            ("Yusup Taptajani", "Sekretariat BAN-PDM Provinsi Jawa Barat", "Sekretariat BAN-PDM Provinsi Jawa Barat")
        ]

        sek_counter = 1
        for nama, jabatan, instansi in sekretariat_data:
            no_peserta = f"RKD-SEK-{sek_counter:03d}"
            qr = generate_qr(no_peserta, nama)
            no_hp = f"0813{random.randint(10000000, 99999999)}"
            email = nama.lower().replace("drs.", "").replace("h.", "").replace("m.si.", "").replace(",", "").replace(".", "").strip().replace(" ", ".") + "@sekretariat.banpdm-jabar.or.id"
            participants.append((
                no_peserta, nama, instansi, jabatan, "Sekretariat", no_hp, email, qr, "2026-11-16 10:30:00", "Official"
            ))
            sek_counter += 1

        # 3. 250 Peserta Rakorda se-Jawa Barat (27 Kab/Kota)
        cities = [
            "Kota Bandung", "Kabupaten Bandung", "Kabupaten Bandung Barat", "Kota Cimahi",
            "Kabupaten Garut", "Kabupaten Tasikmalaya", "Kota Tasikmalaya", "Kabupaten Ciamis",
            "Kabupaten Pangandaran", "Kota Banjar", "Kabupaten Sumedang", "Kabupaten Majalengka",
            "Kabupaten Kuningan", "Kabupaten Cirebon", "Kota Cirebon", "Kabupaten Indramayu",
            "Kabupaten Subang", "Kabupaten Purwakarta", "Kabupaten Karawang", "Kabupaten Bekasi",
            "Kota Bekasi", "Kota Depok", "Kota Bogor", "Kabupaten Bogor", "Kota Sukabumi",
            "Kabupaten Sukabumi", "Kabupaten Cianjur"
        ]

        first_names = ["Agus", "Budi", "Candra", "Dadan", "Eka", "Feri", "Gunawan", "Hadi", "Indra", "Joko",
                       "Kurniawan", "Luki", "Muhamad", "Nanang", "Oki", "Pandu", "Rahmat", "Sopian", "Teguh", "Ujang",
                       "Wahyu", "Yana", "Zainal", "Asep", "Iwan", "Ade", "Dani", "Cecep", "Dedi", "Enjang",
                       "Sri", "Ratna", "Siti", "Nur", "Dewi", "Rina", "Ani", "Tati", "Neneng", "Yani",
                       "Lia", "Iis", "Erna", "Fitri", "Endah", "Nita", "Maya", "Wulan", "Mira", "Rini"]

        last_names = ["Hidayat", "Saputra", "Pratama", "Nugraha", "Kusuma", "Permana", "Wibowo", "Kurnia",
                      "Suryana", "Setiawan", "Ramdani", "Gunawan", "Suhendar", "Wijaya", "Santoso", "Sulaeman",
                      "Purnama", "Subagja", "Kosasih", "Hermawan", "Mulyadi", "Iskandar", "Suparman", "Firmansyah"]

        titles_front = ["Dr. ", "Drs. ", "H. ", "Hj. ", "Dra. ", ""]
        titles_back = [", M.Pd.", ", M.M.", ", S.Pd.", ", M.Si.", ", M.Pkim.", ", S.T., M.Kom.", ", S.Ag., M.Pd.I."]

        roles = [
            "Kepala Bidang Pembinaan PAUD Disdik",
            "Kepala Bidang Pembinaan SMP Disdik",
            "Kepala Seksi Kurikulum & Penilaian",
            "Pengawas Sekolah Ahli Madya",
            "Pengawas Sekolah Ahli Muda",
            "Koordinator Asesor PAUD Kab/Kota",
            "Koordinator Asesor Dikdas Kab/Kota",
            "Koordinator Asesor Dikmen Kab/Kota",
            "Ketua MKKS SMP",
            "Ketua MKKS SMA/SMK",
            "Ketua PKG PAUD",
            "Kepala Satuan Pendidikan Rujukan",
            "Ketua Forum Komite Sekolah"
        ]

        random.seed(202612)
        for i in range(1, 251):
            no_peserta = f"RKD-PSR-{i:03d}"
            kab = cities[(i - 1) % len(cities)]
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            tf = random.choice(titles_front)
            tb = random.choice(titles_back)
            nama = f"{tf}{fn} {ln}{tb}".strip()
            jabatan = f"{roles[(i - 1) % len(roles)]} {kab}"
            instansi = f"Dinas Pendidikan {kab}" if "Disdik" in jabatan or "Pengawas" in jabatan else f"Instansi Pendidikan {kab}"
            qr = generate_qr(no_peserta, nama)
            no_hp = f"08{random.choice(['12','13','52','53','21','77','78'])}{random.randint(10000000, 99999999)}"
            clean_name = f"{fn.lower()}.{ln.lower()}{i}"
            email = f"{clean_name}@disdik.jabarprov.go.id" if i % 2 == 0 else f"{clean_name}@gmail.com"

            participants.append((
                no_peserta, nama, instansi, jabatan, "Peserta Rakorda", no_hp, email, qr, "2026-11-18 14:00:00", "Google Form Sync"
            ))

        cursor.executemany("""
        INSERT INTO participants 
        (nomor_peserta, nama_lengkap, instansi, jabatan, kategori, no_hp, email, qr_code, registered_at, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, participants)

    # Populate attendance by session
    cursor.execute("SELECT id FROM participants ORDER BY id ASC")
    all_ids = [row[0] for row in cursor.fetchall()]

    # Simulate realistic scan attendance across the 6 sessions:
    # H1_S1 (6 Des 16:00 - Pembukaan): 245 participants
    for pid in all_ids[:245]:
        ts = f"2026-12-06 15:{random.randint(40, 59):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H1_S1', '2026-12-06', 'Hari 1 - Sesi 1: Pembukaan (16:00)', ?, 'Petugas Meja 1')
        """, (pid, ts))

    # H1_S2 (6 Des 19:30 - Materi Malam): 228 participants
    for pid in all_ids[:228]:
        ts = f"2026-12-06 19:{random.randint(15, 35):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H1_S2', '2026-12-06', 'Hari 1 - Sesi 2: Materi Malam (19:30)', ?, 'Petugas Meja 2')
        """, (pid, ts))

    # H2_S1 (7 Des 08:00 - Sesi Pagi): 235 participants
    for pid in all_ids[:235]:
        ts = f"2026-12-07 07:{random.randint(45, 59):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H2_S1', '2026-12-07', 'Hari 2 - Sesi 1: Pagi (08:00)', ?, 'Petugas Meja 1')
        """, (pid, ts))

    # H2_S2 (7 Des 13:00 - Sesi Siang): 220 participants
    for pid in all_ids[:220]:
        ts = f"2026-12-07 12:{random.randint(45, 59):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H2_S2', '2026-12-07', 'Hari 2 - Sesi 2: Siang (13:00)', ?, 'Petugas Meja 3')
        """, (pid, ts))

    # H2_S3 (7 Des 16:00 - Sesi Sore): 215 participants
    for pid in all_ids[:215]:
        ts = f"2026-12-07 15:{random.randint(45, 59):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H2_S3', '2026-12-07', 'Hari 2 - Sesi 3: Sore (16:00)', ?, 'Petugas Meja 2')
        """, (pid, ts))

    # H2_S4 (7 Des 19:30 - Sesi Malam): 210 participants
    for pid in all_ids[:210]:
        ts = f"2026-12-07 19:{random.randint(15, 30):02d}:{random.randint(0, 59):02d}"
        cursor.execute("""
        INSERT INTO attendance (participant_id, session_id, event_date, session_name, scanned_at, scanned_by)
        VALUES (?, 'H2_S4', '2026-12-07', 'Hari 2 - Sesi 4: Malam (19:30)', ?, 'Petugas Meja 1')
        """, (pid, ts))

    conn.commit()
    print("Successfully populated 277 participants with 6 scanning sessions on 6-7 Dec 2026 (Day 3 not scanned).")

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    populate_data(conn)
    conn.close()
