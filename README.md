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

- **Core Backend (Single Source of Truth):** PHP 8.4 + Yii Framework (ActiveRecord, Migration, REST Controller, RBAC, DB Transactions).
- **Supporting Backend:** Node.js 24 + Express.js (Zod Validation, External Lab Integration Gateway, Read-Only Dashboard Aggregator via PostgreSQL SELECT-only role).
- **Frontend SPA:** React 18 + Vite (TypeScript), Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, Lucide Icons, Sonner Toast, Motion/React (Framer Motion v12+).
- **Database:** PostgreSQL 17 (30 Tabel, Partial Unique Indexes, Row-level Locking `FOR UPDATE`, Atomic Counter Sequences).

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

## 🧪 Eksekusi Pengujian Otomatis (Test Suite)

Seluruh 18 skenario uji dan proteksi masalah kritis dapat diverifikasi secara instan dengan menjalankan:
```bash
php tests/api_verification.php
```

Hasil verifikasi:
```text
=== STARTING SIMRS CORE API & CONCURRENCY VERIFICATION ===
Test 1: Login dr.budi (Role: DOCTOR)                     -> [PASS] Status code 200 OK
Test 2: Login with Invalid Password                      -> [PASS] Status code 401 Unauthorized
Test 3: Profile Verification with Bearer Token           -> [PASS] Status code 200 OK
Test 4: Master Polyclinics List                          -> [PASS] Contains 6 polyclinics (POLI-INT: A)
Test 5: Register New Patient                             -> [PASS] Status code 201 Created (Auto MR)
Test 6: Reject Duplicate Patient NIK                     -> [PASS] Status code 409 Conflict
Test 7: Patient Registration & Queue Generation          -> [PASS] Status code 201 Created (Queue A001)
Test 8: CRITICAL CASE 1 - Duplicate Visit Rejection      -> [PASS] Status code 409 DUPLICATE_ACTIVE_VISIT
Test 9: Visit State Transition to IN_EXAMINATION         -> [PASS] Status code 200 OK
Test 10: Input EMR SOAP & ICD-10 Diagnoses               -> [PASS] Status code 201 Created (FINALIZED)
Test 11: Add Medical Procedure with Snapshot Price       -> [PASS] Snapshot Price Immutability
Test 12: Doctor Creates Prescription                     -> [PASS] Status code 201 Created (RX-...)
Test 13: Doctor Creates Lab Order                        -> [PASS] Status code 201 Created (ORDERED)
Test 14: CRITICAL CASE 2 - Pharmacy Stock Locking        -> [PASS] Row-level Lock SELECT FOR UPDATE & Stock Deducted
Test 15: Billing Consolidation & Invoice Snapshot        -> [PASS] Consolidated Total & Items Snapshot
Test 16: CRITICAL CASE 3 - Cashier Payment (Partial)     -> [PASS] Status code 201 Created (PARTIALLY_PAID)
Test 17: CRITICAL CASE 3 - Idempotent Replay             -> [PASS] 200 OK (Idempotent Replay, No Double Charge)
Test 18: Final Settlement (Paid in Full)                 -> [PASS] Status PAID & Visit COMPLETED
=======================================================
VERIFICATION RESULT: 48 PASSED, 0 FAILED
=======================================================
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
