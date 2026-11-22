# 01 — Analisis Kebutuhan, Ruang Lingkup MVP, dan RBAC Matrix
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**

---

## 1. Analisis Kebutuhan Bisnis (Real Case Test)

Sistem Informasi Manajemen Rumah Sakit (SIMRS) Rawat Jalan Terintegrasi bertindak sebagai tulang punggung operasional klinis dan administratif pada unit rawat jalan (poliklinik). Sistem ini harus menjamin:
1. **Ketertiban Alur Pasien:** Menghilangkan antrean manual, tabrakan nomor urut poli, dan pendaftaran ganda pasien di poli dan hari yang sama.
2. **Kerahasiaan & Integritas Medis:** Rekam Medis Elektronik (RME) yang mematuhi standar SOAP (Subjective, Objective, Assessment, Plan) dan ICD-10 dengan riwayat revisi yang tidak dapat dihapus (*immutable audit log*).
3. **Akurasi Stok Farmasi:** Mencegah persediaan obat bernilai negatif akibat dispensing yang terjadi secara paralel pada jam sibuk.
4. **Keamanan Finansial (Billing):** Menghilangkan risiko selisih kas, pembayaran ganda akibat gangguan koneksi jaringan kasir, dan perubahan tagihan tanpa otorisasi.
5. **Kesiapan Integrasi:** Memfasilitasi penerimaan hasil laboratorium dari alat/laboratorium eksternal secara asinkron tanpa membebani transaksi inti rumah sakit.

---

## 2. Alur Pasien End-to-End (Hospital Service Journey)

Alur proses pelayanan rawat jalan terdiri dari 9 tahapan berurutan:

```
[1. KEDATANGAN & PENDAFTARAN]
       │  Petugas mencari pasien (NIK/No. RM) atau mendaftarkan pasien baru.
       │  Memilih Poliklinik, Dokter, dan Jadwal Praktik.
       ▼
[2. GENERASI ANTREAN OTOMATIS]
       │  Sistem mengalokasikan nomor antrean atomik (misal: A001, B002).
       │  Kunjungan berstatus 'WAITING' atau 'REGISTERED'. Pasien menuju ruang tunggu.
       ▼
[3. PEMANGGILAN & PEMERIKSAAN DOKTER]
       │  Dokter memulai pemeriksaan (Status ➔ 'IN_EXAMINATION').
       │  Input Anamnesis, Keluhan Utama, Tanda Vital (TD, Nadi, Suhu, RR, BB, TB), Pemeriksaan Fisik.
       ▼
[4. DIAGNOSIS & TINDAKAN MEDIS]
       │  Dokter memilih Diagnosis Utama (Primary ICD-10) dan Diagnosis Sekunder.
       │  Menambahkan Tindakan Medis (tarif ter-snapshot secara permanen).
       ▼
[5. PENUNJANG & TERAPI]
       ├───► [Jalur A: Resep Obat] ──► Farmasi memverifikasi resep, stok divalidasi.
       │                               Obat diserahkan (Dispensed) ➔ Stok dipotong atomik.
       │
       └───► [Jalur B: Permintaan Lab] ─► Petugas Lab memeriksa sampel, input hasil & referensi.
                                         Hasil difinalisasi ➔ Dokter dapat melihat via EMR.
       ▼
[6. KONSOLIDASI TAGIHAN (BILLING GENERATION)]
       │  Sistem mengagregasi biaya pendaftaran + tindakan dokter + obat + tes lab.
       │  Status kunjungan ➔ 'READY_FOR_BILLING'. Invoice snapshot terbentuk ('UNPAID').
       ▼
[7. KASIR & PEMBAYARAN]
       │  Kasir memverifikasi rincian tagihan invoice.
       │  Menerima pembayaran (Tunai / Non-Tunai / Bertahap) dengan Idempotency Protection.
       ▼
[8. CETAK DOKUMEN & INVOICE]
       │  Invoice difinalisasi ('PAID'). Kasir mencetak kuitansi resmi & invoice rincian.
       ▼
[9. PENYELESAIAN & RIWAYAT KUNJUNGAN]
       │  Status kunjungan ➔ 'COMPLETED'.
       │  Rekam medis dan riwayat transaksi tersimpan permanen di medical record history.
```

---

## 3. Matriks Peran & Otorisasi Pengguna (Role-Based Access Control / RBAC)

Aplikasi memiliki **6 Peran Pengguna (Roles)** dengan segregasi tugas (*Separation of Duties*) yang ketat:

| Modul / Fitur | Administrator | Petugas Pendaftaran | Dokter | Petugas Farmasi | Petugas Lab | Kasir |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Manajemen User & Hak Akses** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Master Data (Poli, Dokter, Jadwal)** | ✅ CRUD | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ Read |
| **Master Pasien** | ✅ CRUD | ✅ CRUD | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ Read |
| **Master Tindakan Medis & Tarif** | ✅ CRUD | ❌ | 👁️ Read | ❌ | ❌ | 👁️ Read |
| **Master Obat & Harga** | ✅ CRUD | ❌ | 👁️ Read | ✅ CRUD | ❌ | 👁️ Read |
| **Master Tes Lab & Nilai Normal** | ✅ CRUD | ❌ | 👁️ Read | ❌ | ✅ CRUD | 👁️ Read |
| **Pendaftaran Kunjungan & Antrean** | 👁️ Read | ✅ CRUD | 👁️ Read | ❌ | ❌ | ❌ |
| **Pemeriksaan EMR / SOAP / ICD-10** | ❌ | ❌ | ✅ Write/Edit | ❌ | ❌ | ❌ |
| **Pencatatan Tindakan Medis Kunjungan**| ❌ | ❌ | ✅ Create | ❌ | ❌ | ❌ |
| **Pembuatan Resep Obat** | ❌ | ❌ | ✅ Create | ❌ | ❌ | ❌ |
| **Verifikasi & Penyerahan Obat (Dispense)**| ❌ | ❌ | ❌ | ✅ Process/Dispense | ❌ | ❌ |
| **Mutasi & Penyesuaian Stok Obat** | ❌ | ❌ | ❌ | ✅ Adjust | ❌ | ❌ |
| **Permintaan Pemeriksaan Lab (Order)** | ❌ | ❌ | ✅ Create | ❌ | ❌ | ❌ |
| **Input & Finalisasi Hasil Lab** | ❌ | ❌ | ❌ | ❌ | ✅ Finalize | ❌ |
| **Lihat Invoice & Rincian Tagihan** | 👁️ Read | ❌ | ❌ | ❌ | ❌ | ✅ Read |
| **Proses Pembayaran (Kasir)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Pay/Settle |
| **Cetak Invoice & Kuitansi** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Print |
| **Dashboard Eksekutif & Pelaporan** | ✅ View All | ❌ | 👁️ Poli Sendiri | 👁️ Farmasi | 👁️ Lab | 👁️ Finansial |
| **Audit Log Trail** | ✅ View All | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Batasan Ruang Lingkup MVP (72 Jam Time-Box)

Untuk menjamin sistem yang **runnable, robust, dan production-minded** dalam waktu 72 jam, lingkup fitur dibagi menggunakan prinsip prioritas MoSCoW:

### A. Wajib Dikerjakan (Must-Have in MVP)
1. **Autentikasi & RBAC:** Login JWT, otentikasi stateless, 6 peran pengguna, rute frontend dan endpoint backend terlindungi.
2. **Master Data:** Pasien (Nomor RM otomatis/manual unik, NIK unik), Tenaga Medis/Dokter, Poliklinik, Jadwal Dokter, Tindakan Medis & Tarif, Obat & Stok Awal, Tes Laboratorium.
3. **Pendaftaran Pasien & Antrean:**
   - Validasi dokter sesuai poli & jadwal.
   - Alokasi nomor antrean atomik (*Queue Counter table*).
   - Pencegahan pendaftaran ganda (1 kunjungan aktif per pasien, poli, dan tanggal).
4. **Pemeriksaan Dokter (EMR):** Input SOAP, Vital Signs, Diagnosis ICD-10 (1 utama, n sekunder), input tindakan medis dengan snapshot tarif.
5. **Farmasi & Resep:** Input resep dokter, verifikasi stok, penyerahan obat (dispense) dengan lock PostgreSQL (`SELECT FOR UPDATE`), pemotongan stok atomik, dan pencatatan riwayat kartu stok (*stock_movements*).
6. **Laboratorium:** Order tes lab oleh dokter, input hasil dan nilai rujukan oleh analis, verifikasi hasil, integrasi asinkron via Node.js REST API.
7. **Billing & Kasir:** Konsolidasi seluruh item tagihan, snapshot tarif `invoice_items`, pembayaran kasir dengan `idempotency_key`, dukungan pembayaran bertahap (partial), pelunasan (paid), status tagihan real-time.
8. **Cetak Dokumen:** Cetak nomor antrean, resume medis ringkas, invoice tagihan, dan kuitansi pembayaran (print-friendly format).
9. **Dashboard Agregasi:** Statistik kunjungan, pendapatan, kunjungan per poli, dan stok kritis (disediakan oleh Node.js via query SQL read-only).
10. **Pengujian Otomatis:** Unit/integration test untuk 6 kasus kritis.

### B. Bukan Prioritas MVP 72 Jam (Out of Scope / Won't-Have)
- Integrasi klaim BPJS VClaim / bridging SatuSehat Kemenkes (disediakan skema integrasi outbox/inbox yang siap pakai di masa depan).
- Modul Rawat Inap (Ranap) dan Instalasi Gawat Darurat (IGD).
- Manajemen pengadaan dan Purchase Order (PO) farmasi ke supplier (hanya mutasi internal & stok opname sederhana).
- Sistem akuntansi double-entry (Jurnal Umum, Buku Besar, Neraca) — digantikan oleh Rekapitulasi Kas & Piutang Rawat Jalan.

---

## 5. Kriteria Keberhasilan (Acceptance Criteria)

1. **Integritas Alur:** Seorang pasien baru dapat didaftarkan, diperiksa dokter, diberikan resep dan tindakan, ditebus obatnya di apotek, dibayar di kasir, hingga mencetak invoice tanpa kegagalan data atau putus alur.
2. **Zero Concurrency Defect:**
   - Dua request pendaftaran identik secara bersamaan menghasilkan 1 sukses (201) dan 1 ditolak (409 Conflict).
   - Dua kasir memproses pembayaran dengan idempotency key sama menghasilkan tepat 1 transaksi finansial tercatat di database.
   - Dua dispense obat pada sisa stok yang minim tidak pernah membuat stok bernilai negatif.
3. **Immutability of Financial Data:** Perubahan tarif pada master data tidak mempengaruhi riwayat invoice pasien terdahulu (*historical price snapshot integrity*).
4. **Performance:** Respon API rata-rata di bawah 200ms pada beban standar; tidak ada N+1 query pada pemuatan antrean dan riwayat medis.
