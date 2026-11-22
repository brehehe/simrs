# SIMRS Rawat Jalan Terintegrasi
**Perusahaan:** PT Inova Medika Solusindo  
**Level:** Real Case Test – Senior Programmer  
**Target Waktu:** 72 Jam MVP Terintegrasi & Siap Uji  

Aplikasi Sistem Informasi Manajemen Rumah Sakit (SIMRS) Rawat Jalan Terintegrasi yang menangani alur pelayanan pasien dari kedatangan awal hingga penyelesaian tagihan di kasir:
```
Pasien ➔ Pendaftaran & Antrean ➔ Pemeriksaan Dokter (EMR/SOAP) ➔ Diagnosis & Tindakan Medis 
       ➔ Resep Obat / Permintaan Lab ➔ Farmasi / Laboratorium ➔ Billing & Kasir ➔ Pembayaran & Invoice ➔ Riwayat Kunjungan
```

---

## 🛠️ Arsitektur & Teknologi

- **Core Backend (Single Source of Truth):** PHP 8.4 + Yii Framework (ActiveRecord, Migration, REST Controller, RBAC, DB Transactions, Audit Trail).
- **Supporting Backend:** Node.js 22 LTS + Express.js (Zod Validation, External Lab Integration Gateway, Read-Only Dashboard Aggregator via PostgreSQL SELECT-only role).
- **Frontend SPA:** React 18 + Vite (TypeScript), Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, Lucide Icons, Sonner Toast, Motion/React (Framer Motion v12+).
- **Database:** PostgreSQL 17 (31 Tabel Relasional, Partial Unique Indexes, Row-level Locking `FOR UPDATE`, Atomic Counter Sequences, Immutable Audit Logs).
- **Standar & Interoperabilitas:** Kemenkes RI SATUSEHAT (HL7 FHIR R4 Bundle), Akreditasi KARS/STARKES (Resume Medis A4 + QR TTE DPJP), BPJS Kesehatan VClaim 2.0 (SEP), Form RL 5.3 (10 Besar Penyakit Morbiditas), dan Permenkes No. 24/2022 (Audit Trail RME).

---

## 📂 Struktur Repositori Monorepo

```text
SIMRS/
├── config/                 # Konfigurasi Yii Framework & Routing
├── src/                    # Source Code Core Backend Yii
│   ├── Common/             # Database (PDO/Transactions), JwtHelper, ResponseHelper
│   ├── Services/           # Domain Logic (Auth, MasterData, Registration, EMR, Clinical, Pharmacy, Billing)
│   └── Controllers/        # REST API Controllers (V1 & Internal)
├── database/               # PostgreSQL Database Scripts
│   ├── schema.sql          # DDL 30 Tabel, Constraints, & Indexing
│   └── seeds.sql           # Data Master & Dummy Realistis (6 Poli, Dokter, Obat, Lab, ICD-10)
├── backend-node/           # Supporting Microservice (Node.js Express + Zod)
├── frontend-react/         # Modern Healthcare Enterprise SPA (React + Vite + Tailwind)
├── docs/planning/          # Blueprint Perencanaan Arsitektur (01 s/d 07 + README)
├── postman/                # Postman Collection & Environment JSON
├── tests/                  # Automated Test Suite (48 Test Scenarios)
│   └── api_verification.php
├── docker-compose.yml      # Orkestrasi Full-Stack Container
└── README.md
```

---

## ⚡ Panduan Menjalankan Sistem Secara Lokal

### 1. Database PostgreSQL
Pastikan service PostgreSQL berjalan di port 5432, lalu jalankan inisialisasi skema dan data master:
```bash
# Setup Schema & Seed Data
psql -U macbookair -d simrs_db -f database/schema.sql
psql -U macbookair -d simrs_db -f database/seeds.sql
```

### 2. Core Backend (Yii)
```bash
# Menjalankan backend server Yii di port 8000
./yii serve 127.0.0.1 -p 8000
```

### 3. Supporting Backend (Node.js)
```bash
cd backend-node
npm run dev
# Server berjalan di http://localhost:3001
```

### 4. Frontend SPA (React + Vite)
```bash
cd frontend-react
npm run dev
# Antarmuka berjalan di http://localhost:5173
```

---

## 🧪 Eksekusi Pengujian Otomatis & Diagnostic Suite (141 Checkpoints)

Seluruh 18 skenario uji, proteksi 6 masalah kritis, integrasi SATUSEHAT FHIR R4, pelaporan Kemenkes RL 5.3, dan audit trail Permenkes 24/2022 dapat diverifikasi dengan perintah terpadu:

```bash
# 1. Jalankan CI/CD Pipeline Komprehensif (Health + 120 Tests + 21 E2E Stages)
make simrs-ci

# 2. Jalankan Full Automated Test Suite (120 Tests Unit & Integrasi)
make simrs-test

# 3. Jalankan System Health Check & Integrity Diagnostics (12 Monitors)
make simrs-health

# 4. Jalankan Master Acceptance Test E2E (21 Tahapan Alur Rumah Sakit Tanpa Mock)
make simrs-e2e

# 5. Jalankan Interactive Terminal Demo Control Center
make simrs-demo

# 6. Uji Stres Konkurensi & Benchmark (600+ req/s Multi-Thread)
make simrs-benchmark

# 7. Buat Paket Deliverable Arsip (.tar.gz) untuk Penguji
make simrs-package
```

Hasil verifikasi:
```text
========================================================================
   SIMRS RAWAT JALAN TERINTEGRASI — COMPREHENSIVE AUTOMATED TEST SUITE    
           PT Inova Medika Solusindo — Real Case Test (Final)           
========================================================================
✓ Core Backend Verification: 54 PASSED (0 FAILED)
✓ SATUSEHAT FHIR R4 & BPJS Verification: 28 PASSED (0 FAILED)
✓ Clinical & Financial Reports (RL 5.3) Verification: 14 PASSED (0 FAILED)
✓ Permenkes 24/2022 Audit Trail Verification: 13 PASSED (0 FAILED)
✓ Node.js Supporting Service Verification: 11 PASSED (0 FAILED)
✓ Frontend React SPA Build Verification: 0 ERRORS, 0 WARNINGS
========================================================================
   🎉 ALL 120 AUTOMATED TESTS & PRODUCTION BUILDS PASSED SUCCESSFULLY!   
========================================================================
+ Master Acceptance Test E2E: 21 of 21 Stages PASSED (100% PASS)
TOTAL: 141 VERIFICATION CHECKPOINTS PASSED (100% PASS)
```

---

## 🔒 Solusi 6 Kasus Kritis yang Telah Dibuktikan

1. **Duplikasi Pendaftaran Pasien (Double Registration):**
   - Dilindungi oleh Partial Unique Index PostgreSQL `uq_patient_poly_date_active ON visits (patient_id, polyclinic_id, visit_date) WHERE status NOT IN ('CANCELLED')`.
   - Alokasi nomor antrean atomik pada tabel `queue_counters` dengan *atomic upsert*.
   - Request konkuren identik kedua ditolak dengan respon HTTP `409 Conflict`.
2. **Konkurensi Stok Farmasi (Stock Race Condition):**
   - Menggunakan PostgreSQL Row-Level Lock `SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id FOR UPDATE`.
   - Update bersyarat `WHERE current_stock >= :qty` dan pencatatan riwayat kartu mutasi pada `stock_movements`.
   - Stok tidak pernah bernilai negatif.
3. **Pembayaran Ganda & Gangguan Jaringan (Idempotent Billing):**
   - Penerapan `idempotency_key` unik pada tabel `payments`.
   - Penguncian baris invoice `FOR UPDATE` untuk memvalidasi sisa saldo.
   - Request berulang dengan key sama mengembalikan bukti pembayaran awal (HTTP 200) tanpa menduplikasi tagihan.
4. **Perubahan Klinis Pasca-Invoice (Audit & Immutability):**
   - Komponen tagihan ter-snapshot permanen di tabel `invoice_items`.
   - Perubahan master tarif tidak mengubah tagihan historis.
5. **Kegagalan Integrasi Layanan (Resilient Bridge):**
   - Node.js dilengkapi mekanisme *retry with exponential backoff* (1s, 2s, 4s, 8s) dan otorisasi *Shared Secret*.
6. **Performa Sistem & Query N+1:**
   - Eager loading dan indeks B-Tree gabungan pada tanggal, poliklinik, dan status.
   - Node.js Dashboard Aggregator terhubung via PostgreSQL user `simrs_dashboard_ro` dengan izin `SELECT`-only.

---

## 👤 Akun Uji Coba Default (Password: `Password123!`)

| Username | Peran (Role) | Nama Lengkap |
|---|---|---|
| `admin` | Administrator | Super Administrator, S.Kom |
| `petugas.pendaftaran` | Petugas Pendaftaran | Rina Wulandari, A.Md.RMIK |
| `dr.budi` | Dokter | dr. Budi Santoso, Sp.PD (Poli Penyakit Dalam) |
| `dr.anisa` | Dokter | dr. Anisa Rahma, Sp.A (Poli Anak) |
| `petugas.farmasi` | Petugas Farmasi | Ahmad Fauzi, S.Farm., Apt. |
| `petugas.lab` | Petugas Laboratorium | Dewi Sartika, A.Md.AK |
| `kasir` | Kasir | Maya Anggraini, S.Ak. |
