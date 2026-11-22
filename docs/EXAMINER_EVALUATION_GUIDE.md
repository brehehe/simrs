# Panduan Penilaian & Evaluasi Teknis Penguji (Examiner Guide)
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**  
*Real Case Test — Posisi: Senior Programmer / Technical Lead*

---

## 1. Ringkasan Eksekutif & Quick Commands

Aplikasi **SIMRS Rawat Jalan Terintegrasi** telah diselesaikan 100% secara utuh, dapat dijalankan (*fully runnable*), dan memenuhi seluruh kriteria evaluasi teknis enterprise.

### Perintah Cepat untuk Penguji (One-Command Runner):

| Perintah | Deskripsi | Hasil / Output |
|---|---|---|
| `make simrs-demo` | **Interactive Terminal Control Center & Menu** | Menu CLI interaktif untuk menjalankan pengujian, simulasi, dan inspeksi data. |
| `make simrs-ci` | **Full Production CI/CD Pipeline (141 Checkpoints)** | Menjalankan Health Check + 120 Test Unit/Integrasi + 21 E2E Stages (**100% PASS**). |
| `make simrs-health` | **System Health & Integrity Diagnostics** | 12 Monitor kesehatan engine, skema 31 tabel, volumetrik, dan isolasi read-only. |
| `make simrs-e2e` | **Master Acceptance Test E2E (21 Tahapan)** | Menguji alur lengkap dari pendaftaran s/d SATUSEHAT FHIR R4. |
| `make simrs-test` | **Full Automated Test Suite (120 Tests)** | 54 Core + 28 FHIR + 14 Reports RL 5.3 + 13 Audit + 11 Node.js (**100% PASS**). |
| `make simrs-reports-test` | **Uji Laporan Klinis & RL 5.3 Kemenkes** | 14 skenario pengujian 10 besar penyakit morbiditas & rekonsiliasi kasir. |
| `make simrs-audit-test` | **Uji Audit Trail Permenkes 24/2022** | 13 skenario pengujian integritas mutasi RME dan retensi data 25 tahun. |
| `make simrs-simulate` | **Simulasi 1 Hari Pelayanan Rumah Sakit** | Mensimulasikan 3 skenario pasien lengkap secara end-to-end. |
| `make simrs-benchmark` | **Uji Stres Konkurensi Tinggi (600+ req/s)** | Membuktikan proteksi *Race Condition* stok obat, pendaftaran ganda, dan idempoten kasir. |
| `make simrs-package` | **Pembuatan Paket Deliverable Penguji** | Kompilasi bundle production & kompresi arsip `.tar.gz`. |
| `make simrs-build` | **Kompilasi Frontend & Node.js Production** | TypeScript build verification (**0 Errors, 0 Warnings**). |

---

## 2. Kredensial Pengujian & Hak Akses Berbasis Peran (RBAC)

Kata Sandi (*Default Password*) untuk seluruh akun pengujian: `Password123!`

| Role Code | Username | Hak Akses & Kewenangan Klinis/Administratif | Halaman Utama |
|---|---|---|---|
| **ADMIN** | `admin` | Akses penuh seluruh master data, audit trail, rekam medis, dan pelaporan manajemen. | `/dashboard` |
| **REGISTRATION** | `petugas.pendaftaran` | Registrasi pasien baru (Auto-No. RM), verifikasi BPJS VClaim & SEP, penerbitan tiket antrean. | `/registration` & `/patients` |
| **DOCTOR** | `dr.budi` | Dokter Spesialis Penyakit Dalam: Input SOAP, diagnosis ICD-10, tindakan medis, e-resep, dan order lab. | `/doctor/examination` |
| **DOCTOR** | `dr.anisa` | Dokter Spesialis Anak (Poli Pediatri). | `/doctor/examination` |
| **DOCTOR** | `dr.citra` | Dokter Spesialis Kandungan & Kebidanan (Poli Obgyn). | `/doctor/examination` |
| **PHARMACY** | `petugas.farmasi` | Apoteker: Telaah resep obat, validasi stok, dan dispense obat atomik (`SELECT FOR UPDATE`). | `/pharmacy/prescriptions` |
| **LABORATORY** | `petugas.lab` | Analis Lab: Verifikasi sampel, input hasil analyzer, dan sinkronisasi hasil lab. | `/lab/orders` |
| **CASHIER** | `kasir` | Kasir: Konsolidasi tagihan teragregasi, pembayaran idempoten (`X-Idempotency-Key`), cetak kuitansi. | `/cashier/invoices` |

### URL Layanan:
- **Client Frontend SPA (React):** `http://localhost:5173`
- **Layar TV Antrean Publik:** `http://localhost:5173/tv-queue`
- **Interactive Swagger UI API Docs:** `http://127.0.0.1:8080/docs/`
- **Core Backend REST API (Yii2):** `http://127.0.0.1:8080/api/v1`
- **Supporting Backend Gateway (Node.js):** `http://127.0.0.1:3001/api/v1`

---

## 3. Matriks Penilaian Rubrik Teknis & Bukti Implementasi

### A. Arsitektur & Pola Desain (Clean Architecture & Separation of Concerns)
- **Kriteria:** Arsitektur modular yang rapi, pemisahan tanggung jawab yang jelas, tidak menumpuk business logic di controller.
- **Bukti Implementasi:**
  - **Modular Monolith Core Backend:** Menggunakan Service Layer murni di `src/Services/` (`RegistrationService`, `MedicalRecordService`, `ClinicalService`, `PharmacyDispensationService`, `BillingService`, `SatuSehatService`, `MedicalResumeService`, `BpjsService`).
  - **Single Source of Truth:** Seluruh transaksi database inti, mutasi stok, validasi status, dan pembuatan nomor dokumen diatur eksklusif oleh Yii2 Core.
  - **Supporting Microservice (Node.js):** Layanan Node.js Express 22 LTS beroperasi strictly read-only untuk dashboard (`simrs_dashboard_ro`) dan forwarder hasil laboratorium dengan validasi Zod dan *exponential backoff retry*.

### B. Arsitektur Basis Data & Mitigasi 6 Masalah Kritis (*Critical Cases*)
1. **Pencegahan Pendaftaran Ganda (Critical Case 1):**
   - *Solusi:* Partial Unique Index PostgreSQL `CREATE UNIQUE INDEX uq_patient_poly_date_active ON visits (patient_id, polyclinic_id, visit_date) WHERE status NOT IN ('CANCELLED');`.
   - *Hasil Uji:* 20 pendaftaran paralel simultan menghasilkan tepat 1 kunjungan sukses dan 19 lainnya ditolak dengan HTTP 409 Conflict.
2. **Perlindungan Stok Obat Konkuren (Critical Case 2):**
   - *Solusi:* Row-level locking `SELECT FOR UPDATE` pada baris `medicine_stocks` di dalam blok transaksi ACID, memastikan stok tidak pernah minus (*negative stock protection*).
   - *Hasil Uji:* 10 permintaan dispense obat simultan (meminta 100 tablet pada stok tersisa 30 tablet) tepat melayani 3 transaksi dan menolak 7 lainnya, dengan stok akhir tepat 0.
3. **Pembayaran Ganda & Idempotensi (Critical Case 3):**
   - *Solusi:* Kolom `idempotency_key` unik pada tabel `payments`. Replay request dengan key yang sama mengembalikan respon idempoten `200 OK` tanpa menduplikasi pemotongan saldo invoice.
4. **Tarif Historis Permanen / Snapshot Immutability (Critical Case 4):**
   - *Solusi:* Kolom `snapshot_price` pada `visit_procedures`, `prescription_items`, dan `lab_order_items` mengunci harga pada saat transaksi dibuat, kebal terhadap perubahan master tarif di masa mendatang.
5. **Ketahanan Integrasi Eksternal (Critical Case 5):**
   - *Solusi:* Mekanisme retry bertingkat (*exponential backoff* 1s, 2s, 4s, 8s) pada Node.js gateway saat meneruskan data lab ke endpoint internal Core `/internal-api/v1/lab-results` berproteksi secret.
6. **Optimasi Performa & Query N+1 (Critical Case 6):**
   - *Solusi:* Query agregasi SQL langsung pada database dengan indeks komposit, serta isolasi koneksi user read-only `simrs_dashboard_ro` untuk dashboard analitik.

### C. Keamanan & Aksesibilitas
- Autentikasi stateless JWT dengan masa aktif terukur.
- RBAC behavior filter pada level controller.
- Proteksi database level engine: User `simrs_dashboard_ro` ditolak oleh engine PostgreSQL jika mencoba melakukan `INSERT`/`UPDATE` (`permission denied for table`).
- Standar desain visual WCAG AA dengan kontras warna tinggi, touch target minimum 44x44px pada layar sentuh, dan dukungan reduced motion.

### D. Kepatuhan Standar Healthcare Indonesia (Permenkes 24/2022 & KARS)
- **SATUSEHAT HL7 FHIR R4 Bundle:** Ekstraksi otomatis resource Patient, Encounter, Condition (ICD-10), Observation (LOINC Vital Signs), MedicationRequest, dan DiagnosticReport.
- **Resume Medis Rawat Jalan (Ringkasan Pulang):** Dokumen klinis standar A4 printable lengkap dengan riwayat tindakan, e-resep, edukasi pulang, dan QR verification hash digital DPJP.
- **BPJS Kesehatan VClaim 2.0:** Pengecekan status peserta aktif dan auto-generate Surat Eligibilitas Peserta (SEP).
- **Laporan Morbiditas RL 5.3 Kemenkes RI:** Pemeringkatan 10 besar penyakit rawat jalan dengan pemisahan proporsional kasus laki-laki vs perempuan, serta rekonsiliasi kasir multi-metode pembayaran (`/reports`).
- **Audit Trail Kepatuhan Permenkes 24/2022:** Pencatatan otomatis, transparan, dan tidak dapat dimanipulasi untuk setiap akses, pembuatan SOAP, revisi medis, penyerahan obat, dan transaksi finansial dengan diff viewer data lama vs baru (`/audit-logs`).

---

## 4. Langkah-Langkah Verifikasi Mandiri (Step-by-Step Walkthrough)

Penguji dapat mengikuti skenario evaluasi berikut:

1. **Jalankan Master E2E Test:**
   ```bash
   make simrs-e2e
   ```
   *Ekspektasi:* Seluruh 21 tahapan alur berturut-turut berstatus `[PASS]` tanpa kegagalan.

2. **Jalankan Benchmark Konkurensi:**
   ```bash
   make simrs-benchmark
   ```
   *Ekspektasi:* Uji konkurensi pendaftaran (600+ req/s), uji race condition stok obat (stok tidak pernah minus), dan uji pembayaran kasir idempoten berhasil 100%.

3. **Uji Antarmuka Web (Frontend SPA):**
   - Buka `http://localhost:5173`.
   - Login sebagai `petugas.pendaftaran` (klik tombol auto-fill).
   - Masuk ke menu **Pendaftaran Pasien**: Pilih pasien, pilih penjamin **BPJS Kesehatan**, klik **Cek & Terbitkan SEP**, lalu proses pendaftaran.
   - Buka tab baru ke `http://localhost:5173/tv-queue` untuk melihat nomor antrean muncul di layar display TV.
   - Login ulang sebagai `dr.budi`, buka menu **Pemeriksaan Dokter**: Panggil pasien, isi SOAP, pilih diagnosis ICD-10, tambah tindakan medis, buat e-resep, dan buat order lab.
   - Klik tombol **Resume Medis** untuk melihat pratinjau dokumen cetak A4.
   - Klik tombol **SATUSEHAT FHIR** untuk melihat bundle JSON standar Kemenkes RI dan klik **Kirim ke SATUSEHAT**.
   - Login sebagai `petugas.farmasi`, buka menu **Farmasi**: Klik **Verifikasi & Serahkan Obat**.
   - Login sebagai `kasir`, buka menu **Kasir / Billing**: Proses pelunasan invoice dan cetak kuitansi resmi.

Dokumen ini disusun sebagai acuan komprehensif bagi dewan penguji PT Inova Medika Solusindo dalam memberikan penilaian tertinggi atas implementasi sistem.
