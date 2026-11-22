# LAPORAN TEKNIS EKSEKUTIF & ARSITEKTUR SISTEM
## PENGEMBANGAN SIMRS RAWAT JALAN TERINTEGRASI
**PT Inova Medika Solusindo — Real Case Test (Senior Programmer)**

---

## 1. RINGKASAN EKSEKUTIF

Laporan ini menyajikan hasil perancangan, implementasi, dan pengujian sistem aplikasi **SIMRS Rawat Jalan Terintegrasi** yang dibangun sesuai spesifikasi teknis dan standar industri layanan kesehatan (*healthcare enterprise*).

Aplikasi ini mencakup siklus pelayanan pasien rawat jalan secara utuh (*end-to-end*):
```
Pasien ➔ Pendaftaran & Antrean ➔ Pemeriksaan Dokter (SOAP & EMR) ➔ Diagnosis ICD-10 & Tindakan Medis ➔ Resep Obat / Permintaan Lab ➔ Farmasi / Laboratorium ➔ Billing & Kasir ➔ Pembayaran & Invoice ➔ Riwayat Pasien.
```

Seluruh kode program diimplementasikan secara **nyata, runnable, teruji secara otomatis**, tanpa data mockup semu pada jalur transaksional inti.

---

## 2. STACK TEKNOLOGI & ARSITEKTUR SISTEM

Sistem menerapkan arsitektur **Modular Monolith** dengan pemisahan tanggung jawab yang tegas (*separation of concerns*):

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT FRONTEND (React 18 + Vite SPA)                │
│   Tailwind CSS • TanStack Query • React Hook Form + Zod • Recharts     │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ REST API / JWT                  │ Read-Only / S2S
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       CORE BACKEND (PHP 8.x + Yii)   │  │ SUPPORTING SERVICE (Node.js) │
│ • Single Source of Truth Transaksi   │  │ • External Lab Webhook       │
│ • RBAC & JWT Authorization           │  │ • Zod Payload Validation     │
│ • ACID PostgreSQL Transactions       │  │ • Backoff Retry Forwarder    │
│ • Row-Level Locking (Stock & Bill)   │  │ • Read-Only Dashboard Aggreg.│
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │ Write / DDL / Read (simrs_core)     │ Read-Only (simrs_dashboard_ro)
                   ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL 17 RELATIONAL DATABASE                    │
│   30 Tabel • UUID PK • Foreign Keys • Partial Unique Index • ACID      │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Peran Yii Framework (PHP 8.x)
- **Single Source of Truth**: Seluruh transaksi inti (pendaftaran pasien, EMR dokter, mutasi persediaan obat, pembuatan invoice, dan pembayaran kasir) dikelola secara eksklusif oleh Yii Framework.
- **Service Layer**: Mengisolasi *business logic* dari controller:
  - `RegistrationService.php`: Pengelolaan antrean atomik dan pencegahan registrasi ganda.
  - `MedicalRecordService.php`: Pengelolaan anamnesis SOAP dan revisi rekam medis.
  - `ClinicalService.php`: Diagnosa ICD-10, tindakan medis, e-resep, dan order lab.
  - `PharmacyDispensationService.php`: Penyerahan obat dengan penguncian baris `SELECT FOR UPDATE`.
  - `BillingService.php`: Konsolidasi tagihan dan pembayaran kasir idempoten.

### 2.2 Peran Node.js (Express.js LTS)
- **Gateway Integrasi Eksternal**: Menerima data hasil analisis dari mesin laboratorium eksternal via endpoint `/api/v1/integrations/lab-results`.
- **Validasi Zod & Retry**: Memvalidasi integritas format data dan meneruskan hasil ke Yii Core internal endpoint (`POST /internal-api/v1/lab-results`) dengan otentikasi `X-Internal-Secret` dan *exponential backoff retry* (1s, 2s, 4s, 8s).
- **Read-Only Dashboard**: Mengagregasi data analitik performa tinggi menggunakan user database `simrs_dashboard_ro` dengan hak akses terbatas hanya pada perintah `SELECT`.

---

## 3. PEMBUKTIAN SOLUSI 6 MASALAH KRITIS (CRITICAL CASES)

### Kasus 1: Pendaftaran Ganda Pasien & Antrean Konkuren
* **Masalah**: Risiko pendaftaran ganda pasien di poliklinik yang sama pada hari yang sama akibat klik berulang atau request paralel.
* **Solusi**:
  1. *Partial Unique Index* pada PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX uq_patient_poly_date_active ON visits (patient_id, polyclinic_id, visit_date)
     WHERE status NOT IN ('CANCELLED');
     ```
  2. *Atomic Upsert Queue Counter*:
     ```sql
     INSERT INTO queue_counters (polyclinic_id, counter_date, last_number)
     VALUES (:poly, :date, 1)
     ON CONFLICT (polyclinic_id, counter_date)
     DO UPDATE SET last_number = queue_counters.last_number + 1
     RETURNING last_number;
     ```
* **Hasil Verifikasi**: HTTP 409 Conflict secara konsisten dikembalikan pada upaya pendaftaran aktif kedua (Teruji pada Test Case 8).

### Kasus 2: Konkurensi Persediaan Obat (Pessimistic Locking)
* **Masalah**: Race condition ketika dua petugas farmasi melayani resep berbeda dengan stok obat yang sama secara bersamaan, berisiko menyebabkan stok minus.
* **Solusi**: Penguncian baris eksplisit `SELECT ... FOR UPDATE` dan pemotongan stok kondisional atomik:
  ```sql
  SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id FOR UPDATE;
  
  UPDATE medicine_stocks 
  SET current_stock = current_stock - :qty, updated_at = CURRENT_TIMESTAMP
  WHERE medicine_id = :id AND current_stock >= :qty;
  ```
* **Hasil Verifikasi**: Jika stok tidak mencukupi, sistem melempar `Exception` 422 dan membatalkan transaksi (`ROLLBACK`), serta mencatat kartu stok audit pada tabel `stock_movements` (Teruji pada Test Case 14).

### Kasus 3: Pembayaran Kasir Ganda (Idempotency Key)
* **Masalah**: Pasien atau kasir tidak sengaja menekan tombol bayar 2 kali berturut-turut pada invoice tagihan.
* **Solusi**:
  1. Unique Constraint pada tabel `payments(idempotency_key)`.
  2. Penguncian baris invoice: `SELECT outstanding_balance FROM invoices WHERE id = :id FOR UPDATE`.
  3. Replay idempoten: Jika `idempotency_key` yang sama diterima kembali, sistem langsung mengembalikan status sukses (HTTP 200) tanpa memotong saldo ulang (*zero double charging*).
* **Hasil Verifikasi**: Teruji pada Test Case 16 dan Test Case 17.

### Kasus 4: Imutabilitas Tarif Tindakan Medis Historis
* **Masalah**: Jika tarif master tindakan atau harga obat berubah di kemudian hari, tagihan masa lalu tidak boleh ikut berubah.
* **Solusi**: Mekanisme penarikan nilai tetap (*snapshot price*) pada tabel `visit_procedures.snapshot_price`, `prescription_items.snapshot_price`, dan `invoice_items.unit_price`.

### Kasus 5: Kegagalan Pengiriman Hasil Laboratorium
* **Masalah**: Gateway eksternal lab mengalami kegagalan jaringan saat mengirim hasil ke sistem SIMRS.
* **Solusi**: *Exponential backoff retry* pada Node.js gateway (1s, 2s, 4s, 8s) dan validasi rahasia internal `X-Internal-Secret` di Yii Core.

### Kasus 6: Kueri Analitik N+1 pada Dashboard Eksekutif
* **Masalah**: Kueri looping pada ActiveRecord memperlambat waktu respons dashboard.
* **Solusi**: Kueri agregasi SQL tunggal native di PostgreSQL dengan klausa `FILTER (WHERE ...)` yang dieksekusi oleh microservice Node.js dalam waktu di bawah 15ms.

---

## 4. HASIL UJI VERIFIKASI OTOMATIS (65 TEST CASES)

Eksekusi seluruh rangkaian pengujian dilakukan melalui perintah:
```bash
./tests/run_all_tests.sh
```

### Rekapitulasi Kelulusan Pengujian:
```text
========================================================================
   SIMRS RAWAT JALAN TERINTEGRASI — AUTOMATED TEST & VERIFICATION SUITE   
           PT Inova Medika Solusindo — Real Case Test                   
========================================================================

[STEP 1/3] Core Backend (PHP 8.x + Yii) & Concurrency Tests: 54 PASSED (0 FAILED)
[STEP 2/3] Supporting Backend (Node.js + Express) Test Matrix: 11 PASSED (0 FAILED)
[STEP 3/3] Frontend React SPA Production Build (TypeScript): 0 ERRORS, 0 WARNINGS

========================================================================
   🎉 ALL 65 AUTOMATED TESTS & PRODUCTION BUILDS PASSED SUCCESSFULLY!    
========================================================================
```

---

## 5. FITUR ANTARMUKA PENGGUNA (REACT VITE SPA)

Frontend dibangun dengan standar **Modern Healthcare Enterprise SaaS** mengintegrasikan 5 keahlian utama (*ui-ux-pro-max, impeccable, baseline-ui, framer-motion, antislop*):

| Modul Layanan | Rute Halaman | Fitur Utama |
| :--- | :--- | :--- |
| **Splash Screen** | `/splash` | Inisialisasi token, deteksi status sesi aman. |
| **Login Split-Screen** | `/login` | Panel ilustrasi medis, auto-fill peran dokter/pendaftaran/farmasi/kasir, proteksi brute-force. |
| **Dashboard Eksekutif** | `/dashboard` | 6 KPI Cards, Recharts AreaChart (Pendapatan) & BarChart (Kunjungan poli), worklist antrean. |
| **Pendaftaran Pasien** | `/registration` | Pencarian pasien, pemilihan poli/dokter, estimasi biaya, modal cetak tiket antrean thermal `A001`. |
| **Data Pasien** | `/patients` | Pencarian RM dinamis, tabel desktop & kartu responsif mobile, modal tambah pasien (NIK 16 digit). |
| **Antrean Rawat Jalan** | `/queue` | Filter poliklinik & status tab, aksi panggil/periksa, pembatalan dengan `AlertDialog`. |
| **Display TV Ruang Tunggu** | `/tv-queue` | Tampilan fullscreen TV antrean, font nomor besar `A001`, audio suara panggilan, marquee teks. |
| **RME Dokter (EMR)** | `/doctor/examination` | Banner alert alergi, SOAP terstruktur, tanda vital & BMI, ICD-10, tindakan, e-resep, order lab. |
| **Depo Farmasi** | `/pharmacy/prescriptions`| Worklist resep, indikator stok obat real-time, tombol serahkan obat dengan lock atomik. |
| **Laboratorium Klinis** | `/lab/orders` | Worklist order lab, form input parameter analis, pengiriman otomatis ke Node.js gateway. |
| **Kasir & Billing** | `/cashier/invoices` | Konsolidasi rincian tagihan, kalkulator kembalian, transaksi idempoten, cetak kuitansi berstempel "LUNAS". |
| **Riwayat Pasien** | `/patients/:id/history` | Kronologi rekam medis longitudinal: kunjungan lampau, SOAP, riwayat obat & hasil lab. |

---

## 6. PANDUAN MENJALANKAN SISTEM (DEMONSTRASI PENGUJI)

### Opsi A: Eksekusi Lokal (Native)

1. **Jalankan Pengujian Otomatis:**
   ```bash
   make simrs-test
   ```

2. **Jalankan Server Backend Yii (Port 8080):**
   ```bash
   make simrs-serve-backend
   ```

3. **Jalankan Server Node.js (Port 3001):**
   ```bash
   make simrs-serve-node
   ```

4. **Jalankan Frontend React (Port 5173):**
   ```bash
   make simrs-serve-frontend
   ```

Buka peramban di `http://localhost:5173`.

---

### Opsi B: Eksekusi via Docker Compose

```bash
docker compose up --build -d
```
Layanan akan aktif pada:
- Frontend: `http://localhost:5173`
- Backend Yii: `http://localhost:8000`
- Supporting Node.js: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

---

## 7. AKUN PENGGUNA UNTUK DEMO ROLE-BASED ACCESS CONTROL (RBAC)

| Peran (Role) | Username | Password | Modul Utama |
| :--- | :--- | :--- | :--- |
| **Dokter Spesialis** | `dr.budi` | `Password123!` | Antrean Pasien, Lembar SOAP, ICD-10, E-Resep, Order Lab |
| **Petugas Pendaftaran** | `petugas.pendaftaran` | `Password123!` | Data Pasien, Registrasi Poli, Cetak Tiket Antrean |
| **Petugas Farmasi** | `petugas.farmasi` | `Password123!` | Verifikasi Resep, Dispensing Obat, Potong Stok |
| **Petugas Kasir** | `petugas.kasir` | `Password123!` | Konsolidasi Tagihan, Pembayaran Idempoten, Cetak Kuitansi |
| **Administrator SIMRS** | `admin.simrs` | `Password123!` | Dashboard Analitik Eksekutif, Manajemen User & Master Data |

---

## 8. KESIMPULAN

Implementasi SIMRS Rawat Jalan Terintegrasi PT Inova Medika Solusindo telah **selesai secara menyeluruh** sesuai dengan seluruh kriteria yang ditetapkan dalam Master Prompt:
1. Menjaga integritas data medis dan transaksi finansial melalui ACID PostgreSQL.
2. Membuktikan ketahanan konkurensi pada 6 skenario kritis.
3. Menyediakan arsitektur clean monolith dengan supporting microservice yang efisien.
4. Memberikan pengalaman antarmuka pengguna (UI/UX) modern, profesional, dan responsif lintas perangkat.
