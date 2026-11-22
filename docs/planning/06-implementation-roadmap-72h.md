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

#### 🎯 FASE 8: Master E2E Acceptance Test (21 Tahap), Interactive Terminal Control Center, & Swagger UI
- [x] Master End-to-End Acceptance Test (`scripts/e2e_acceptance_test.php`, `make simrs-e2e`): 21 dari 21 tahapan alur rumah sakit lulus 100% tanpa mock.
- [x] Terminal Demo Runner & Control Center (`scripts/simrs_menu.sh`, `make simrs-demo`).
- [x] Embedded Standalone Swagger UI API Explorer (`public/docs/index.html` pada `http://127.0.0.1:8080/docs/`).
- [x] Dokumen Panduan Evaluasi Penguji Komprehensif (`docs/EXAMINER_EVALUATION_GUIDE.md`).

#### 📊 FASE 9: Laporan Klinis & Rekonsiliasi Finansial (Standar Kemenkes RI Form RL 5.3)
- [x] Service Pelaporan Klinis & Finansial (`src/Services/ReportService.php` & `ReportController.php`):
  - Laporan 10 Besar Penyakit Morbiditas Rawat Jalan (RL 5.3 Kemenkes RI) dengan pemilahan kasus Laki-laki vs Perempuan dan ranking diagnosa ICD-10 primer.
  - Laporan Rekonsiliasi Kasir & Finansial: rincian nominal per metode bayar (CASH, QRIS, DEBIT_CARD, BANK_TRANSFER).
  - Laporan Distribusi Kunjungan Poliklinik & Beban Kerja Dokter DPJP.
  - Laporan Pemakaian & Mutasi Obat Farmasi.
- [x] Frontend UI Laporan & Rekonsiliasi (`frontend-react/src/pages/ReportsPage.tsx`) dengan Recharts visual ranking dan filter tanggal cepat (Hari Ini, 7 Hari, Bulan Ini).
- [x] 14 Skenario Pengujian Laporan Terotomasi (`tests/reports_test.php`) 100% Passed.

#### 🛡️ FASE 10: RME Permenkes 24/2022 Audit Trail Compliance, System Health Diagnostics, & Final Deliverable Package
- [x] Service Audit Trail Kepatuhan RME Permenkes No. 24/2022 (`src/Services/AuditService.php` & `AuditController.php`):
  - Pencatatan otomatis & immutable setiap mutasi SOAP, resep farmasi, pembayaran kasir, dan akses rekam medis.
  - Agregasi jejak audit pasien longitudinal multi-domain (Registrasi, EMR, Farmasi, Billing).
  - Ringkasan kepatuhan regulasi nasional (Compliance Summary & Statuta Retensi 25 Tahun).
- [x] Frontend UI Audit Trail (`frontend-react/src/pages/AuditTrailPage.tsx`) dengan filter domain, filter aksi, dan viewer diff JSON data lama vs data baru.
- [x] 13 Skenario Pengujian Audit Trail Kepatuhan Permenkes (`tests/audit_compliance_test.php`) 100% Passed.
- [x] System Health Check & Integrity Diagnostics CLI (`scripts/system_health_check.php`, `make simrs-health`): 12 monitor kesehatan sistem 100% Healthy.
- [x] Total 120 Pengujian Terotomasi Terintegrasi (`make simrs-test`) + 21 E2E Stages (`make simrs-e2e`) = **141 Verification Checkpoints Passed (100% PASS)**.
- [x] Packaging deliverable otomatis (`make simrs-package`) dan target CI/CD terpadu (`make simrs-ci`).

#### 💰 FASE 11: Critical Case 4 Financial Adjustments, SatuData Clinical Portability Engine, & Disaster Recovery Verification
- [x] Service Layer Penyesuaian Tagihan (`src/Services/InvoiceAdjustmentService.php` & `BillingController.php`):
  - Penambahan biaya (*ADDITION* / *Surcharge*), potongan/diskon (*DEDUCTION*), dan pembatalan tagihan (*CANCELLATION*).
  - Proteksi *snapshot immutability*, penambahan versi invoice (*version increment*), penguncian baris `FOR UPDATE`, dan pencatatan audit log otomatis.
- [x] Frontend Kasir Penyesuaian Biaya (`CashierBillingPage.tsx`): Modal form penyesuaian biaya, indikator versi invoice, dan riwayat penyesuaian.
- [x] Clinical Data Portability & SatuData Export Engine (`scripts/export_clinical_dataset.php`, `make simrs-export`): Ekspor dataset rekam medis lengkap berstandar interoperabilitas nasional Kemenkes SatuData + hash SHA-256 manifest.
- [x] Disaster Recovery & Snapshot Verifier (`scripts/disaster_recovery_verify.php`, `make simrs-dr-test`): Snapshot pg_dump, verifikasi 31 tabel, partial unique index, dan evaluasi RPO = 0 & RTO < 5 menit.
- [x] 14 Skenario Pengujian Penyesuaian Finansial (`tests/invoice_adjustments_test.php`) 100% Passed.
- [x] Total **134 Automated Tests** + **12 Health Monitors** + **7 DR Checks** + **21 E2E Stages** = **174 Verification Checkpoints (100% PASS)**.

#### 🌪️ FASE 12: Chaos Engineering, High-Availability Resilience, & Deadlock Defense
- [x] Test Suite Chaos & Resiliensi Sistem (`tests/chaos_resilience_test.php`, `make simrs-chaos`):
  - Uji Atomisitas & Rollback Transaksi Database pada kegagalan eksepsi mid-flight (ACID guarantee).
  - Uji Burst Konkurensi Pendaftaran & Nomor Antrean Atomik tanpa race condition / duplikasi.
  - Uji Ketahanan Stok Minus Farmasi (Row-level lock `SELECT FOR UPDATE` & under-stock rejection).
  - Uji Anti-Double Payment Replay Attack via Idempotency Key unik.
  - Uji Immutabilitas Tarif Historis saat Master Data Tarif Diubah/Dimutasi.
  - Uji Integritas & Audit Trail Penyesuaian Tagihan Kasus Kritis 4.
  - Uji Ketahanan Validasi Schema FHIR R4 Bundle terhadap payload anomali.
  - Uji Pembatasan Hak Akses Keamanan Lintas Peran (RBAC Boundary Protection).
  - Uji Isolasi Pengguna PostgreSQL Read-Only (`simrs_dashboard_ro`) terhadap injeksi mutasi DDL/DML.
  - Uji Integritas Ekspor Portabilitas Data Klinis Kemenkes SatuData & SHA-256 Checksum.
  - Uji Transisi State Machine Kunjungan Pasien pada beban tinggi.
- [x] 11 Skenario Pengujian Chaos & Resiliensi (`tests/chaos_resilience_test.php`) 100% Passed.
- [x] Peningkatan Total Automated Tests dari 134 menjadi **145 Automated Tests**.

#### 🏆 FASE 13: Final Deliverable Package, Executive Presentation Walkthrough, & Production Readiness
- [x] Master Verification Suite (`make simrs-ci`): **185 dari 185 Checkpoints Lulus (100% HEALTHY & PASS)**:
  - 12 Monitor Kesehatan Sistem (`make simrs-health`)
  - 7 Disaster Recovery & Snapshot Checks (`make simrs-dr-test`)
  - 145 Pengujian Unit & Integrasi Terotomasi (`make simrs-test`)
  - 21 Master Tahapan Alur Rumah Sakit E2E (`make simrs-e2e`)
- [x] Pembaruan Koleksi Postman (`postman/SIMRS_Collection.json` & `postman/SIMRS_Environment.json`) mencakup 10 Folder Modul dan Penyesuaian Finansial Kasus 4.
- [x] Interactive Terminal Control Center 15 Menu (`scripts/simrs_menu.sh`, `make simrs-demo`).
- [x] Script Presentasi & Panduan Demonstrasi Eksekutif 10 Menit (`docs/EXECUTIVE_DEMO_WALKTHROUGH.md`).
- [x] Panduan Dewan Penguji Komprehensif (`docs/EXAMINER_EVALUATION_GUIDE.md`).
- [x] Packaging Otomatis Deliverable Final (`make simrs-package`) menghasilkan arsip terkompresi `dist/simrs-inovamedika-deliverable.tar.gz`.

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
