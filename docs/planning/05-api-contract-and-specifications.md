# 05 — Standarisasi Kontrak API dan Spesifikasi Endpoint
**SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo**

---

## 1. Standar Format Respons JSON

Seluruh API, baik yang disajikan oleh **Yii Core Backend** maupun **Node.js Supporting Service**, wajib mematuhi amplop respons (*response envelope*) standar berikut:

### 1.1 Format Respons Berhasil (Success Envelope)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "timestamp": "2026-11-22T10:00:00Z",
    "version": "1.0.0"
  }
}
```

Untuk data berupa daftar dengan pagination:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [],
  "meta": {
    "pagination": {
      "total_count": 125,
      "page_count": 13,
      "current_page": 1,
      "page_size": 10
    }
  }
}
```

### 1.2 Format Respons Gagal / Validasi (Error Envelope)
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "patient_id": ["Pasien tidak ditemukan."],
    "schedule_id": ["Jadwal dokter tidak aktif pada hari ini."]
  }
}
```

### 1.3 Pemetaan Kode Status HTTP (HTTP Status Mapping)
- `200 OK`: Pengambilan data, pembaruan sukses, atau idempoten duplicate response.
- `201 Created`: Pembuatan resource baru berhasil (Pasien, Kunjungan, Resep, Pembayaran).
- `400 Bad Request`: Format JSON rusak atau parameter query tidak valid.
- `401 Unauthorized`: Token JWT tidak valid, tidak disertakan, atau sudah kedaluwarsa.
- `403 Forbidden`: Pengguna tidak memiliki peran yang diizinkan (RBAC violation).
- `404 Not Found`: Entitas ID tidak ditemukan di database.
- `409 Conflict`: Benturan integritas data (misal: pendaftaran ganda di poli yang sama).
- `422 Unprocessable Entity`: Kegagalan validasi form / domain logic error (misal: stok obat kurang).
- `500 Internal Server Error`: Kesalahan server internal atau uncaught database exception.
- `503 Service Unavailable`: Layanan pendukung atau database tidak dapat dijangkau.

---

## 2. Katalog Endpoint REST API (Yii Core Backend)

### 2.1 Modul 1: Authentication & RBAC

#### `POST /api/v1/auth/login`
- **Otorisasi:** Public
- **Request Body:**
  ```json
  {
    "username": "dr.budi",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh_token": "def456...",
      "expires_in": 28800,
      "user": {
        "id": "c1f7a8b4-...",
        "username": "dr.budi",
        "full_name": "dr. Budi Santoso, Sp.PD",
        "role": "DOCTOR",
        "medical_staff_id": "89b7d2...",
        "polyclinic_id": "e2a4b1..."
      }
    }
  }
  ```

#### `GET /api/v1/auth/me`
- **Otorisasi:** Bearer Token (Semua Role)
- **Response (200 OK):** Mengembalikan profil user aktif dan daftar permission.

#### `POST /api/v1/auth/logout`
- **Otorisasi:** Bearer Token (Semua Role)

---

### 2.2 Modul 2: Master Data

| Method | Endpoint URL | Role Otorisasi | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/patients` | Admin, Pendaftaran, Dokter | Cari pasien (Query: `search`, `page`, `limit`) |
| `POST` | `/api/v1/patients` | Admin, Pendaftaran | Buat data pasien baru (Auto MR Number) |
| `GET` | `/api/v1/patients/:id` | Admin, Pendaftaran, Dokter | Detail pasien & riwayat kunjungan |
| `PUT` | `/api/v1/patients/:id` | Admin, Pendaftaran | Update profil pasien |
| `GET` | `/api/v1/polyclinics` | Semua Role | List poliklinik aktif |
| `GET` | `/api/v1/medical-staff` | Semua Role | List dokter & tenaga medis per poli |
| `GET` | `/api/v1/doctor-schedules` | Semua Role | Filter jadwal berdasarkan `polyclinic_id` & `day` |
| `GET` | `/api/v1/medical-procedures`| Semua Role | Katalog tindakan medis & tarif |
| `GET` | `/api/v1/medicines` | Semua Role | Katalog obat, stok aktual, & harga |
| `GET` | `/api/v1/lab-tests` | Semua Role | Katalog uji laboratorium & harga |

---

### 2.3 Modul 3: Pendaftaran Kunjungan & Antrean

#### `POST /api/v1/visits`
- **Otorisasi:** Admin, Petugas Pendaftaran
- **Request Body:**
  ```json
  {
    "patient_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "polyclinic_id": "4a7c8e9d-...",
    "doctor_id": "5b8d9e0f-...",
    "schedule_id": "6c9e0f1a-...",
    "visit_date": "2026-11-22"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Pendaftaran kunjungan berhasil",
    "data": {
      "visit_id": "7d0f1a2b-...",
      "visit_number": "REG-20261122-0001",
      "patient_name": "Siti Rahmawati",
      "mr_number": "RM-202611-00123",
      "polyclinic_name": "Poli Penyakit Dalam",
      "doctor_name": "dr. Budi Santoso, Sp.PD",
      "queue_number": 1,
      "queue_display": "A001",
      "status": "WAITING",
      "visit_date": "2026-11-22"
    }
  }
  ```
- **Response (409 Conflict):** Jika pendaftaran duplikat di hari yang sama terdeteksi.

#### `GET /api/v1/visits`
- **Otorisasi:** Admin, Pendaftaran, Dokter, Kasir
- **Query Params:** `date`, `polyclinic_id`, `status`, `doctor_id`, `page`, `limit`

#### `PATCH /api/v1/visits/:id/status`
- **Otorisasi:** Petugas Berwenang (Sesuai FSM)
- **Request Body:**
  ```json
  {
    "status": "IN_EXAMINATION",
    "cancel_reason": null
  }
  ```

---

### 2.4 Modul 4: Pemeriksaan Medis (EMR) & Diagnosis

#### `POST /api/v1/medical-records`
- **Otorisasi:** Dokter
- **Request Body:**
  ```json
  {
    "visit_id": "7d0f1a2b-...",
    "chief_complaint": "Demam tinggi sejak 3 hari yang lalu disertai sakit kepala hebat",
    "anamnesis": "Pasien mengeluhkan demam naik turun, mual (+), muntah 1x tadi pagi.",
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "heart_rate": 88,
    "respiratory_rate": 20,
    "temperature": 38.5,
    "weight": 62.0,
    "height": 168.0,
    "physical_examination": "Mata konjungtiva anemis (-), sklera ikterik (-). Abdomen supel, nyeri tekan epigastrium (+).",
    "doctor_notes": "Curiga infeksi virus / DHF. Periksa lab darah lengkap.",
    "diagnoses": [
      { "diagnosis_id": "uuid-icd10-a90", "type": "PRIMARY", "notes": "Dengue Fever" },
      { "diagnosis_id": "uuid-icd10-k29", "type": "SECONDARY", "notes": "Gastritis Akut" }
    ]
  }
  ```

#### `GET /api/v1/medical-records/visit/:visitId`
- **Otorisasi:** Dokter, Admin
- **Response (200 OK):** Mengembalikan data SOAP lengkap, diagnosis, dan riwayat revisi.

---

### 2.5 Modul 5: Tindakan Medis

#### `POST /api/v1/visits/:id/procedures`
- **Otorisasi:** Dokter
- **Request Body:**
  ```json
  {
    "procedure_id": "uuid-proc-ekg",
    "quantity": 1
  }
  ```
- **Keterangan:** Sistem secara otomatis mengambil `base_price` dari master saat itu dan menyimpannya sebagai `snapshot_price`.

---

### 2.6 Modul 6: Farmasi & Resep Obat

#### `POST /api/v1/prescriptions`
- **Otorisasi:** Dokter
- **Request Body:**
  ```json
  {
    "visit_id": "7d0f1a2b-...",
    "notes": "Minum obat sesudah makan",
    "items": [
      {
        "medicine_id": "uuid-med-paracetamol",
        "dosage": "500 mg",
        "frequency": "3x1 sehari",
        "quantity": 10,
        "instructions": "Jika demam"
      }
    ]
  }
  ```

#### `POST /api/v1/prescriptions/:id/dispense`
- **Otorisasi:** Petugas Farmasi
- **Request Body:**
  ```json
  {
    "notes": "Edukasi cara minum obat telah disampaikan kepada pasien"
  }
  ```
- **Keterangan:** Mengeksekusi database transaction dengan row lock `SELECT FOR UPDATE` pada `medicine_stocks`.

---

### 2.7 Modul 7: Laboratorium

#### `POST /api/v1/lab-orders`
- **Otorisasi:** Dokter
- **Request Body:**
  ```json
  {
    "visit_id": "7d0f1a2b-...",
    "clinical_notes": "Evaluasi trombosit dan hematokrit",
    "test_ids": [
      "uuid-lab-darah-lengkap",
      "uuid-lab-widal"
    ]
  }
  ```

#### `POST /internal-api/v1/lab-results` *(Yii Private Internal API)*
- **Otorisasi:** Service-to-Service Secret (`X-Internal-Secret`)
- **Request Body:**
  ```json
  {
    "idempotency_key": "uuid-node-ingest-987",
    "lab_order_id": "uuid-order-123",
    "results": [
      {
        "lab_order_item_id": "uuid-item-1",
        "result_value": "95.000",
        "unit": "/uL",
        "normal_range": "150.000 - 450.000",
        "status": "FINAL",
        "verified_by_username": "analis.dewi"
      }
    ]
  }
  ```

---

### 2.8 Modul 8: Billing & Kasir

#### `GET /api/v1/invoices/visit/:visitId`
- **Otorisasi:** Kasir, Admin
- **Response (200 OK):** Mengembalikan rincian biaya pendaftaran, biaya tindakan medis, biaya tes lab, dan biaya obat dengan total tagihan terkonsolidasi.

#### `POST /api/v1/invoices/:id/payments`
- **Otorisasi:** Kasir
- **Request Body:**
  ```json
  {
    "idempotency_key": "8f3b2a1c-99d8-4f12-a765-b12e34567890",
    "amount": 250000.00,
    "payment_method": "CASH",
    "reference_no": "CASH-20261122-001"
  }
  ```
- **Response (201 Created / 200 OK):**
  ```json
  {
    "success": true,
    "message": "Pembayaran berhasil diproses",
    "data": {
      "payment_number": "PAY-20261122-0012",
      "invoice_number": "INV-20261122-0008",
      "amount_paid": 250000.00,
      "total_invoice": 250000.00,
      "outstanding_balance": 0.00,
      "invoice_status": "PAID",
      "paid_at": "2026-11-22T10:15:30Z"
    }
  }
  ```

---

## 3. Katalog Endpoint Node.js Supporting Service

### 3.1 Lab Ingestion Webhook Gateway
#### `POST /api/v1/integrations/lab-results`
- **Otorisasi:** API Key (`X-Lab-Api-Key`)
- **Fungsi:** Menerima hasil lab dari mesin analyzer eksternal, memvalidasi dengan Zod schema, dan mem-forward ke internal Yii API dengan exponential backoff retry.

### 3.2 High-Performance Dashboard API (Read-Only)

#### `GET /api/v1/dashboard/summary`
- **Otorisasi:** Bearer Token (Admin, Kasir, Dokter)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "today_visits": 48,
      "waiting_patients": 5,
      "in_examination": 2,
      "ready_for_billing": 4,
      "completed_visits": 37,
      "today_revenue": 12450000.00,
      "today_receivables": 0.00,
      "low_stock_medicines_count": 3
    }
  }
  ```

#### `GET /api/v1/dashboard/visits-by-poly`
- **Response (200 OK):** Distribusi jumlah kunjungan per poliklinik (untuk chart Recharts).

#### `GET /api/v1/dashboard/revenue-trend?days=7`
- **Response (200 OK):** Trend pendapatan 7 hari terakhir terbagi atas kategori Registrasi, Tindakan, Lab, dan Farmasi.

#### `GET /api/v1/health`
- **Otorisasi:** Public
- **Response (200 OK):** Status kesiapan service Node.js dan koneksi database PostgreSQL.
