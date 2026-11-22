-- ==============================================================================
-- SIMRS Rawat Jalan Terintegrasi - Database Seed Data (Realistic Hospital Data)
-- Perusahaan: PT Inova Medika Solusindo
-- ==============================================================================

-- 1. ROLES
INSERT INTO roles (code, name, description) VALUES
('ADMIN', 'Administrator', 'Pengelola sistem, hak akses, dan konfigurasi master data'),
('REGISTRATION', 'Petugas Pendaftaran', 'Pendaftaran pasien baru, validasi identitas, dan antrean poli'),
('DOCTOR', 'Dokter', 'Pemeriksaan medis SOAP, diagnosis ICD-10, tindakan, dan resep obat'),
('PHARMACY', 'Petugas Farmasi', 'Verifikasi resep dokter, validasi persediaan obat, dan penyerahan obat'),
('LABORATORY', 'Petugas Laboratorium', 'Pengambilan sampel, analisis uji diagnostik, dan finalisasi hasil'),
('CASHIER', 'Kasir', 'Pemeriksaan invoice teragregasi, pembayaran tunai/non-tunai, dan kuitansi')
ON CONFLICT (code) DO NOTHING;

-- 2. USERS (Password default: 'Password123!' -> hash bcrypt: $2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6)
INSERT INTO users (id, username, email, password_hash, role_code, full_name, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'ADMIN', 'Super Administrator, S.Kom', TRUE),
('22222222-2222-2222-2222-222222222222', 'petugas.pendaftaran', 'pendaftaran@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'REGISTRATION', 'Rina Wulandari, A.Md.RMIK', TRUE),
('33333333-3333-3333-3333-333333333333', 'dr.budi', 'dr.budi@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'DOCTOR', 'dr. Budi Santoso, Sp.PD', TRUE),
('44444444-4444-4444-4444-444444444444', 'dr.anisa', 'dr.anisa@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'DOCTOR', 'dr. Anisa Rahma, Sp.A', TRUE),
('55555555-5555-5555-5555-555555555555', 'dr.citra', 'dr.citra@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'DOCTOR', 'dr. Citra Lestari, Sp.OG', TRUE),
('66666666-6666-6666-6666-666666666666', 'petugas.farmasi', 'farmasi@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'PHARMACY', 'Ahmad Fauzi, S.Farm., Apt.', TRUE),
('77777777-7777-7777-7777-777777777777', 'petugas.lab', 'lab@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'LABORATORY', 'Dewi Sartika, A.Md.AK', TRUE),
('88888888-8888-8888-8888-888888888888', 'kasir', 'kasir@simrs.hospital.id', '$2y$12$FloKAQ9trGlDfcVqufsne.9.nvecqZI6ZPIefRUE05b680PdBW3G6', 'CASHIER', 'Maya Anggraini, S.Ak.', TRUE)
ON CONFLICT (username) DO NOTHING;

-- 3. POLYCLINICS
INSERT INTO polyclinics (id, code, name, queue_prefix, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'POLI-INT', 'Poliklinik Penyakit Dalam', 'A', TRUE),
('a0000000-0000-0000-0000-000000000002', 'POLI-ANA', 'Poliklinik Anak', 'B', TRUE),
('a0000000-0000-0000-0000-000000000003', 'POLI-OBG', 'Poliklinik Kebidanan & Kandungan', 'C', TRUE),
('a0000000-0000-0000-0000-000000000004', 'POLI-GIG', 'Poliklinik Gigi & Mulut', 'D', TRUE),
('a0000000-0000-0000-0000-000000000005', 'POLI-MAT', 'Poliklinik Mata', 'E', TRUE),
('a0000000-0000-0000-0000-000000000006', 'POLI-BED', 'Poliklinik Bedah Umum', 'F', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. MEDICAL STAFF
INSERT INTO medical_staff (id, user_id, staff_type, sip_number, full_name, polyclinic_id, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'DOCTOR', 'SIP-446/012/IDI/2021', 'dr. Budi Santoso, Sp.PD', 'a0000000-0000-0000-0000-000000000001', TRUE),
('b0000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'DOCTOR', 'SIP-446/015/IDI/2022', 'dr. Anisa Rahma, Sp.A', 'a0000000-0000-0000-0000-000000000002', TRUE),
('b0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'DOCTOR', 'SIP-446/018/IDI/2020', 'dr. Citra Lestari, Sp.OG', 'a0000000-0000-0000-0000-000000000003', TRUE)
ON CONFLICT (sip_number) DO NOTHING;

-- 5. DOCTOR SCHEDULES (1=Senin s/d 6=Sabtu)
INSERT INTO doctor_schedules (id, doctor_id, polyclinic_id, day_of_week, start_time, end_time, quota, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 3, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 4, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 6, '08:00:00', '12:00:00', 20, TRUE),
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 1, '09:00:00', '15:00:00', 25, TRUE),
('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 3, '09:00:00', '15:00:00', 25, TRUE),
('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 2, '10:00:00', '16:00:00', 25, TRUE),
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 4, '10:00:00', '16:00:00', 25, TRUE)
ON CONFLICT DO NOTHING;

-- 6. MASTER PATIENTS
INSERT INTO patients (id, mr_number, nik, full_name, birth_date, gender, address, phone, is_active) VALUES
('d0000000-0000-0000-0000-000000000001', 'RM-202611-00001', '3273011205850001', 'Bambang Pamungkas', '1985-05-12', 'MALE', 'Jl. Sukajadi No. 45, Bandung', '081234567890', TRUE),
('d0000000-0000-0000-0000-000000000002', 'RM-202611-00002', '3273015408920002', 'Siti Nurhaliza', '1992-08-14', 'FEMALE', 'Jl. Dago Asri No. 12, Bandung', '081398765432', TRUE),
('d0000000-0000-0000-0000-000000000003', 'RM-202611-00003', '3273022511780003', 'Hendra Gunawan', '1978-11-25', 'MALE', 'Jl. Buah Batu No. 108, Bandung', '081122334455', TRUE),
('d0000000-0000-0000-0000-000000000004', 'RM-202611-00004', '3273034903000004', 'Dewi Lestari', '2000-03-09', 'FEMALE', 'Jl. Riau No. 89, Bandung', '081987654321', TRUE),
('d0000000-0000-0000-0000-000000000005', 'RM-202611-00005', '3273041506150005', 'Muhammad Rizky', '2015-06-15', 'MALE', 'Jl. Setiabudhi No. 201, Bandung', '082134567812', TRUE)
ON CONFLICT (mr_number) DO NOTHING;

-- 7. ICD-10 DIAGNOSES
INSERT INTO diagnoses (id, code, description, is_active) VALUES
('e0000000-0000-0000-0000-000000000001', 'I10', 'Essential (primary) hypertension', TRUE),
('e0000000-0000-0000-0000-000000000002', 'E11.9', 'Type 2 diabetes mellitus without complications', TRUE),
('e0000000-0000-0000-0000-000000000003', 'J00', 'Acute nasopharyngitis [common cold]', TRUE),
('e0000000-0000-0000-0000-000000000004', 'A90', 'Dengue fever [classical dengue]', TRUE),
('e0000000-0000-0000-0000-000000000005', 'K29.7', 'Gastritis, unspecified', TRUE),
('e0000000-0000-0000-0000-000000000006', 'J18.9', 'Pneumonia, unspecified organism', TRUE),
('e0000000-0000-0000-0000-000000000007', 'R50.9', 'Fever, unspecified', TRUE),
('e0000000-0000-0000-0000-000000000008', 'K30', 'Functional dyspepsia', TRUE),
('e0000000-0000-0000-0000-000000000009', 'M54.5', 'Low back pain', TRUE),
('e0000000-0000-0000-0000-000000000010', 'H10.9', 'Conjunctivitis, unspecified', TRUE),
('e0000000-0000-0000-0000-000000000011', 'O80', 'Single spontaneous delivery', TRUE),
('e0000000-0000-0000-0000-000000000012', 'K02.9', 'Dental caries, unspecified', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 8. MEDICAL PROCEDURES
INSERT INTO medical_procedures (id, code, name, base_price, is_active) VALUES
('f0000000-0000-0000-0000-000000000001', 'PROC-CONSULT', 'Konsultasi & Pemeriksaan Dokter Spesialis', 100000.00, TRUE),
('f0000000-0000-0000-0000-000000000002', 'PROC-EKG', 'Pemeriksaan Elektrokardiogram (EKG 12-Lead)', 85000.00, TRUE),
('f0000000-0000-0000-0000-000000000003', 'PROC-NEBU', 'Terapi Inhalasi / Nebulisasi', 65000.00, TRUE),
('f0000000-0000-0000-0000-000000000004', 'PROC-USG-OBG', 'Ultrasonografi (USG) Kandungan 2D', 150000.00, TRUE),
('f0000000-0000-0000-0000-000000000005', 'PROC-WOUND', 'Perawatan Luka Sederhana (Rawat Luka)', 50000.00, TRUE),
('f0000000-0000-0000-0000-000000000006', 'PROC-INJECT', 'Injeksi Intramuskular / Intravena', 30000.00, TRUE),
('f0000000-0000-0000-0000-000000000007', 'PROC-DENT-SCAL', 'Pembersihan Karang Gigi (Scaling Ringan)', 175000.00, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 9. MEDICINES & INITIAL STOCK
INSERT INTO medicines (id, code, name, generic_name, unit, base_price, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'MED-PCT-500', 'Paracetamol 500 mg', 'Paracetamol', 'Tablet', 1500.00, TRUE),
('10000000-0000-0000-0000-000000000002', 'MED-AMX-500', 'Amoxicillin 500 mg', 'Amoxicillin Trihydrate', 'Kaplet', 3000.00, TRUE),
('10000000-0000-0000-0000-000000000003', 'MED-CFX-100', 'Cefixime 100 mg', 'Cefixime', 'Kapsul', 7500.00, TRUE),
('10000000-0000-0000-0000-000000000004', 'MED-OMZ-20', 'Omeprazole 20 mg', 'Omeprazole', 'Kapsul', 4000.00, TRUE),
('10000000-0000-0000-0000-000000000005', 'MED-AML-10', 'Amlodipine 10 mg', 'Amlodipine Besylate', 'Tablet', 2500.00, TRUE),
('10000000-0000-0000-0000-000000000006', 'MED-MET-500', 'Metformin 500 mg', 'Metformin HCl', 'Tablet', 2000.00, TRUE),
('10000000-0000-0000-0000-000000000007', 'MED-CTZ-10', 'Cetirizine 10 mg', 'Cetirizine HCl', 'Tablet', 2000.00, TRUE),
('10000000-0000-0000-0000-000000000008', 'MED-IBU-400', 'Ibuprofen 400 mg', 'Ibuprofen', 'Tablet', 3500.00, TRUE),
('10000000-0000-0000-0000-000000000009', 'MED-ORS-SAC', 'Oralit Garam Rehidrasi', 'Oral Rehydration Salts', 'Sachet', 1500.00, TRUE),
('10000000-0000-0000-0000-000000000010', 'MED-ANT-SYR', 'Antasida DOEN Suspensi 60 ml', 'Aluminium Hydroxide / Magnesium Hydroxide', 'Botol', 9000.00, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Initial Stock for Medicines
INSERT INTO medicine_stocks (id, medicine_id, current_stock, minimum_stock) VALUES
(gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 500, 50),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 300, 30),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 150, 20),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 250, 25),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000005', 400, 40),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000006', 350, 30),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000007', 200, 20),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000008', 250, 25),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000009', 100, 15),
(gen_random_uuid(), '10000000-0000-0000-0000-000000000010', 80, 10)
ON CONFLICT (medicine_id) DO NOTHING;

-- Initial Stock Movement Audit Entries
INSERT INTO stock_movements (medicine_id, reference_type, quantity_change, stock_before, stock_after, notes)
SELECT medicine_id, 'INITIAL', current_stock, 0, current_stock, 'Saldo awal persediaan obat depo rawat jalan'
FROM medicine_stocks;

-- 10. LAB TESTS CATALOG
INSERT INTO lab_tests (id, code, name, normal_range, unit, base_price, is_active) VALUES
('20000000-0000-0000-0000-000000000001', 'LAB-CBC', 'Darah Lengkap (Complete Blood Count / CBC)', 'Hb: 12-16, Leu: 5-10, Trombo: 150-450', 'Panel', 85000.00, TRUE),
('20000000-0000-0000-0000-000000000002', 'LAB-GDS', 'Glukosa Darah Sewaktu (GDS)', '70 - 140', 'mg/dL', 35000.00, TRUE),
('20000000-0000-0000-0000-000000000003', 'LAB-CHOL-TOT', 'Kolesterol Total', '< 200', 'mg/dL', 45000.00, TRUE),
('20000000-0000-0000-0000-000000000004', 'LAB-URIC-ACID', 'Asam Urat Darah', '3.5 - 7.2', 'mg/dL', 40000.00, TRUE),
('20000000-0000-0000-0000-000000000005', 'LAB-WIDAL', 'Tes Widal (Serologi Salmonella)', 'Titer < 1/160', 'Titer', 60000.00, TRUE),
('20000000-0000-0000-0000-000000000006', 'LAB-URINE-ROUTINE', 'Urin Rutin Lengkap', 'Negatif / Normal', 'Panel', 50000.00, TRUE)
ON CONFLICT (code) DO NOTHING;
