# 06 — Rencana Implementasi 72 Jam, Struktur Monorepo, dan Test Matrix
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**

---

## 1. Rencana Eksekusi Bertahap (72-Hour Implementation Roadmap)

Pengembangan dibagi ke dalam 6 fase berdurasi masing-masing 12 jam untuk memastikan progres terukur, modular, dan selalu dapat diuji (*verifiable*):

```
[00 - 12h] FASE 1: Fondasi Arsitektur, Skema PostgreSQL, Migrasi, & Seeding
    │
[12 - 24h] FASE 2: Auth JWT, RBAC Matrix, Master Data, & Modul Pendaftaran Antrean
    │
[24 - 36h] FASE 3: Pemeriksaan Dokter (EMR SOAP), ICD-10, & Snapshot Tindakan Medis
    │
[36 - 48h] FASE 4: Farmasi Dispensing (Stock Lock), Lab Order, & Internal Lab Ingestion
    │
[48 - 60h] FASE 5: Konsolidasi Billing, Idempotent Kasir, & Node.js Supporting Service
    │
[60 - 72h] FASE 6: React Frontend SPA, 18 Test Scenarios, Postman, & Final Delivery
    │
[Post-72h] FASE 7: Enterprise Interoperability (SATUSEHAT FHIR R4, Resume Medis, BPJS VClaim, & Docker Deployment)
```

---

### Detail Milestone Tiap Interval 12 Jam

#### ⏱️ Jam 00 — 12: Architecture & Database Foundation
- [x] Finalisasi perencanaan teknis di `docs/planning/`.
- [x] Konfigurasi database PostgreSQL (koneksi `simrs_core` dan `simrs_dashboard_ro`).
- [x] Penulisan migrasi database PostgreSQL (30 tabel lengkap dengan foreign key dan check constraints).
- [x] Pembuatan index performa dan partial unique index (pencegah pendaftaran ganda).
- [x] Seeding data master realistis: 6 Poliklinik, 10 Dokter, 50 Diagnosis ICD-10, 20 Tindakan Medis, 30 Obat dengan stok awal, 10 Paket Uji Lab.

#### ⏱️ Jam 12 — 24: Core Backend — Auth, Master Data, & Pendaftaran Antrean
- [x] Implementasi autentikasi JWT stateless dan filter otorisasi peran (RBAC Behavior) di Yii.
- [x] Implementasi endpoint CRUD Master Pasien (Auto-generation No. RM: `RM-YYYYMM-XXXXX`).
- [x] Implementasi Service Layer Pendaftaran: `RegistrationService.php`.
- [x] Implementasi Atomic Queue Counter pada tabel `queue_counters` untuk nomor urut antrean (`A001`, `B001`).
- [x] Unit & Integration Test: Penolakan pendaftaran duplikat pasien di tanggal dan poli yang sama (HTTP 409).

#### ⏱️ Jam 24 — 36: Core Backend — RME Dokter, Tindakan Medis, & Resep
- [x] Implementasi Service Layer Klinis: `MedicalRecordService.php`.
- [x] Pencatatan data SOAP, tanda vital terstandarisasi, dan relasi kode ICD-10 primer/sekunder.
- [x] Pencatatan tindakan medis dengan mekanisme penarikan `snapshot_price` permanen.
- [x] Modul penulisan resep obat oleh dokter (status resep: `DRAFT` ➔ `SUBMITTED`).
- [x] Riwayat perubahan medis pada `medical_record_revisions`.

#### ⏱️ Jam 36 — 48: Core Backend — Farmasi (Stock Lock) & Laboratorium
- [x] Implementasi Service Layer Farmasi: `PharmacyDispensationService.php`.
- [x] Proteksi *Race Condition* stok obat menggunakan transaksi PostgreSQL dan row lock `SELECT FOR UPDATE`.
- [x] Pencatatan histori kartu stok pada `stock_movements`.
- [x] Modul permintaan uji laboratorium oleh dokter (`lab_orders`).
- [x] Implementasi internal REST API Yii (`/internal-api/v1/lab-results`) untuk penerimaan hasil lab berotorisasi.

#### ⏱️ Jam 48 — 60: Core Backend (Billing) & Supporting Backend (Node.js)
- [x] Implementasi Service Layer Keuangan: `BillingPaymentService.php`.
- [x] Otomatisasi pembentukan invoice teragregasi (Registrasi + Tindakan + Lab + Obat).
- [x] Implementasi transaksi pembayaran kasir dengan perlindungan `idempotency_key` dan row lock invoice balance.
- [x] Inisialisasi microservice Node.js Express: konfigurasi Zod validation dan centralized error handler.
- [x] Implementasi Lab Webhook Gateway pada Node.js dengan mekanisme exponential backoff retry.
- [x] Implementasi Dashboard API read-only pada Node.js via query SQL langsung ke PostgreSQL.

#### ⏱️ Jam 60 — 72: React Frontend UI, Automated Testing, & Postman
- [x] Setup Frontend React + Vite + Tailwind CSS + TanStack Query.
- [x] Implementasi UI berbasis Role:
  - Form Login & Route Guard.
  - Modul Pendaftaran & Cetak Tiket Antrean.
  - Modul Dokter (Worklist antrean, input SOAP, tindakan, resep, order lab).
  - Modul Farmasi (Worklist resep & tombol dispense obat).
  - Modul Kasir (Rincian invoice & modal pembayaran kasir).
  - Tampilan Cetak Rincian Invoice & Bukti Kuitansi Pembayaran.
  - Dashboard Eksekutif (KPI Summary Cards & Recharts).
- [x] Eksekusi 18+ skenario pengujian otomatis (54 Yii tests + 11 Node tests = 65 tests passed).
- [x] Pembuatan Postman Collection & Environment JSON lengkap.
- [x] Finalisasi dokumentasi README dan persiapan presentasi demonstrasi.

#### 🚀 FASE 7: Enterprise Interoperability, SATUSEHAT (FHIR R4), Resume Medis, BPJS VClaim, & Docker Deployment
- [x] Implementasi SATUSEHAT Kemenkes RI FHIR R4 Bundle Engine (`SatuSehatService.php`):
  - Resource Patient (NIK & No. RM)
  - Resource Encounter (Rawat Jalan / `AMB`)
  - Resource Condition (ICD-10 Primer & Sekunder)
  - Resource Observation (LOINC Vital Signs: TD, HR, RR, Suhu, BB, TB)
  - Resource MedicationRequest (E-Resep Farmasi)
  - Resource DiagnosticReport & Observation (Hasil Laboratorium)
- [x] Sinkronisasi & Logging SATUSEHAT (`satusehat_logs`, IHS Resource IDs generator).
- [x] Modul Ringkasan Pulang Rawat Jalan (`MedicalResumeService.php`, `ResumeMedisModal.tsx`) standar KARS/STARKES A4 printable layout dengan TTE QR hash DPJP.
- [x] Integrasi BPJS Kesehatan VClaim 2.0 Stubs (`BpjsService.php`, Cek Peserta NIK & Auto-generate SEP `0101R001...`).
- [x] Komponen UI SATUSEHAT Modal (`SatuSehatModal.tsx`) dengan JSON Viewer & 1-klik Sync.
- [x] Integrasi Docker Multi-Container Optimization (`Dockerfile` + `pdo_pgsql`, `docker-compose.yml`, `docs/DOCKER_DEPLOYMENT.md`).
- [x] Total 93 Skenario Pengujian Terotomasi (54 Yii Core + 28 FHIR/BPJS + 11 Node.js) 100% Passed.

---

## 2. Struktur Monorepo Proyek

Proyek diorganisir dalam struktur monorepo yang bersih dan terisolasi:

```text
SIMRS/
├── backend-yii2/               # Core Backend: Yii Framework (Single Source of Truth)
│   ├── config/                 # Konfigurasi database, routes, dan DI container
│   ├── controllers/            # REST API Controllers (V1 & Internal)
│   ├── models/                 # ActiveRecord Models & Validation Rules
│   ├── services/               # Business Service Layer (Transaksi & Domain Logic)
│   │   ├── RegistrationService.php
│   │   ├── MedicalRecordService.php
│   │   ├── PharmacyDispensationService.php
│   │   ├── BillingPaymentService.php
│   │   └── LabIntegrationService.php
│   ├── components/             # JWT Authenticator, RBAC Rule, Response Envelope
│   ├── migrations/             # PostgreSQL Schema Migrations (30 tabel)
│   ├── tests/                  # PHPUnit / Codeception Test Cases
│   └── yii                     # Yii Console Executable
│
├── backend-node/               # Supporting Backend: Node.js + Express.js
│   ├── src/
│   │   ├── controllers/        # Lab Integration & Dashboard Controllers
│   │   ├── services/           # Forwarding Service, SQL Aggregator, Retry Logic
│   │   ├── middlewares/        # Auth Middleware, Error Handler
│   │   ├── validators/         # Zod Validation Schemas
│   │   └── config/             # PostgreSQL Pool (Read-Only User) & Env
│   ├── tests/                  # Supertest / Vitest API Tests
│   └── package.json
│
├── frontend-react/             # Client Frontend SPA: React.js + Vite
│   ├── src/
│   │   ├── components/         # UI Elements, Layout, Sidebar, Topbar, Modals
│   │   ├── pages/              # Halaman Login, Pendaftaran, Dokter, Farmasi, Kasir, Dashboard
│   │   ├── hooks/              # Custom Hooks & TanStack Query mutations
│   │   ├── services/           # Axios API Client & Interceptors
│   │   └── routes/             # Role-based Protected Route Guards
│   ├── package.json
│   └── vite.config.ts
│
├── database/                   # Database Scripts
│   ├── schema.sql              # Raw DDL PostgreSQL
│   └── seeds.sql               # Realistic Clinical & Master Dummy Data
│
├── docs/                       # Dokumentasi Teknis
│   ├── planning/               # Dokumen Perencanaan 01 s/d 06
│   ├── architecture.md
│   ├── erd.md
│   ├── api-documentation.md
│   └── test-cases.md
│
├── postman/                    # Postman Artifacts
│   ├── SIMRS_Collection.json   # Koleksi Request Lengkap
│   └── SIMRS_Environment.json  # Environment Variables (Local, Docker)
│
├── docker-compose.yml          # Orkestrasi PostgreSQL, Yii, Node, & React
├── .env.example
└── README.md
```

---

## 3. Matriks Pengujian 18 Skenario Kasus Uji (Test Matrix)

Berikut daftar 18 skenario pengujian komprehensif yang wajib diverifikasi dan didemonstrasikan:

| No | Skenario Pengujian | Target Komponen | Ekspektasi Hasil Uji | Kategori Kasus |
|:---:|---|---|---|:---:|
| **1** | Login dengan role benar dan salah | Auth Endpoint Yii | Kredensial benar menghasilkan token JWT + role; salah menghasilkan 401 Unauthorized. | Keamanan |
| **2** | Validasi pasien duplikat | Master Pasien | Registrasi NIK atau No. RM yang sama ditolak (422 / 409). | Validasi Data |
| **3** | Alur pendaftaran pasien standar | Visit Service | Terbentuk kunjungan berstatus `WAITING` dengan nomor antrean (misal: `A001`). | Alur Fungsional |
| **4** | Pendaftaran pasien konkuren | Visit Service & DB | Dua request simultan di poli & hari sama: 1 sukses (201), 1 ditolak (409). | **Kasus Kritis 1** |
| **5** | Keunikan nomor antrean atomik | Queue Counter | 50 request konkuren menghasilkan 50 nomor urut berurutan tanpa lompatan/duplikasi. | **Kasus Kritis 1** |
| **6** | Input rekam medis dokter (SOAP) | Medical Record Svc| Data vital signs, keluhan, dan diagnosis ICD-10 primer/sekunder tersimpan valid. | Alur Medis |
| **7** | Penambahan tindakan medis | Procedure Service | Tarif tindakan ter-snapshot permanen; perubahan tarif master tidak merusak data. | Integritas Tarif |
| **8** | Penulisan resep & validasi stok | Pharmacy Service | Resep berhasil dibuat; sistem memvalidasi ketersediaan obat di depo. | Alur Farmasi |
| **9** | Penyerahan obat konkuren | Pharmacy Service | Dua dispense simultan pada sisa stok minim: 1 sukses, 1 gagal (stok tidak minus). | **Kasus Kritis 2** |
| **10**| Order dan input hasil lab | Lab Service & Node| Dokter order lab; analis/Node.js menginput hasil; status order menjadi `COMPLETED`. | Alur Penunjang |
| **11**| Otomatisasi konsolidasi invoice | Billing Service | Invoice teragregasi otomatis: registrasi + tindakan + lab + obat secara akurat. | Alur Keuangan |
| **12**| Pembayaran cicilan (Partial Pay)| Billing Service | Pembayaran sebagian mengubah invoice ke `PARTIALLY_PAID` dan update sisa saldo. | Alur Keuangan |
| **13**| Pembayaran ganda & network retry| Billing Service | Request berulang dengan `idempotency_key` sama mengembalikan hasil transaksi awal. | **Kasus Kritis 3** |
| **14**| Pelunasan penuh invoice (Paid) | Billing Service | Sisa saldo menjadi 0, status invoice `PAID`, status visit menjadi `COMPLETED`. | Alur Keuangan |
| **15**| Perubahan medis pasca-invoice | Billing & Medical | Perubahan layanan setelah invoice terbit dicatat via versioning / adjustment. | **Kasus Kritis 4** |
| **16**| Otorisasi peran RBAC | API Middleware | Dokter tidak bisa bayar invoice; Kasir tidak bisa input rekam medis (403 Forbidden).| Keamanan RBAC |
| **17**| Kegagalan integrasi Node.js ➔ Yii | Node.js Gateway | Retry otomatis dengan exponential backoff dan fallback pencatatan ke outbox/inbox.| **Kasus Kritis 5** |
| **18**| Performa Dashboard API (Read-only)| Node.js Aggregator| Agregasi SQL cepat (< 50ms) melalui PostgreSQL user khusus SELECT. | **Kasus Kritis 6** |
