# Panduan Demonstrasi Eksekutif & Walkthrough Penguji (10 Menit)
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**  
*Posisi: Senior Programmer / Technical Lead*

---

## ⏱️ Alur Demonstrasi 10 Menit (*Live Demonstration Script*)

Dokumen ini disusun sebagai panduan praktis presentasi interaktif di hadapan Dewan Penguji PT Inova Medika Solusindo.

```
[00:00 - 02:00] 1. Arsitektur, Skema PostgreSQL 17, & Isolasi Hak Akses Read-Only
       │
[02:00 - 04:00] 2. Pendaftaran Pasien, BPJS VClaim SEP Otomatis, & TV Antrean Publik
       │
[04:00 - 06:00] 3. RME Dokter (SOAP), ICD-10, Snapshot Tarif, & SATUSEHAT FHIR R4 / Resume Medis
       │
[06:00 - 07:30] 4. Farmasi Dispensing (SELECT FOR UPDATE) & Node.js Lab Webhook Gateway
       │
[07:30 - 08:30] 5. Kasir Idempoten, Anti-Double Charge, & Penyesuaian Tagihan (Kasus 4)
       │
[08:30 - 09:15] 6. Laporan RL 5.3 Kemenkes RI & Permenkes 24/2022 Audit Trail Diff
       │
[09:15 - 10:00] 7. Eksekusi CI/CD Pipeline (185 Checkpoints) & Penyerahan Paket
```

---

### Menit 00:00 — 02:00: Arsitektur & Isolasi Basis Data
1. Buka terminal dan jelaskan struktur monorepo:
   - **Core Backend:** PHP 8.4 + modern Yii Framework (*Single Source of Truth*, transaksi ACID, RBAC).
   - **Supporting Backend:** Node.js 22 LTS + Express.js + Zod validation (Lab gateway & *read-only* aggregator).
   - **Frontend Client:** React 18 + Vite (TypeScript) SPA, Tailwind CSS, Recharts.
2. Tunjukkan isolasi hak akses database:
   - Jalankan `make simrs-health` di terminal.
   - Sorot pengujian: Pengguna `simrs_dashboard_ro` dapat melakukan `SELECT` untuk laporan eksekutif, namun **ditolak seketika oleh PostgreSQL** jika mencoba `INSERT`/`UPDATE` (*Error 42501 Permission Denied*).

---

### Menit 02:00 — 04:00: Pendaftaran Pasien, BPJS VClaim, & TV Antrean
1. Buka peramban ke `http://localhost:5173`.
2. Login sebagai `petugas.pendaftaran` (klik tombol auto-fill).
3. Masuk ke menu **Pendaftaran Pasien**:
   - Pilih pasien yang tersedia atau daftarkan pasien baru.
   - Pilih penjamin **BPJS Kesehatan**.
   - Klik **Cek & Terbitkan SEP BPJS** ➔ Sistem memanggil stub BPJS VClaim 2.0 dan menerbitkan nomor SEP resmi (`0101R001...`).
   - Klik **Proses Pendaftaran & Cetak Tiket** ➔ Tiket antrean termal diterbitkan (`A001`).
4. Buka tab baru ke `http://localhost:5173/tv-queue`:
   - Tunjukkan nomor antrean aktif muncul di poliklinik terkait pada layar display TV ruang tunggu dengan simulator panggilan suara.

---

### Menit 04:00 — 06:00: RME Dokter (SOAP), SATUSEHAT FHIR R4, & Resume Medis
1. Ganti login sebagai `dr.budi` (Dokter Spesialis Penyakit Dalam).
2. Masuk ke menu **Pemeriksaan Dokter (EMR)**:
   - Klik **Periksa Pasien** pada antrean aktif.
   - Tunjukkan perhitungan otomatis IMT/BMI saat mengisi Berat Badan & Tinggi Badan.
   - Masukkan Anamnesis & Keluhan Utama.
   - Pilih Diagnosis Primer: `I10 - Essential (primary) hypertension`.
   - Pilih Tindakan Medis: Konsultasi Spesialis (tunjukkan tarif ter-*snapshot* permanen).
   - Buat E-Resep: Amlodipine 10 mg (10 tablet).
   - Buat Permintaan Lab: Glukosa Darah Sewaktu (GDS).
   - Klik **Simpan Rekam Medis (SOAP)**.
3. Klik tombol **Resume Medis**:
   - Tampilkan berkas Ringkasan Pulang Rawat Jalan standar akreditasi KARS/STARKES format A4 dengan verifikasi QR digital signature hash DPJP.
4. Klik tombol **SATUSEHAT FHIR**:
   - Tampilkan bundle HL7 FHIR R4 Kemenkes RI yang terekstraksi otomatis (Patient, Encounter, Condition, Observation, MedicationRequest).
   - Klik **Kirim ke SATUSEHAT** ➔ Sistem menghasilkan IHS Encounter ID dan mencatat log transmisi ke `satusehat_logs`.

---

### Menit 06:00 — 07:30: Farmasi Dispensing (SELECT FOR UPDATE) & Lab Gateway
1. Login sebagai `petugas.farmasi`.
2. Buka menu **Daftar Resep Farmasi**:
   - Tunjukkan status stok obat real-time.
   - Klik tombol **Verifikasi & Serahkan Obat** ➔ Jelaskan penerapan *pessimistic row lock* `SELECT FOR UPDATE` pada PostgreSQL yang mencegah stok minus di tengah lonjakan pesanan serentak.
3. Buka menu **Permintaan Uji Lab** (Login `petugas.lab`):
   - Masukkan nilai hasil uji analyzer (misal: GDS = 115 mg/dL).
   - Simpan hasil ➔ Payload dikirim melalui Node.js Lab Webhook Gateway dengan validasi Zod dan *retry exponential backoff*.

---

### Menit 07:30 — 08:30: Kasir Billing Idempoten & Penyesuaian Biaya (Kasus Kritis 4)
1. Login sebagai `kasir`.
2. Buka menu **Kasir & Billing**:
   - Pilih pasien ➔ Tagihan terkonsolidasi otomatis dari registrasi, tindakan medis, lab, dan obat.
3. Demonstrasikan **Kasus Kritis 4 (Invoice Adjustments)**:
   - Klik tombol **`+ Koreksi / Diskon`**.
   - Masukkan Diskon Direksi Rp 25.000 dengan alasan tertulis ➔ Sisa tagihan berkurang secara atomik dan nomor versi invoice naik menjadi `Versi 2`.
4. Lakukan pembayaran:
   - Pilih metode bayar `QRIS` atau `CASH`.
   - Masukkan nominal pembayaran ➔ Kalkulator kembalian menghitung otomatis.
   - Klik **Proses Pembayaran** ➔ Transaksi terproteksi oleh `X-Idempotency-Key` sehingga klik berulang / gangguan jaringan tidak menduplikasi tagihan.
   - Tampilkan kuitansi resmi rumah sakit dengan rincian biaya yang sah.

---

### Menit 08:30 — 09:15: Pelaporan RL 5.3 & Audit Trail Permenkes 24/2022
1. Masuk ke menu **Laporan & Rekonsiliasi** (`/reports`):
   - Tunjukkan laporan **10 Besar Penyakit Morbiditas (Form RL 5.3 Kemenkes RI)** dengan visualisasi Recharts horizontal bar ranking dan pemisahan kasus laki-laki vs perempuan.
   - Tunjukkan laporan **Rekonsiliasi Kasir**: rincian pendapatan terpilah per metode bayar (CASH, QRIS, DEBIT, TRANSFER).
2. Masuk ke menu **Audit Trail** (`/audit-logs`):
   - Tunjukkan status kepatuhan Permenkes RI No. 24/2022 (*100% Compliant*).
   - Klik tombol **`Lihat Data`** pada salah satu catatan mutasi ➔ Tampilkan modal viewer perbandingan *Previous State* (merah) vs *New State* (hijau) format JSON yang tidak dapat dimanipulasi.

---

### Menit 09:15 — 10:00: Otomasi CI/CD & Penyerahan Paket
1. Kembali ke terminal dan jalankan:
   ```bash
   make simrs-ci
   ```
   - Tunjukkan seluruh **185 Checkpoints** (12 Health + 7 DR + 145 Unit/Integration Tests + 21 E2E Stages) berstatus `[PASS]` 100%.
2. Tunjukkan menu kendali terminal interaktif:
   ```bash
   make simrs-demo
   ```
3. Tunjukkan berkas paket deliverable final yang siap dikirimkan kepada tim penguji:
   - `dist/simrs-inovamedika-deliverable.tar.gz`
   - Dokumentasi Swagger UI: `http://127.0.0.1:8080/docs/`
   - Spesifikasi OpenAPI 3.0: `public/openapi.yaml`
   - Postman Collection: `postman/SIMRS_Collection.json`
