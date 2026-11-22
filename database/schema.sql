-- ==============================================================================
-- SIMRS Rawat Jalan Terintegrasi - PostgreSQL Relational Database Schema
-- Perusahaan: PT Inova Medika Solusindo
-- Target DB: PostgreSQL 16+
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema (Safe for re-runs in dev)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS integration_inbox CASCADE;
DROP TABLE IF EXISTS invoice_adjustments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS lab_order_items CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS lab_tests CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS medicine_dispensations CASCADE;
DROP TABLE IF EXISTS prescription_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS medicine_stocks CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS visit_procedures CASCADE;
DROP TABLE IF EXISTS medical_procedures CASCADE;
DROP TABLE IF EXISTS visit_diagnoses CASCADE;
DROP TABLE IF EXISTS diagnoses CASCADE;
DROP TABLE IF EXISTS medical_record_revisions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS queue_counters CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS medical_staff CASCADE;
DROP TABLE IF EXISTS polyclinics CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ------------------------------------------------------------------------------
-- 1. MASTER & RBAC DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE roles (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_code VARCHAR(30) NOT NULL REFERENCES roles(code) ON UPDATE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mr_number VARCHAR(20) UNIQUE NOT NULL, -- Format: RM-YYYYMM-XXXXX
    nik VARCHAR(16) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    address TEXT NOT NULL,
    phone VARCHAR(25) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE polyclinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. POLI-INT, POLI-OBG
    name VARCHAR(100) NOT NULL,
    queue_prefix VARCHAR(5) NOT NULL, -- e.g. A, B, C
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    staff_type VARCHAR(20) NOT NULL CHECK (staff_type IN ('DOCTOR', 'NURSE')),
    sip_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    polyclinic_id UUID REFERENCES polyclinics(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE CASCADE,
    polyclinic_id UUID NOT NULL REFERENCES polyclinics(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Senin, 7=Minggu
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    quota INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    base_price NUMERIC(14,2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    unit VARCHAR(30) NOT NULL, -- Tablet, Kapsul, Botol, Ampul
    base_price NUMERIC(14,2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicine_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID UNIQUE NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INT NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. REGISTRATION & QUEUE DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE queue_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polyclinic_id UUID NOT NULL REFERENCES polyclinics(id) ON DELETE CASCADE,
    queue_date DATE NOT NULL,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_queue_counter_poly_date UNIQUE (polyclinic_id, queue_date)
);

CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_number VARCHAR(30) UNIQUE NOT NULL, -- REG-YYYYMMDD-XXXXX
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    polyclinic_id UUID NOT NULL REFERENCES polyclinics(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE RESTRICT,
    schedule_id UUID REFERENCES doctor_schedules(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL,
    queue_number INT NOT NULL,
    queue_display VARCHAR(10) NOT NULL, -- e.g. A001
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN (
        'REGISTERED', 'WAITING', 'IN_EXAMINATION', 'WAITING_LAB', 
        'WAITING_PHARMACY', 'READY_FOR_BILLING', 'COMPLETED', 'CANCELLED'
    )),
    cancel_reason TEXT,
    registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partial Unique Index: 1 Kunjungan aktif per pasien, poli, dan tanggal (Pencegah Double Registration)
CREATE UNIQUE INDEX uq_patient_poly_date_active 
ON visits (patient_id, polyclinic_id, visit_date) 
WHERE status NOT IN ('CANCELLED');

-- ------------------------------------------------------------------------------
-- 3. MEDICAL RECORD (EMR) & DIAGNOSIS DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE RESTRICT,
    chief_complaint TEXT NOT NULL,
    anamnesis TEXT NOT NULL,
    systolic_bp INT CHECK (systolic_bp BETWEEN 40 AND 300),
    diastolic_bp INT CHECK (diastolic_bp BETWEEN 30 AND 200),
    heart_rate INT CHECK (heart_rate BETWEEN 30 AND 250),
    respiratory_rate INT CHECK (respiratory_rate BETWEEN 8 AND 80),
    temperature NUMERIC(4,1) CHECK (temperature BETWEEN 30.0 AND 45.0),
    weight NUMERIC(5,2),
    height NUMERIC(5,2),
    physical_examination TEXT,
    doctor_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_record_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    revised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    revision_reason TEXT NOT NULL,
    previous_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- ICD-10 Code, e.g. I10, E11.9
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE visit_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    diagnosis_id UUID NOT NULL REFERENCES diagnoses(id) ON DELETE RESTRICT,
    diagnosis_type VARCHAR(15) NOT NULL CHECK (diagnosis_type IN ('PRIMARY', 'SECONDARY')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visit_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    procedure_id UUID NOT NULL REFERENCES medical_procedures(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE RESTRICT,
    snapshot_price NUMERIC(14,2) NOT NULL CHECK (snapshot_price >= 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. PHARMACY DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE RESTRICT,
    prescription_number VARCHAR(30) UNIQUE NOT NULL, -- RX-YYYYMMDD-XXXXX
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'PROCESSING', 'DISPENSED', 'CANCELLED'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    route VARCHAR(30) DEFAULT 'Oral',
    instructions TEXT,
    snapshot_price NUMERIC(14,2) NOT NULL CHECK (snapshot_price >= 0),
    subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicine_dispensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID UNIQUE NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    dispensed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dispensed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN (
        'INITIAL', 'DISPENSATION', 'ADJUSTMENT', 'RESTOCK', 'CANCELLATION'
    )),
    reference_id UUID,
    quantity_change INT NOT NULL, -- Positif untuk masuk, Negatif untuk keluar
    stock_before INT NOT NULL,
    stock_after INT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. LABORATORY DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    normal_range VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    base_price NUMERIC(14,2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES medical_staff(id) ON DELETE RESTRICT,
    order_number VARCHAR(30) UNIQUE NOT NULL, -- LAB-ORD-YYYYMMDD-XXXXX
    status VARCHAR(20) NOT NULL DEFAULT 'ORDERED' CHECK (status IN (
        'ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    clinical_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    lab_test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
    snapshot_price NUMERIC(14,2) NOT NULL CHECK (snapshot_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    lab_order_item_id UUID UNIQUE NOT NULL REFERENCES lab_order_items(id) ON DELETE CASCADE,
    result_value VARCHAR(100) NOT NULL,
    normal_range_snapshot VARCHAR(100) NOT NULL,
    unit_snapshot VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRELIMINARY' CHECK (status IN ('PRELIMINARY', 'FINAL')),
    test_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    external_reference_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. FINANCE & BILLING DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) UNIQUE NOT NULL, -- INV-YYYYMMDD-XXXXX
    visit_id UUID UNIQUE NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    registration_fee NUMERIC(14,2) NOT NULL DEFAULT 25000.00,
    procedures_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    lab_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    medicines_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    outstanding_balance NUMERIC(14,2) NOT NULL CHECK (outstanding_balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('REGISTRATION', 'PROCEDURE', 'LAB', 'MEDICINE')),
    reference_id UUID,
    description VARCHAR(200) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(30) UNIQUE NOT NULL, -- PAY-YYYYMMDD-XXXXX
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL, -- Idempotency protection against double submit
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'QRIS', 'DEBIT_CARD', 'BANK_TRANSFER')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (payment_status IN ('SUCCESS', 'FAILED')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reference_no VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('ADDITION', 'DEDUCTION', 'CANCELLATION')),
    amount NUMERIC(14,2) NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. AUDIT & INTEGRATION DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integration_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    source_system VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- INDEXING OPTIMIZATION
-- ------------------------------------------------------------------------------

CREATE INDEX idx_visits_date_poly_status ON visits (visit_date, polyclinic_id, status);
CREATE INDEX idx_visits_patient_id ON visits (patient_id);
CREATE INDEX idx_visits_doctor_id ON visits (doctor_id);

CREATE INDEX idx_patients_mr_number ON patients (mr_number);
CREATE INDEX idx_patients_nik ON patients (nik);

CREATE INDEX idx_prescriptions_visit_status ON prescriptions (visit_id, status);
CREATE INDEX idx_stock_movements_med_date ON stock_movements (medicine_id, created_at DESC);

CREATE INDEX idx_invoices_status_date ON invoices (status, created_at);
CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_idempotency_key ON payments (idempotency_key);

CREATE TABLE satusehat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    satusehat_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'SYNCED' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED')),
    request_payload JSONB,
    response_payload JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_satusehat_logs_visit ON satusehat_logs(visit_id);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
