# Entity-Relationship Diagram (ERD) & Kamus Data SIMRS
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**

---

## 1. Diagram Relasi Entitas (Mermaid ERD)

```mermaid
erDiagram
    %% Master & Keamanan RBAC
    ROLES ||--o{ USERS : "assigned_to"
    USERS ||--o| MEDICAL_STAFF : "identifies"
    POLYCLINICS ||--o{ MEDICAL_STAFF : "assigned_polyclinic"
    MEDICAL_STAFF ||--o{ DOCTOR_SCHEDULES : "has_schedules"
    POLYCLINICS ||--o{ DOCTOR_SCHEDULES : "hosts_schedule"
    
    %% Registrasi & Antrean Rawat Jalan
    PATIENTS ||--o{ VISITS : "registers"
    POLYCLINICS ||--o{ VISITS : "destination_poly"
    MEDICAL_STAFF ||--o{ VISITS : "attending_doctor"
    DOCTOR_SCHEDULES ||--o{ VISITS : "slot_schedule"
    POLYCLINICS ||--o{ QUEUE_COUNTERS : "counter_tracked_by"

    %% Rekam Medis (EMR/SOAP) & Tindakan
    VISITS ||--o| MEDICAL_RECORDS : "documents_encounter"
    MEDICAL_RECORDS ||--o{ MEDICAL_RECORD_REVISIONS : "tracks_revisions"
    VISITS ||--o{ VISIT_DIAGNOSES : "has_diagnoses"
    DIAGNOSES ||--o{ VISIT_DIAGNOSES : "coded_as"
    VISITS ||--o{ VISIT_PROCEDURES : "undergoes_procedures"
    MEDICAL_PROCEDURES ||--o{ VISIT_PROCEDURES : "catalog_procedure"

    %% Pelayanan Farmasi & Obat
    VISITS ||--o{ PRESCRIPTIONS : "ordered_in_visit"
    PRESCRIPTIONS ||--o{ PRESCRIPTION_ITEMS : "contains_items"
    MEDICINES ||--o{ PRESCRIPTION_ITEMS : "prescribes_medicine"
    MEDICINES ||--|| MEDICINE_STOCKS : "current_stock_of"
    MEDICINES ||--o{ STOCK_MOVEMENTS : "audited_by"
    PRESCRIPTIONS ||--o| MEDICINE_DISPENSATIONS : "dispensed_as"

    %% Pelayanan Laboratorium
    VISITS ||--o{ LAB_ORDERS : "requests_tests"
    LAB_ORDERS ||--o{ LAB_ORDER_ITEMS : "includes"
    LAB_TESTS ||--o{ LAB_ORDER_ITEMS : "tests_catalog"
    LAB_ORDER_ITEMS ||--o| LAB_RESULTS : "yields_result"

    %% Kasir, Billing & Penyesuaian Tagihan
    VISITS ||--o| INVOICES : "billed_as"
    PATIENTS ||--o{ INVOICES : "billed_to"
    INVOICES ||--o{ INVOICE_ITEMS : "itemized_into"
    INVOICES ||--o{ PAYMENTS : "settled_by"
    INVOICES ||--o{ INVOICE_ADJUSTMENTS : "adjusted_by"

    %% Kepatuhan & Integrasi
    VISITS ||--o{ SATUSEHAT_LOGS : "fhir_synced_in"
    USERS ||--o{ AUDIT_LOGS : "performed_by"

    %% Struktur Entitas Utama
    USERS {
        uuid id PK
        varchar username UK
        varchar password_hash
        varchar role_code FK
        varchar full_name
        boolean is_active
    }
    PATIENTS {
        uuid id PK
        varchar mr_number UK
        varchar nik UK
        varchar full_name
        varchar gender
        date birth_date
        text address
        varchar phone
    }
    POLYCLINICS {
        uuid id PK
        varchar code UK
        varchar name
        char queue_prefix
        varchar location
        varchar status
    }
    MEDICAL_STAFF {
        uuid id PK
        uuid user_id FK
        uuid polyclinic_id FK
        varchar full_name
        varchar staff_type
        varchar specialization
        varchar sip_number UK
    }
    DOCTOR_SCHEDULES {
        uuid id PK
        uuid doctor_id FK
        uuid polyclinic_id FK
        int day_of_week
        time start_time
        time end_time
        int quota
    }
    VISITS {
        uuid id PK
        varchar visit_number UK
        uuid patient_id FK
        uuid polyclinic_id FK
        uuid doctor_id FK
        date visit_date
        int queue_number
        varchar queue_display
        varchar status
    }
    MEDICAL_RECORDS {
        uuid id PK
        uuid visit_id FK
        text chief_complaint
        text anamnesis
        text physical_examination
        jsonb vital_signs
        text plan
        varchar status
    }
    INVOICES {
        uuid id PK
        varchar invoice_number UK
        uuid visit_id FK
        uuid patient_id FK
        numeric total_amount
        numeric paid_amount
        numeric outstanding_balance
        varchar status
    }
    PAYMENTS {
        uuid id PK
        varchar payment_number UK
        uuid invoice_id FK
        varchar idempotency_key UK
        numeric amount
        numeric cash_received
        numeric change_amount
        varchar payment_method
        varchar payment_status
    }
```

---

## 2. Kamus Data & Spesifikasi Tabel (Data Dictionary)

### A. Domain Keamanan & Pengguna (RBAC)
1. **`roles`**: Master peran pengguna sistem (`ADMIN`, `DOCTOR`, `NURSE`, `PHARMACIST`, `CASHIER`).
2. **`users`**: Akun pengguna terotentikasi bcrypt dengan kaitan peran RBAC dan audit trail.
3. **`audit_logs`**: Log audit tak terhapuskan (*append-only / immutable*) sesuai standar Permenkes No. 24/2022 tentang Rekam Medis.

### B. Domain Master Data Klinis & Sarana
4. **`polyclinics`**: Unit poliklinik rawat jalan (Penyakit Dalam, Anak, Gigi, Kandungan, Mata, Bedah Umum) beserta prefix antrean (`A`, `B`, `C`, `D`, `E`, `F`).
5. **`medical_staff`**: Data dokter spesialis dan staf klinis dengan No. SIP resmi Kemenkes.
6. **`doctor_schedules`**: Jadwal praktik dokter (hari 1–7, jam mulai–selesai, dan kuota pasien).
7. **`patients`**: Identitas demografis pasien dengan Nomor Rekam Medis otomatis (`RM-YYYYMM-XXXXX`) dan NIK 16 digit terindeks unik.

### C. Domain Pendaftaran & Manajemen Antrean
8. **`visits`**: Kunjungan rawat jalan pasien dengan siklus status `REGISTERED` ➔ `WAITING` ➔ `IN_EXAMINATION` ➔ `WAITING_LAB` / `WAITING_PHARMACY` ➔ `READY_FOR_BILLING` ➔ `COMPLETED`.
   - Dilindungi *PostgreSQL Partial Unique Index*: `CREATE UNIQUE INDEX visits_active_daily_unique_idx ON visits(patient_id, polyclinic_id, visit_date) WHERE status NOT IN ('COMPLETED', 'CANCELLED')`.
9. **`queue_counters`**: Pencatat urutan counter nomor antrean harian per poliklinik secara atomik.

### D. Domain Rekam Medis Elektronik (RME / EMR)
10. **`medical_records`**: Catatan medis SOAP (Subjektif, Objektif, Asesmen, Plan) dengan tanda-tanda vital format JSONB.
11. **`diagnoses`**: Katalog diagnosis penyakit standar WHO ICD-10 (Kode, Deskripsi Bahasa Indonesia & Inggris).
12. **`visit_diagnoses`**: Diagnosis pasien pada kunjungan (ditandai `PRIMARY` atau `SECONDARY`).
13. **`medical_procedures`**: Katalog master tindakan klinis dan tarif dasar.
14. **`visit_procedures`**: Tindakan medis yang diberikan kepada pasien dengan **snapshot tarif terjamin** (`snapshot_price` bersifat *immutable* dari perubahan master harga di kemudian hari).

### E. Domain Farmasi & Pengendalian Persediaan
15. **`medicines`**: Katalog obat, sediaan, dosis, dan batas minimum stok peringatan.
16. **`medicine_stocks`**: Stok obat terkini di depo farmasi rawat jalan.
17. **`stock_movements`**: Kartu stok elektronik yang mencatat riwayat mutasi masuk/keluar secara atomik.
18. **`prescriptions`**: Lembar resep elektronik yang diterbitkan oleh dokter DPJP.
19. **`prescription_items`**: Rincian obat, aturan pakai, dosis, dan kuantitas.
20. **`medicine_dispensations`**: Verifikasi penyerahan obat oleh apoteker dengan row-level lock `FOR UPDATE` untuk mencegah *overselling*.

### F. Domain Laboratorium & Integrasi Alat
21. **`lab_tests`**: Katalog pemeriksaan laboratorium (Darah Lengkap, Glukosa, Kolesterol, dsb.) beserta nilai rujukan.
22. **`lab_orders`**: Formulir permintaan laboratorium oleh dokter DPJP.
23. **`lab_order_items`**: Parameter uji yang dipesan dalam satu order laboratorium.
24. **`lab_results`**: Hasil pembacaan alat analyzer yang masuk via Node.js Gateway dengan proteksi `X-Internal-Secret` dan `idempotency_key`.

### G. Domain Kasir, Billing & Penyesuaian Tagihan
25. **`invoices`**: Konsolidasi seluruh pos biaya pasien (karcis registrasi, tindakan medis, farmasi, lab) dengan kalkulasi otomatis `total_amount`, `paid_amount`, dan `outstanding_balance`.
26. **`invoice_items`**: Rincian snapshot per pos pelayanan yang tercetak di lembar kuitansi.
27. **`payments`**: Transaksi pembayaran kasir (Metode: `CASH`, `QRIS`, `DEBIT_CARD`, `BANK_TRANSFER`).
    - Mendukung `cash_received` (uang tunai diserahkan) dan `change_amount` (uang kembalian).
    - Dilindungi oleh constraint `idempotency_key UNIQUE` untuk menjamin *zero double billing*.
28. **`invoice_adjustments`**: Riwayat penyesuaian/diskon tagihan (`ADDITION`, `DEDUCTION`, `CANCELLATION`) dengan alasan wajib dan jejak audit supervisor kasir.

### H. Domain Integrasi Nasional
29. **`satusehat_logs`**: Log sinkronisasi FHIR R4 Kemenkes RI (Encounter ID, Condition ID, status kirim).
30. **`bpjs_sep`**: Rekam penerbitan Surat Eligibilitas Peserta (SEP) terintegrasi BPJS VClaim.

---

## 3. Aturan Integritas & Konkurensi Sistem
- **ACID Transactions**: Setiap mutasi stok obat dan pembayaran kasir dibungkus dalam blok `BEGIN ... COMMIT` dengan penanganan rollback otomatis pada kegagalan.
- **Pessimistic Row Locking (`FOR UPDATE`)**: Diterapkan saat pelunasan invoice dan dispensing obat untuk mencegah pembacaan data kadaluarsa (*stale reads*).
- **Audit Trail Immutability**: Seluruh operasi penulisan pada data sensitif pasien dicatat otomatis ke tabel `audit_logs` tanpa opsi modifikasi/penghapusan.
