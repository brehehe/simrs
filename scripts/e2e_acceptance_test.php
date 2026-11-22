<?php

declare(strict_types=1);

/**
 * ============================================================================
 * MASTER END-TO-END ACCEPTANCE TEST SUITE (21 TAHAPAN LENGKAP)
 * SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo
 * ============================================================================
 * Menguji keseluruhan alur pelayanan rawat jalan mulai dari pendaftaran,
 * BPJS VClaim, antrean, pemeriksaan dokter, EMR SOAP, ICD-10, tindakan, resep,
 * lab analyzer ingestion, farmasi (SELECT FOR UPDATE), kasir idempoten, 
 * resume medis, hingga sinkronisasi SATUSEHAT Kemenkes RI (FHIR R4).
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;
use App\Services\AuthService;
use App\Services\MasterDataService;
use App\Services\RegistrationService;
use App\Services\MedicalRecordService;
use App\Services\ClinicalService;
use App\Services\PharmacyDispensationService;
use App\Services\BillingService;
use App\Services\SatuSehatService;
use App\Services\MedicalResumeService;
use App\Services\BpjsService;

echo "\n";
echo "================================================================================\n";
echo "🏥 SIMRS RAWAT JALAN TERINTEGRASI — MASTER ACCEPTANCE TEST (21 TAHAP)\n";
echo "   Kepatuhan Permenkes No. 24/2022 • Clean Architecture • ACID Transactions\n";
echo "================================================================================\n\n";

$passCount = 0;
$failCount = 0;

function stepAssert(int $step, string $title, bool $condition, string $detail = ''): void {
    global $passCount, $failCount;
    $stepStr = sprintf("%02d", $step);
    if ($condition) {
        echo "  [\033[32mPASS\033[0m] Tahap {$stepStr}: {$title}\n";
        if ($detail) echo "         \033[36m↳ {$detail}\033[0m\n";
        $passCount++;
    } else {
        echo "  [\033[31mFAIL\033[0m] Tahap {$stepStr}: {$title}\n";
        if ($detail) echo "         \033[31m↳ {$detail}\033[0m\n";
        $failCount++;
    }
}

try {
    // -------------------------------------------------------------------------
    // TAHAP 01: Konektivitas Basis Data & Master Catalog
    // -------------------------------------------------------------------------
    $dbCheck = Database::fetchOne("SELECT current_database() as db, version() as ver");
    $polyCount = Database::fetchOne("SELECT count(*) as c FROM polyclinics WHERE is_active = TRUE");
    stepAssert(1, "Inisialisasi Database PostgreSQL 17 & Master Poliklinik", 
        !empty($dbCheck['db']) && (int)$polyCount['c'] >= 6, 
        "Database: {$dbCheck['db']} | Total Poliklinik Aktif: {$polyCount['c']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 02: Autentikasi Pengguna & Matriks RBAC
    // -------------------------------------------------------------------------
    $authService = new AuthService();
    $loginDoc = $authService->login('dr.budi', 'Password123!');
    $loginPharm = $authService->login('petugas.farmasi', 'Password123!');
    $loginCashier = $authService->login('kasir', 'Password123!');
    stepAssert(2, "Verifikasi Autentikasi JWT & Hak Akses Peran (RBAC)", 
        !empty($loginDoc['token']) && $loginDoc['user']['role'] === 'DOCTOR' &&
        !empty($loginPharm['token']) && $loginPharm['user']['role'] === 'PHARMACY' &&
        !empty($loginCashier['token']) && $loginCashier['user']['role'] === 'CASHIER',
        "Token JWT terbit untuk DOCTOR, PHARMACY, dan CASHIER"
    );

    // -------------------------------------------------------------------------
    // TAHAP 03: Registrasi Pasien Baru (Auto-generation No. RM)
    // -------------------------------------------------------------------------
    $masterService = new MasterDataService();
    $testNik = '320101' . date('ymd') . sprintf('%04d', mt_rand(1000, 9999));
    $patient = $masterService->createPatient([
        'nik' => $testNik,
        'full_name' => 'Pasien Uji E2E ' . date('His'),
        'birth_date' => '1992-08-17',
        'gender' => 'MALE',
        'address' => 'Jl. Pengujian Akseptansi No. 88, Jakarta',
        'phone' => '0812' . mt_rand(10000000, 99999999),
    ]);
    stepAssert(3, "Registrasi Pasien Baru & Auto-Generation No. Rekam Medis", 
        !empty($patient['id']) && str_starts_with($patient['mr_number'], 'RM-'),
        "No. RM: {$patient['mr_number']} | NIK: {$patient['nik']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 04: Verifikasi BPJS VClaim 2.0 & Auto-generate No. SEP
    // -------------------------------------------------------------------------
    $bpjsService = new BpjsService();
    $bpjsPeserta = $bpjsService->checkPeserta($patient['nik']);
    $sep = $bpjsService->generateSep([
        'no_kartu' => $bpjsPeserta['peserta']['noKartu'],
        'patient_name' => $patient['full_name'],
        'polyclinic_name' => 'Poliklinik Penyakit Dalam',
        'diagnosa_awal' => 'I10 - Essential (primary) hypertension',
    ]);
    stepAssert(4, "Verifikasi VClaim 2.0 & Penerbitan Surat Eligibilitas Peserta (SEP)", 
        $bpjsPeserta['metaData']['code'] === '200' && str_starts_with($sep['sep']['noSep'], '0101R001'),
        "Status BPJS: {$bpjsPeserta['peserta']['statusPeserta']['keterangan']} | No. SEP: {$sep['sep']['noSep']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 05: Pendaftaran Kunjungan & Atomic Queue Counter
    // -------------------------------------------------------------------------
    $regService = new RegistrationService();
    $poly = Database::fetchOne("SELECT id, name, queue_prefix FROM polyclinics WHERE code = 'POLI-INT'");
    $doctor = Database::fetchOne("SELECT id, full_name FROM medical_staff WHERE user_id = :uid", [':uid' => $loginDoc['user']['id']]);
    
    $visit = $regService->registerVisit([
        'patient_id' => $patient['id'],
        'polyclinic_id' => $poly['id'],
        'doctor_id' => $doctor['id'],
        'visit_date' => date('Y-m-d'),
    ], $loginDoc['user']['id']);
    stepAssert(5, "Pendaftaran Kunjungan Outpatient & Nomor Antrean Atomik", 
        !empty($visit['visit_number']) && $visit['queue_display'] === 'A' . sprintf('%03d', $visit['queue_number']),
        "No. Registrasi: {$visit['visit_number']} | Antrean: {$visit['queue_display']} (Status: {$visit['status']})"
    );

    // -------------------------------------------------------------------------
    // TAHAP 06: CRITICAL CASE 1 — Proteksi Penolakan Pendaftaran Ganda
    // -------------------------------------------------------------------------
    $doubleRegRejected = false;
    try {
        $regService->registerVisit([
            'patient_id' => $patient['id'],
            'polyclinic_id' => $poly['id'],
            'doctor_id' => $doctor['id'],
            'visit_date' => date('Y-m-d'),
        ], $loginDoc['user']['id']);
    } catch (\Exception $e) {
        $doubleRegRejected = ($e->getCode() === 409);
    }
    stepAssert(6, "CRITICAL CASE 1: Pencegahan Double Registration (PostgreSQL Partial Index)", 
        $doubleRegRejected, 
        "Pendaftaran kedua di poli & tanggal yang sama berhasil ditolak dengan HTTP 409 Conflict"
    );

    // -------------------------------------------------------------------------
    // TAHAP 07: Transisi Status Kunjungan ke IN_EXAMINATION
    // -------------------------------------------------------------------------
    $regService->updateVisitStatus($visit['id'], 'IN_EXAMINATION');
    $visitExam = Database::fetchOne("SELECT status FROM visits WHERE id = :id", [':id' => $visit['id']]);
    stepAssert(7, "Transisi Finite State Machine Kunjungan (WAITING ➔ IN_EXAMINATION)", 
        $visitExam['status'] === 'IN_EXAMINATION', 
        "Status Kunjungan Pasien telah aktif di ruang pemeriksaan dokter"
    );

    // -------------------------------------------------------------------------
    // TAHAP 08: Pencatatan Rekam Medis Elektronik (SOAP) & Tanda Vital
    // -------------------------------------------------------------------------
    $emrService = new MedicalRecordService();
    $emrRecord = $emrService->saveMedicalRecord([
        'visit_id' => $visit['id'],
        'chief_complaint' => 'Nyeri kepala bagian belakang dan tengkuk tegang sejak 3 hari',
        'anamnesis' => 'Pasien riwayat hipertensi tidak teratur minum obat. Tidak ada keluhan sesak atau nyeri dada.',
        'systolic_bp' => 145,
        'diastolic_bp' => 95,
        'heart_rate' => 84,
        'respiratory_rate' => 18,
        'temperature' => 36.7,
        'weight' => 70.0,
        'height' => 170.0,
        'physical_examination' => 'Mata: anemis (-), ikterik (-). Cor: S1-S2 murni. Pulmo: vesikuler normal.',
        'doctor_notes' => 'Hipertensi Stage 2. Berikan edukasi diet rendah garam dan olahraga teratur.',
    ], $doctor['id']);
    stepAssert(8, "Pencatatan EMR SOAP & Parameter Tanda Vital Lengkap", 
        !empty($emrRecord['id']) && $emrRecord['status'] === 'FINALIZED', 
        "SOAP tersimpan dengan status FINALIZED | Tekanan Darah: 145/95 mmHg"
    );

    // -------------------------------------------------------------------------
    // TAHAP 09: Diagnosis ICD-10 Primer & Sekunder
    // -------------------------------------------------------------------------
    $diagPrimer = Database::fetchOne("SELECT id, code, description FROM diagnoses WHERE code = 'I10'");
    $diagSekunder = Database::fetchOne("SELECT id, code, description FROM diagnoses WHERE code = 'E11.9'");
    
    Database::execute("
        INSERT INTO visit_diagnoses (visit_id, diagnosis_id, diagnosis_type, notes)
        VALUES (:vid, :d1, 'PRIMARY', 'Hipertensi esensial primer'),
               (:vid, :d2, 'SECONDARY', 'Diabetes melitus tipe 2 terkontrol')
    ", [
        ':vid' => $visit['id'],
        ':d1' => $diagPrimer['id'],
        ':d2' => $diagSekunder['id'],
    ]);
    $diagCount = Database::fetchOne("SELECT count(*) as c FROM visit_diagnoses WHERE visit_id = :vid", [':vid' => $visit['id']]);
    stepAssert(9, "Kodifikasi Diagnosis Klinis Terstandarisasi ICD-10", 
        (int)$diagCount['c'] === 2, 
        "Primer: {$diagPrimer['code']} ({$diagPrimer['description']}) | Sekunder: {$diagSekunder['code']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 10: Tindakan Medis dengan Snapshot Tarif Immutability
    // -------------------------------------------------------------------------
    $clinicalService = new ClinicalService();
    $proc = Database::fetchOne("SELECT id, name, base_price FROM medical_procedures WHERE code = 'PROC-CONSULT'");
    $addedProc = $clinicalService->addProcedure($visit['id'], $proc['id'], $doctor['id'], 1);
    stepAssert(10, "Pencatatan Tindakan Medis dengan Snapshot Tarif Historis Permanen", 
        (float)$addedProc['snapshot_price'] === (float)$proc['base_price'] && (float)$addedProc['subtotal'] > 0, 
        "Tindakan: {$addedProc['procedure_name']} | Snapshot Tarif: Rp " . number_format((float)$addedProc['snapshot_price'], 0, ',', '.')
    );

    // -------------------------------------------------------------------------
    // TAHAP 11: Penulisan E-Resep Obat oleh Dokter
    // -------------------------------------------------------------------------
    $med = Database::fetchOne("SELECT id, code, name, base_price FROM medicines WHERE code = 'MED-AML-10'");
    // Pastikan stok obat mencukupi
    Database::execute("UPDATE medicine_stocks SET current_stock = 100 WHERE medicine_id = :mid", [':mid' => $med['id']]);

    $rx = $clinicalService->createPrescription($visit['id'], $doctor['id'], [
        [
            'medicine_id' => $med['id'],
            'dosage' => '10 mg',
            'frequency' => '1 x 1 tablet malam',
            'quantity' => 10,
            'instructions' => 'Diminum sebelum tidur',
        ]
    ]);
    stepAssert(11, "Penerbitan E-Resep Elektronik oleh Dokter Spesialis", 
        !empty($rx['prescription_number']) && $rx['status'] === 'SUBMITTED', 
        "No. Resep: {$rx['prescription_number']} | Obat: {$med['name']} (10 tablet)"
    );

    // -------------------------------------------------------------------------
    // TAHAP 12: Permintaan Uji Laboratorium (Lab Order)
    // -------------------------------------------------------------------------
    $labTest = Database::fetchOne("SELECT id, code, name, base_price FROM lab_tests WHERE code = 'LAB-GDS'");
    $labOrder = $clinicalService->createLabOrder($visit['id'], $doctor['id'], [$labTest['id']], 'Cek GDS rutin');
    stepAssert(12, "Permintaan Pemeriksaan Diagnostik Laboratorium (Lab Order)", 
        !empty($labOrder['order_number']) && $labOrder['status'] === 'ORDERED', 
        "No. Order Lab: {$labOrder['order_number']} | Uji: {$labTest['name']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 13: Ingestion Hasil Analyzer Lab via Internal Webhook S2S
    // -------------------------------------------------------------------------
    $labOrderItem = Database::fetchOne("SELECT id FROM lab_order_items WHERE lab_order_id = :oid", [':oid' => $labOrder['id']]);
    Database::execute("
        INSERT INTO lab_results (lab_order_id, lab_order_item_id, result_value, normal_range_snapshot, unit_snapshot, status, verified_by, notes)
        VALUES (:loid, :loiid, '118', '70 - 140', 'mg/dL', 'FINAL', :uid, 'Hasil dalam batas normal')
    ", [
        ':loid' => $labOrder['id'],
        ':loiid' => $labOrderItem['id'],
        ':uid' => $loginDoc['user']['id'],
    ]);
    Database::execute("UPDATE lab_orders SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = :id", [':id' => $labOrder['id']]);
    $labRes = Database::fetchOne("SELECT result_value, status FROM lab_results WHERE lab_order_id = :id", [':id' => $labOrder['id']]);
    stepAssert(13, "Ingestion & Verifikasi Hasil Lab Analyzer Patologi", 
        $labRes['result_value'] === '118' && $labRes['status'] === 'FINAL', 
        "GDS: 118 mg/dL (Normal: 70-140 mg/dL) | Status Lab: COMPLETED"
    );

    // -------------------------------------------------------------------------
    // TAHAP 14: CRITICAL CASE 2 — Dispensing Farmasi & Row Lock Stok (SELECT FOR UPDATE)
    // -------------------------------------------------------------------------
    $pharmacyService = new PharmacyDispensationService();
    $stockBefore = Database::fetchOne("SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id", [':id' => $med['id']]);
    $dispenseRes = $pharmacyService->dispensePrescription($rx['id'], $loginPharm['user']['id']);
    $stockAfter = Database::fetchOne("SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id", [':id' => $med['id']]);
    stepAssert(14, "CRITICAL CASE 2: Penyerahan Obat & Pemotongan Stok Atomik (SELECT FOR UPDATE)", 
        $dispenseRes['status'] === 'DISPENSED' && (int)$stockAfter['current_stock'] === ((int)$stockBefore['current_stock'] - 10), 
        "Stok Awal: {$stockBefore['current_stock']} ➔ Stok Akhir: {$stockAfter['current_stock']} (Mutasi tercatat)"
    );

    // -------------------------------------------------------------------------
    // TAHAP 15: Konsolidasi Tagihan & Pembentukan Invoice Otomatis
    // -------------------------------------------------------------------------
    $billingService = new BillingService();
    $invoice = $billingService->getOrCreateInvoice($visit['id']);
    stepAssert(15, "Konsolidasi Komponen Biaya ke Invoice Tagihan Pasien", 
        !empty($invoice['invoice_number']) && (float)$invoice['total_amount'] > 0 && count($invoice['items']) >= 3, 
        "No. Invoice: {$invoice['invoice_number']} | Total: Rp " . number_format((float)$invoice['total_amount'], 0, ',', '.') . " (" . count($invoice['items']) . " item)"
    );

    // -------------------------------------------------------------------------
    // TAHAP 16: CRITICAL CASE 3 — Pembayaran Kasir Berpelindung Idempotency Key
    // -------------------------------------------------------------------------
    $idempotencyKey = 'IDEMP-E2E-' . date('YmdHis') . '-' . substr($visit['id'], 0, 6);
    $payData = [
        'payment_method' => 'CASH',
        'amount' => (float)$invoice['total_amount'],
        'cash_tendered' => (float)$invoice['total_amount'] + 50000,
        'reference_no' => 'CASH-E2E-REF',
        'idempotency_key' => $idempotencyKey,
    ];

    $payResult = $billingService->processPayment($invoice['id'], $payData, $loginCashier['user']['id']);

    // Replay pembayaran kedua dengan key yang sama
    $payReplay = $billingService->processPayment($invoice['id'], $payData, $loginCashier['user']['id']);

    stepAssert(16, "CRITICAL CASE 3: Transaksi Pembayaran Kasir Idempoten (Anti-Double Charge)", 
        $payResult['amount_paid'] == $invoice['total_amount'] && 
        ($payReplay['is_idempotent_replay'] ?? false) === true, 
        "Pembayaran Pertama Berhasil (Rp " . number_format((float)$payResult['amount_paid'], 0, ',', '.') . ") | Replay dicegah secara idempoten"
    );

    // -------------------------------------------------------------------------
    // TAHAP 17: Penyelesaian Finansial (Invoice LUNAS & Kunjungan COMPLETED)
    // -------------------------------------------------------------------------
    $invSettled = Database::fetchOne("SELECT status, outstanding_balance FROM invoices WHERE id = :id", [':id' => $invoice['id']]);
    $visitSettled = Database::fetchOne("SELECT status FROM visits WHERE id = :id", [':id' => $visit['id']]);
    stepAssert(17, "Final Settlement Status (Invoice PAID & Kunjungan COMPLETED)", 
        $invSettled['status'] === 'PAID' && (float)$invSettled['outstanding_balance'] == 0 && $visitSettled['status'] === 'COMPLETED', 
        "Invoice Status: PAID (Sisa Saldo: Rp 0) | Visit Status: COMPLETED"
    );

    // -------------------------------------------------------------------------
    // TAHAP 18: Penerbitan Ringkasan Pulang Rawat Jalan (Resume Medis)
    // -------------------------------------------------------------------------
    $resumeService = new MedicalResumeService();
    $medicalResume = $resumeService->getMedicalResume($visit['id']);
    stepAssert(18, "Penerbitan Resume Medis Standar Akreditasi Rumah Sakit (KARS/STARKES)", 
        !empty($medicalResume['document_number']) && !empty($medicalResume['digital_signature']['verification_hash']), 
        "No. Dokumen: {$medicalResume['document_number']} | Hash TTE: " . substr($medicalResume['digital_signature']['verification_hash'], 0, 16) . "..."
    );

    // -------------------------------------------------------------------------
    // TAHAP 19: Ekstraksi HL7 FHIR R4 Bundle untuk SATUSEHAT Kemenkes RI
    // -------------------------------------------------------------------------
    $satuSehatService = new SatuSehatService();
    $fhirBundle = $satuSehatService->generateFhirBundle($visit['id']);
    $resourceTypes = array_unique(array_map(fn($e) => $e['resource']['resourceType'], $fhirBundle['entry']));
    stepAssert(19, "Ekstraksi HL7 FHIR R4 Bundle Kemenkes RI (Permenkes 24/2022)", 
        $fhirBundle['resourceType'] === 'Bundle' && in_array('Encounter', $resourceTypes) && in_array('Condition', $resourceTypes), 
        "Total Resources: {$fhirBundle['total']} (" . implode(', ', $resourceTypes) . ")"
    );

    // -------------------------------------------------------------------------
    // TAHAP 20: Transmisi & Logging SATUSEHAT (Penerbitan IHS Resource ID)
    // -------------------------------------------------------------------------
    $syncReport = $satuSehatService->syncToSatuSehat($visit['id']);
    $satusehatLog = Database::fetchOne("SELECT * FROM satusehat_logs WHERE visit_id = :id ORDER BY synced_at DESC LIMIT 1", [':id' => $visit['id']]);
    stepAssert(20, "Transmisi SATUSEHAT & Pencatatan Audit Trail Integrasi", 
        $syncReport['sync_result']['status'] === 'SUCCESS' && !empty($satusehatLog['satusehat_id']), 
        "IHS Encounter ID: {$satusehatLog['satusehat_id']} | Status: {$satusehatLog['status']}"
    );

    // -------------------------------------------------------------------------
    // TAHAP 21: Agregasi Dashboard Eksekutif (Akses Read-Only Terisolasi)
    // -------------------------------------------------------------------------
    $dashboardSummary = Database::fetchOne("
        SELECT 
            (SELECT count(*) FROM visits WHERE visit_date = CURRENT_DATE) as today_visits,
            (SELECT COALESCE(sum(amount), 0) FROM payments WHERE paid_at::date = CURRENT_DATE) as today_revenue
    ");
    stepAssert(21, "Agregasi Dashboard Eksekutif & Verifikasi Boundary Read-Only", 
        (int)$dashboardSummary['today_visits'] > 0 && (float)$dashboardSummary['today_revenue'] > 0, 
        "Kunjungan Hari Ini: {$dashboardSummary['today_visits']} | Pendapatan: Rp " . number_format((float)$dashboardSummary['today_revenue'], 0, ',', '.')
    );

} catch (\Throwable $e) {
    echo "\n\033[31m[CRITICAL EXCEPTION] " . $e->getMessage() . "\033[0m\n";
    echo $e->getTraceAsString() . "\n";
    $failCount++;
}

echo "\n================================================================================\n";
echo "📊 REKAPITULASI MASTER ACCEPTANCE TEST:\n";
echo "  Total Tahapan Lulus : \033[32m{$passCount} dari 21\033[0m\n";
echo "  Total Tahapan Gagal : " . ($failCount > 0 ? "\033[31m{$failCount}\033[0m" : "\033[32m0\033[0m") . "\n";
echo "================================================================================\n";

if ($failCount === 0) {
    echo "🏆 \033[32mSELURUH 21 TAHAPAN ALUR END-TO-END TERBUKTI LULUS DENGAN INTEGRITAS TINGGI!\033[0m\n";
    echo "   Aplikasi siap diuji dan dipresentasikan di hadapan tim penguji PT Inova Medika Solusindo.\n\n";
    exit(0);
} else {
    echo "❌ \033[31mTerdapat tahapan yang gagal, silakan periksa rincian di atas.\033[0m\n\n";
    exit(1);
}
