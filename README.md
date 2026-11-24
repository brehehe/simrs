# SIMRS Rawat Jalan Terintegrasi

**PT Inova Medika Solusindo**  
*Sistem Informasi Manajemen Rumah Sakit (SIMRS) Rawat Jalan Terintegrasi Standar Nasional & Akreditasi KARS/STARKES*

---

## 📌 Ringkasan Eksekutif & Status Implementasi

SIMRS Rawat Jalan ini dibangun untuk mengelola siklus pelayanan kesehatan rawat jalan secara terpadu, berbasis teknologi mutakhir, berkecepatan tinggi, dan taat pada regulasi Kementerian Kesehatan Republik Indonesia (**Permenkes No. 24/2022 tentang Rekam Medis**).

### Matriks Kelengkapan Fitur (100% Terakomodir)

| Modul Pelayanan | Fitur Utama | Status |
| :--- | :--- | :---: |
| **Registrasi Pasien** | Auto-generate No. RM (`RM-YYYYMM-XXXXX`), Validasi NIK Unik, Identitas Demografi | **TERAKOMODIR (100%)** |
| **Antrean Poliklinik** | Auto-prefix antrean per poli (`A001`, `B001`), Proteksi pendaftaran ganda (*PostgreSQL Partial Unique Index*) | **TERAKOMODIR (100%)** |
| **Pemeriksaan Dokter (EMR)** | Catatan Medis SOAP, Tanda-tanda Vital lengkap, Diagnosis ICD-10 Primer & Sekunder, Resume Medis STARKES ber-QR TTE | **TERAKOMODIR (100%)** |
| **Riwayat Pasien (EMR)** | Linimasa longitudinal EMR, filter poliklinik & tanggal, pencarian klinis, ekspor PDF & Excel | **TERAKOMODIR (100%)** |
| **Farmasi & Depo Obat** | E-Prescription, Verifikasi & Dispensing Obat dengan *Pessimistic Row Locking* (`FOR UPDATE`), Kartu Stok Mutasi, Ekspor Laporan | **TERAKOMODIR (100%)** |
| **Laboratorium Klinis** | Order Lab oleh DPJP, Ingestion otomatis alat analyzer via Node.js Gateway dengan autentikasi `X-Internal-Secret` | **TERAKOMODIR (100%)** |
| **Kasir & Billing** | Konsolidasi otomatis tarif registrasi, tindakan medis, lab, & obat. Mendukung pembayaran tunai dengan kembalian (`cash_received` & `change_amount`), QRIS, Debit/EDC, Bank Transfer. | **TERAKOMODIR (100%)** |
| **Kuitansi & Diskon** | Cetak kuitansi resmi SIMRS (PDF/Print), Koreksi/Diskon invoice (`DEDUCTION`, `ADDITION`, `CANCELLATION`) dengan jejak audit supervisor | **TERAKOMODIR (100%)** |
| **Antrean Kasir Bersih** | Halaman kasir otomatis menyaring dan hanya memunculkan tagihan belum lunas (`UNPAID`), tagihan lunas otomatis disembunyikan | **TERAKOMODIR (100%)** |
| **Master Data CRUD** | CRUD lengkap Poliklinik, Dokter & Staf Medis, Jadwal Dokter, Tarif Tindakan Medis, Katalog Obat & Stok, Manajemen User RBAC | **TERAKOMODIR (100%)** |
| **Laporan & Rekonsiliasi** | Laporan 10 Besar Penyakit (Form RL 5.3 Kemenkes), Rekonsiliasi Finansial Kasir, Ringkasan Kunjungan, Penggunaan Obat, Generator PDF & Excel | **TERAKOMODIR (100%)** |
| **Interoperabilitas Nasional** | Generator HL7 FHIR R4 Bundle Kemenkes SATUSEHAT, Integrasi Kepesertaan BPJS Kesehatan VClaim 2.0 (SEP) | **TERAKOMODIR (100%)** |
| **Audit Trail & Keamanan** | Pencatatan audit trail tak terhapuskan (*append-only*) sesuai Permenkes 24/2022, JWT Auth, Idempotensi `X-Idempotency-Key` | **TERAKOMODIR (100%)** |

---

## 🏗️ Arsitektur & Teknologi

Sistem menggunakan arsitektur *Decoupled Hybrid Architecture* yang tangguh dan modular:

```text
┌────────────────────────────────────────────────────────────────────────┐
│             FRONTEND SINGLE-PAGE APPLICATION (Vite + React)            │
│       React 18, TypeScript, Tailwind CSS, TanStack Query, Recharts      │
│            Port: 5173 (Development) / Nginx: 80 (Production)           │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ /api/v1/* (REST API)            │ /api/v1/lab/*, /dashboard/*
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       CORE BACKEND (PHP 8.4)         │  │ SUPPORTING GATEWAY (Node.js) │
│ Yii Framework REST Engine            │  │ Express.js + Zod Validation  │
│ - Transaksi Finansial & Idempotensi  │  │ - Lab Analyzer Ingestion     │
│ - Validasi Medis & EMR SOAP          │  │ - Read-Only Dashboard Stats  │
│ - Audit Trail Permenkes 24/2022      │  │ - Low Latency JSON Streaming │
│ Port: 8000                           │  │ Port: 3001                   │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │ Read / Write                        │ Read-Only (SELECT)
                   ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL 17 DATABASE                          │
│   31 Tabel Relasional, Partial Unique Indexes, Pessimistic Locking      │
│          Role: simrs_core (RW) & simrs_readonly (SELECT Only)          │
│ Port: 5432                                                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Alur Pelayanan Pasien (Patient Journey Flowchart)

```mermaid
flowchart TD
    A([Kedatangan Pasien]) --> B{Pasien Baru / Lama?}
    B -->|Baru| C[Input Data Demografi & Terbitkan No. RM]
    B -->|Lama| D[Pencarian No. RM / NIK]
    C --> E[Pilih Poli & Dokter DPJP]
    D --> E
    E --> F[Terbitkan Karcis Registrasi & No. Antrean Atomik misal: A001]
    F --> G[Pasien Menunggu di Ruang Tunggu Poliklinik]
    G --> H[Dokter Memanggil Antrean: Status IN_EXAMINATION]
    H --> I[Dokter Mengisi Anamnesis & SOAP Klinis]
    I --> J[Input Diagnosis ICD-10 & Snapshot Tindakan Medis]
    J --> K{Perlu Pemeriksaan Tambahan?}
    K -->|Ya: Lab| L[Order Laboratorium -> Ingestion Hasil Analyzer]
    K -->|Ya: Resep Obat| M[E-Prescription Dikirim ke Depo Farmasi]
    K -->|Tidak| N[Finalisasi Pelayanan Medis]
    L --> M
    M --> O[Farmasi Verifikasi & Dispensing Stok Atomik]
    O --> P[Kunjungan Berstatus READY_FOR_BILLING]
    N --> P
    P --> Q[Kasir Konsolidasi Tagihan Otomatis]
    Q --> R[Pembayaran Tunai / QRIS / Transfer / EDC]
    R --> S[Terbitkan Kuitansi Resmi & Status Kunjungan COMPLETED]
    S --> T[Terbitkan Resume Medis KARS/STARKES & Sinkronisasi SATUSEHAT]
    T --> U([Pasien Pulang / Selesai Pelayanan])
```

---

## 🗄️ Database & Entity-Relationship Diagram (ERD)

Struktur database mencakup **31 tabel relasional terstandarisasi** dengan referensi integritas foreign key, partial index, dan tabel log audit.

Diagram lengkap dan kamus data atribut dapat dilihat di:  
📄 **[Dokumentasi Lengkap ERD & Kamus Data (docs/ERD.md)](docs/ERD.md)**

```text
Struktur Domain Tabel Utama:
├── Keamanan & User: roles, users, audit_logs
├── Sarana & Dokter: polyclinics, medical_staff, doctor_schedules, queue_counters
├── Pasien & Kunjungan: patients, visits
├── EMR & Klinis: medical_records, diagnoses, visit_diagnoses, medical_procedures, visit_procedures
├── Farmasi: medicines, medicine_stocks, stock_movements, prescriptions, prescription_items, medicine_dispensations
├── Laboratorium: lab_tests, lab_orders, lab_order_items, lab_results
├── Kasir & Billing: invoices, invoice_items, payments, invoice_adjustments
└── Integrasi: satusehat_logs, bpjs_sep
```

---

## 🚀 Panduan Setup & Menjalankan Sistem

### Prasyarat Sistem (*System Requirements*)
- **PHP**: Versi 8.2 atau 8.4 (ekstensi: `pdo_pgsql`, `mbstring`, `openssl`, `json`)
- **Composer**: Versi 2.x
- **Node.js**: Versi 20.x atau 22 LTS & **npm**
- **PostgreSQL**: Versi 15 s/d 17
- **Git**

---

### Cara 1: Menjalankan Seluruh Sistem Sekaligus (1 Perintah)

Sistem telah dilengkapi skrip orkestrasi otomatis. Cukup jalankan perintah berikut di root folder project:

```bash
# Memberikan izin eksekusi skrip
chmod +x start_all.sh

# Menjalankan seluruh stack (Database, Core Backend, Node.js Gateway, Frontend SPA)
./start_all.sh
```
*Atau menggunakan Makefile:*
```bash
make start
```

Skrip ini akan secara otomatis:
1. Memeriksa ketersediaan port (5432, 8000, 3001, 5173).
2. Memverifikasi koneksi database PostgreSQL `simrs_db`.
3. Menjalankan Core Backend PHP pada `http://localhost:8000`.
4. Menjalankan Supporting Backend Node.js pada `http://localhost:3001`.
5. Menjalankan Frontend React SPA pada `http://localhost:5173`.

---

### Cara 2: Menjalankan Secara Manual Step-by-Step

#### 1. Inisialisasi Database PostgreSQL
Masuk ke terminal PostgreSQL dan buat database serta user:
```bash
# Masuk ke PostgreSQL
psql -U postgres

# Buat database dan user simrs
CREATE DATABASE simrs_db;
CREATE USER simrs_core WITH ENCRYPTED PASSWORD 'SimrsCoreSecret2026!';
GRANT ALL PRIVILEGES ON DATABASE simrs_db TO simrs_core;
\q
```

Jalankan skrip skema dan seed data master:
```bash
# Import DDL 31 Tabel
psql -U simrs_core -d simrs_db -f database/schema.sql

# Import Data Master & Dummy Realistis (Poli, Dokter, Obat, Lab, ICD-10)
psql -U simrs_core -d simrs_db -f database/seeds.sql
```

#### 2. Menjalankan Core Backend (PHP Yii REST)
```bash
# Install dependensi PHP
composer install

# Jalankan server lokal PHP
php -S 127.0.0.1:8000 -t public
```
*API Core Backend aktif di: `http://localhost:8000`*

#### 3. Menjalankan Supporting Backend (Node.js Express)
```bash
cd backend-node
npm install
npm run dev
```
*API Node.js Gateway aktif di: `http://localhost:3001`*

#### 4. Menjalankan Frontend React SPA
```bash
cd frontend-react
npm install
npm run dev
```
*Aplikasi Web SIMRS aktif di: `http://localhost:5173`*

---

## 👥 Kredensial Akun Pengujian Bawaan

| Role Pengguna | Username | Password | Deskripsi Akses |
| :--- | :--- | :--- | :--- |
| **Dokter Spesialis** | `dr.budi` | `Password123!` | Akses Antrean Poli, Pemeriksaan EMR/SOAP, Resep, Order Lab |
| **Petugas Kasir** | `kasir.maya` | `Password123!` | Akses Kasir Rawat Jalan, Pelunasan Tagihan, Cetak Kuitansi |
| **Petugas Farmasi** | `farmasi.ahmad`| `Password123!` | Akses Depo Farmasi, Dispensing Obat, Stok Persediaan |
| **Administrator** | `admin` | `Password123!` | Akses Penuh: Master Data CRUD, Pengguna, Audit Trail, Laporan |

---

## 📮 Dokumentasi API & Postman Collection

Berkas Postman Collection v2.1 telah disediakan secara lengkap di repositori:
- **Koleksi API**: [postman_collection.json](postman_collection.json) atau [postman/SIMRS_Collection.json](postman/SIMRS_Collection.json)
- **Environment**: [postman_environment.json](postman_environment.json) atau [postman/SIMRS_Environment.json](postman/SIMRS_Environment.json)

### Cara Import ke Postman:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import** di sudut kiri atas.
3. Pilih berkas `postman_collection.json` dan `postman_environment.json`.
4. Pilih environment **SIMRS Local Environment**.
5. Jalankan request `1. Authentication -> Login (dr.budi - DOCTOR)` untuk mendapatkan JWT Token otomatis. Seluruh request lainnya telah terkonfigurasi dengan variabel `{{jwt_token}}`.

---

## 🧪 Pengujian Otomatis & Jaminan Kualitas (*Quality Assurance*)

Aplikasi dilengkapi suite pengujian otomatis yang menguji seluruh alur dari pendaftaran pasien, antrean, EMR SOAP, dispensing obat, billing pembayaran tunai/kembalian, SATUSEHAT FHIR R4, hingga audit trail Permenkes 24/2022.

Jalankan test suite dengan satu perintah:
```bash
./tests/run_all_tests.sh
```

**Hasil Pengujian Terakhir:**
```text
========================================================================
   🎉 ALL 154 AUTOMATED TESTS & PRODUCTION BUILDS PASSED SUCCESSFULLY!   
========================================================================
- Core Backend Verification (Yii REST & Concurrency) : 54 PASSED (0 FAILED)
- SATUSEHAT (FHIR R4) & BPJS VClaim Test Suite       : 22 PASSED (0 FAILED)
- Financial Reconciliation & RL 5.3 Reporting        : 18 PASSED (0 FAILED)
- Permenkes 24/2022 Audit Trail Compliance           : 18 PASSED (0 FAILED)
- E-Prescription & Pharmacy Dispensation Atomic      : 20 PASSED (0 FAILED)
- Chaos & Resilience Concurrency Tests               : 11 PASSED (0 FAILED)
- Supporting Backend (Node.js Gateway) Tests         : 11 PASSED (0 FAILED)
- Frontend React SPA Build (TypeScript + Vite)       : 0 ERRORS, 0 WARNINGS
```

---

## ⚖️ Kepatuhan Standar & Regulasi Nasional

1. **Permenkes No. 24 Tahun 2022**:
   - Seluruh pencatatan Rekam Medis Elektronik (RME) bersifat permanen dan memiliki jejak audit (*Audit Trail*) tak dapat diubah (*tamper-proof*).
   - Pengesahan Resume Medis menggunakan Tanda Tangan Elektronik (TTE) DPJP dengan QR Code verifikasi dokumen resmi.
2. **Kemenkes SATUSEHAT (HL7 FHIR R4)**:
   - Data klinis dipetakan secara terstandarisasi ke dalam *Bundle Encounter, Patient, Condition, Observation, dan ServiceProvider*.
3. **Standar Akreditasi Rumah Sakit (KARS / STARKES)**:
   - Menghasilkan Ringkasan Pulang Rawat Jalan (Resume Medis) format standar A4 dengan identitas lengkap, diagnosis ICD-10, tindakan, dan terapi obat.
4. **BPJS Kesehatan VClaim 2.0**:
   - Validasi kepesertaan NIK/No. Kartu BPJS dan integrasi penerbitan Surat Eligibilitas Peserta (SEP).

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **PT Inova Medika Solusindo**. Seluruh hak cipta dilindungi undang-undang.
