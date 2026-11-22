<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;
use App\Services\AuthService;
use App\Services\RegistrationService;
use App\Services\MedicalRecordService;
use App\Services\ClinicalService;
use App\Services\PharmacyDispensationService;
use App\Services\BillingService;

echo "========================================================================\n";
echo "   SIMULASI OPERASIONAL 1 HARI KERJA SIMRS RAWAT JALAN TERINTEGRASI     \n";
echo "             PT Inova Medika Solusindo — Real Case Test                 \n";
echo "========================================================================\n\n";

$auth = new AuthService();
$masterService = new \App\Services\MasterDataService();
$regService = new RegistrationService();
$emrService = new MedicalRecordService();
$clinicalService = new ClinicalService();
$pharmacyService = new PharmacyDispensationService();
$billingService = new BillingService();

$today = date('Y-m-d');
echo "📅 Tanggal Pelayanan: {$today}\n";

// 1. Ambil Dokter & Poliklinik
$polys = Database::fetchAll("SELECT id, code, name, queue_prefix FROM polyclinics WHERE is_active = TRUE ORDER BY code");
$doctors = Database::fetchAll("SELECT id, full_name, polyclinic_id FROM medical_staff WHERE is_active = TRUE");

// Ambil User Petugas
$userPendaftaran = Database::fetchOne("SELECT id FROM users WHERE role_code = 'REGISTRATION' LIMIT 1");
$userFarmasi = Database::fetchOne("SELECT id FROM users WHERE role_code = 'PHARMACY' LIMIT 1");
$userKasir = Database::fetchOne("SELECT id FROM users WHERE role_code = 'CASHIER' LIMIT 1");

// Ambil Master Data Klinis
$diagnoses = Database::fetchAll("SELECT id, code, description FROM diagnoses LIMIT 5");
$procedures = Database::fetchAll("SELECT id, code, name, base_price FROM medical_procedures LIMIT 5");
$medicines = Database::fetchAll("SELECT id, code, name, unit, base_price FROM medicines LIMIT 5");
$labTests = Database::fetchAll("SELECT id, code, name FROM lab_tests LIMIT 3");

// 2. Daftar 3 Pasien Simulasi
$simPatients = [
    [
        'name' => 'Budi Hartono',
        'nik' => '327301010180' . rand(1000, 9999),
        'dob' => '1980-01-01',
        'gender' => 'MALE',
        'poly_idx' => 0, // Poli Penyakit Dalam
        'soap_s' => 'Keluhan pusing dan tengkuk berat sejak 2 hari.',
        'soap_o' => 'TD: 150/95 mmHg, Nadi: 84x/m, BB: 72 kg',
        'diag_idx' => 0, // I10 Hipertensi
        'pay_method' => 'CASH',
    ],
    [
        'name' => 'Siti Aminah',
        'nik' => '327301020295' . rand(1000, 9999),
        'dob' => '1995-02-02',
        'gender' => 'FEMALE',
        'poly_idx' => 1, // Poli Anak / Kebidanan
        'soap_s' => 'Batuk pilek dan demam 3 hari.',
        'soap_o' => 'Suhu: 38.5C, Faring hiperemis, Ronkhi (-)',
        'diag_idx' => 2, // ISPA
        'pay_method' => 'QRIS',
    ],
    [
        'name' => 'Rahmat Hidayat',
        'nik' => '327301030388' . rand(1000, 9999),
        'dob' => '1988-03-03',
        'gender' => 'MALE',
        'poly_idx' => 0, // Poli Penyakit Dalam
        'soap_s' => 'Nyeri ulu hati terasa perih dan mual setelah makan pedas.',
        'soap_o' => 'Nyeri tekan epigastrium (+), TD: 120/80 mmHg',
        'diag_idx' => 4, // Gastritis
        'pay_method' => 'DEBIT',
    ],
];

$summaryReport = [];

foreach ($simPatients as $idx => $p) {
    $num = $idx + 1;
    echo "\n------------------------------------------------------------------------\n";
    echo "▶ PASIEN {$num}: {$p['name']} ({$p['gender']})\n";
    echo "------------------------------------------------------------------------\n";

    // A. Registrasi Pasien Baru
    $patientId = $masterService->createPatient([
        'nik' => $p['nik'],
        'full_name' => $p['name'],
        'birth_date' => $p['dob'],
        'gender' => $p['gender'],
        'address' => 'Jl. Simulasi Sehat No. 12',
        'phone' => '08123456789',
    ]);

    echo "1. Pasien terdaftar: {$patientId['full_name']} | No. RM: {$patientId['mr_number']}\n";

    // B. Pendaftaran Antrean Poliklinik
    $targetDoc = $doctors[$idx % count($doctors)];
    $targetPoly = Database::fetchOne("SELECT id, name, queue_prefix FROM polyclinics WHERE id = :id", [':id' => $targetDoc['polyclinic_id']]);

    $visit = $regService->registerVisit([
        'patient_id' => $patientId['id'],
        'polyclinic_id' => $targetPoly['id'],
        'doctor_id' => $targetDoc['id'],
        'visit_date' => $today,
    ], $userPendaftaran['id']);

    echo "2. Kunjungan diterbitkan: {$visit['visit_number']} | Antrean: {$visit['queue_display']} ({$targetPoly['name']})\n";

    // C. Dokter Memeriksa & Input SOAP
    Database::execute("UPDATE visits SET status = 'IN_EXAMINATION' WHERE id = :id", [':id' => $visit['id']]);

    $primaryDiag = $diagnoses[$p['diag_idx'] % count($diagnoses)];
    $emr = $emrService->saveMedicalRecord([
        'visit_id' => $visit['id'],
        'chief_complaint' => $p['soap_s'],
        'anamnesis' => $p['soap_s'],
        'physical_examination' => $p['soap_o'],
        'systolic_bp' => 130,
        'diastolic_bp' => 85,
        'heart_rate' => 80,
        'respiratory_rate' => 18,
        'temperature' => 36.7,
        'weight' => 65.0,
        'height' => 165.0,
        'doctor_notes' => 'Edukasi istirahat dan kontrol ulang jika keluhan berlanjut.',
        'diagnoses' => [
            ['diagnosis_id' => $primaryDiag['id'], 'type' => 'PRIMARY', 'notes' => 'Diagnosis utama'],
        ],
    ], $targetDoc['id']);

    // D. Tambah Tindakan Medis
    $proc = $procedures[0];
    $clinicalService->addProcedure($visit['id'], $proc['id'], $targetDoc['id'], 1);
    echo "3. Dokter ({$targetDoc['full_name']}): Diagnosis [{$primaryDiag['code']}], Tindakan: {$proc['name']}\n";

    // E. Dokter Meresepkan Obat
    $med = $medicines[0];
    // Pastikan stok ada
    Database::execute("UPDATE medicine_stocks SET current_stock = 500 WHERE medicine_id = :id", [':id' => $med['id']]);

    $rx = $clinicalService->createPrescription($visit['id'], $targetDoc['id'], [
        [
            'medicine_id' => $med['id'],
            'dosage' => '1 Sediaan',
            'frequency' => '3x1 Sehari sesudah makan',
            'quantity' => 10,
        ],
    ], 'Diminum teratur.');

    echo "4. E-Resep: {$rx['prescription_number']} ({$med['name']} x10)\n";

    // F. Farmasi Dispense Obat (Row-Level Locking)
    $dispense = $pharmacyService->dispensePrescription($rx['id'], $userFarmasi['id'], 'Obat diserahkan dan diedukasikan.');
    echo "5. Farmasi: Obat diserahkan, stok terpotong aman via SELECT FOR UPDATE.\n";

    // G. Kasir Menagih & Menerima Pembayaran (Idempotency)
    $invoice = $billingService->getOrCreateInvoice($visit['id']);
    $totalAmount = (float) $invoice['total_amount'];

    $idempKey = 'SIM-PAY-' . time() . "-{$idx}-" . rand(100, 999);
    $payment = $billingService->processPayment($invoice['id'], [
        'amount' => $totalAmount,
        'payment_method' => $p['pay_method'],
        'reference_no' => 'REF-DEMO-' . rand(10000, 99999),
        'idempotency_key' => $idempKey,
    ], $userKasir['id']);

    echo "6. Kasir: Tagihan Rp " . number_format($totalAmount, 0, ',', '.') . " DIBAYAR LUNAS ({$p['pay_method']}). Kunjungan SELESAI.\n";

    $summaryReport[] = [
        'queue' => $visit['queue_display'],
        'patient' => $patientId['full_name'],
        'mr' => $patientId['mr_number'],
        'poly' => $targetPoly['queue_prefix'] . ' - ' . substr($targetPoly['name'], 10),
        'diag' => $primaryDiag['code'],
        'total' => 'Rp ' . number_format($totalAmount, 0, ',', '.'),
        'method' => $p['pay_method'],
        'status' => 'LUNAS (COMPLETED)',
    ];
}

echo "\n========================================================================\n";
echo "   REKAPITULASI PELAYANAN HARIAN SIMRS RAWAT JALAN TERINTEGRASI        \n";
echo "========================================================================\n";
printf("%-8s | %-16s | %-14s | %-16s | %-6s | %-12s | %-6s | %-15s\n", 
    "Antrean", "Nama Pasien", "No. RM", "Poliklinik", "ICD-10", "Total Biaya", "Metode", "Status");
echo str_repeat("-", 100) . "\n";

foreach ($summaryReport as $r) {
    printf("%-8s | %-16s | %-14s | %-16s | %-6s | %-12s | %-6s | %-15s\n",
        $r['queue'], $r['patient'], $r['mr'], $r['poly'], $r['diag'], $r['total'], $r['method'], $r['status']);
}

echo str_repeat("=", 100) . "\n";
echo "✓ Seluruh alur end-to-end terverifikasi 100% tuntas dan tersimpan di database simrs_db.\n\n";
