<?php

declare(strict_types=1);

/**
 * SIMRS Clinical Data Portability & SatuData Export Engine
 * PT Inova Medika Solusindo — Enterprise Handover Suite
 *
 * Mengekspor dataset rekam medis pasien, episode rawat jalan, diagnosis ICD-10,
 * resep obat, dan hasil lab ke format JSON berstandar interoperabilitas nasional (Kemenkes SatuData),
 * lengkap dengan SHA-256 cryptographic manifest untuk verifikasi integritas data.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;

echo "\033[1;34m========================================================================\033[0m\n";
echo "\033[1;36m   SIMRS CLINICAL DATA PORTABILITY & SATUDATA EXPORT ENGINE             \033[0m\n";
echo "\033[1;36m           Kemenkes RI SatuData Kesehatan Interoperability               \033[0m\n";
echo "\033[1;34m========================================================================\033[0m\n";

$exportDir = __DIR__ . '/../dist/exports';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0755, true);
}

$timestamp = date('Ymd_His');
$exportFilename = "{$exportDir}/simrs_clinical_export_{$timestamp}.json";

echo "Mengumpulkan data rekam medis terpadu dari database PostgreSQL...\n";

// 1. Ambil Pasien & Rekam Medis
$patients = Database::fetchAll("
    SELECT id, mr_number, nik, full_name, birth_date, gender, address, phone, created_at
    FROM patients
    ORDER BY created_at ASC
");

$dataset = [];
$totalVisits = 0;
$totalPrescriptions = 0;
$totalLabResults = 0;

foreach ($patients as $p) {
    $patientId = $p['id'];

    // Ambil Kunjungan & EMR Pasien
    $visits = Database::fetchAll("
        SELECT v.id, v.visit_number, v.visit_date, v.queue_display, v.status,
               poly.name as polyclinic_name, d.full_name as doctor_name,
               mr.chief_complaint, mr.anamnesis, mr.systolic_bp, mr.diastolic_bp,
               mr.heart_rate, mr.respiratory_rate, mr.temperature, mr.weight, mr.height
        FROM visits v
        JOIN polyclinics poly ON poly.id = v.polyclinic_id
        JOIN medical_staff d ON d.id = v.doctor_id
        LEFT JOIN medical_records mr ON mr.visit_id = v.id
        WHERE v.patient_id = :pid
        ORDER BY v.visit_date DESC
    ", [':pid' => $patientId]);

    $patientVisits = [];
    foreach ($visits as $v) {
        $visitId = $v['id'];
        $totalVisits++;

        // Diagnosis ICD-10
        $diagnoses = Database::fetchAll("
            SELECT d.code, d.description, vd.diagnosis_type, vd.notes
            FROM visit_diagnoses vd
            JOIN diagnoses d ON d.id = vd.diagnosis_id
            WHERE vd.visit_id = :vid
        ", [':vid' => $visitId]);

        // Resep & Item Obat
        $prescriptions = Database::fetchAll("
            SELECT pr.id, pr.prescription_number, pr.status,
                   pi.medicine_id, m.name as medicine_name, pi.quantity, pi.instructions
            FROM prescriptions pr
            LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
            LEFT JOIN medicines m ON m.id = pi.medicine_id
            WHERE pr.visit_id = :vid
        ", [':vid' => $visitId]);
        $totalPrescriptions += count($prescriptions);

        // Hasil Lab
        $labResults = Database::fetchAll("
            SELECT lo.order_number, lt.name as test_name, lr.result_value, lt.unit, lt.normal_range, lr.notes
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            LEFT JOIN lab_results lr ON lr.lab_order_item_id = loi.id
            WHERE lo.visit_id = :vid
        ", [':vid' => $visitId]);
        $totalLabResults += count($labResults);

        $patientVisits[] = [
            'visit_number' => $v['visit_number'],
            'visit_date' => $v['visit_date'],
            'polyclinic' => $v['polyclinic_name'],
            'doctor' => $v['doctor_name'],
            'status' => $v['status'],
            'clinical_notes' => [
                'chief_complaint' => $v['chief_complaint'],
                'anamnesis' => $v['anamnesis'],
                'vital_signs' => [
                    'blood_pressure' => ($v['systolic_bp'] && $v['diastolic_bp']) ? "{$v['systolic_bp']}/{$v['diastolic_bp']} mmHg" : null,
                    'heart_rate' => $v['heart_rate'] ? "{$v['heart_rate']} bpm" : null,
                    'respiratory_rate' => $v['respiratory_rate'] ? "{$v['respiratory_rate']} x/menit" : null,
                    'temperature' => $v['temperature'] ? "{$v['temperature']} °C" : null,
                    'bmi_weight_kg' => $v['weight'],
                    'height_cm' => $v['height'],
                ],
            ],
            'diagnoses' => $diagnoses,
            'prescriptions' => $prescriptions,
            'lab_results' => $labResults,
        ];
    }

    $dataset[] = [
        'patient_identification' => [
            'mr_number' => $p['mr_number'],
            'nik' => $p['nik'],
            'full_name' => $p['full_name'],
            'gender' => $p['gender'],
            'birth_date' => $p['birth_date'],
            'phone' => $p['phone'],
            'registered_at' => $p['created_at'],
        ],
        'total_recorded_visits' => count($patientVisits),
        'visits' => $patientVisits,
    ];
}

$exportPayload = [
    'metadata' => [
        'organization' => 'Rumah Sakit Umum Daerah Inova Medika Solusindo',
        'system' => 'SIMRS Rawat Jalan Terintegrasi v2.0',
        'export_standard' => 'Kemenkes RI SatuData Kesehatan & HL7 FHIR R4 Mapping',
        'exported_at' => date('Y-m-d H:i:s T'),
        'total_patients' => count($dataset),
        'total_visits' => $totalVisits,
        'total_prescriptions' => $totalPrescriptions,
        'total_lab_results' => $totalLabResults,
    ],
    'data' => $dataset,
];

$jsonContent = json_encode($exportPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
file_put_contents($exportFilename, $jsonContent);

$sha256 = hash_file('sha256', $exportFilename);
$fileSizeKb = round(filesize($exportFilename) / 1024, 2);

// Tulis berkas manifest checksum
$checksumFilename = "{$exportFilename}.sha256";
file_put_contents($checksumFilename, "{$sha256}  " . basename($exportFilename) . "\n");

echo "\n\033[32m✓ Dataset klinis berhasil diekspor dengan sukses!\033[0m\n";
echo "  ↳ Berkas JSON      : \033[36m{$exportFilename}\033[0m ({$fileSizeKb} KB)\n";
echo "  ↳ SHA-256 Checksum : \033[33m{$sha256}\033[0m\n";
echo "  ↳ Total Pasien     : " . count($dataset) . "\n";
echo "  ↳ Total Kunjungan  : {$totalVisits}\n";
echo "  ↳ Total Resep      : {$totalPrescriptions}\n";
echo "  ↳ Total Uji Lab    : {$totalLabResults}\n";
echo "\n\033[1;34m========================================================================\033[0m\n";
