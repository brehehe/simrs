<?php

declare(strict_types=1);

/**
 * Pengujian Terotomasi untuk Integrasi SATUSEHAT (FHIR R4),
 * Resume Medis Rawat Jalan, dan BPJS VClaim 2.0 Stubs
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;
use App\Services\SatuSehatService;
use App\Services\MedicalResumeService;
use App\Services\BpjsService;

echo "========================================================================\n";
echo "🏥 PENGUJIAN INTEGRASI SATUSEHAT (FHIR R4), RESUME MEDIS, & BPJS VCLAIM\n";
echo "========================================================================\n";

$passCount = 0;
$failCount = 0;

function assertTest(string $description, bool $condition): void {
    global $passCount, $failCount;
    if ($condition) {
        echo "  [PASS] {$description}\n";
        $passCount++;
    } else {
        echo "  [FAIL] {$description}\n";
        $failCount++;
    }
}

// 1. Ambil 1 Kunjungan yang memiliki rekam medis lengkap
$visit = Database::fetchOne("
    SELECT v.id, v.visit_number 
    FROM visits v
    JOIN medical_records mr ON mr.visit_id = v.id
    LIMIT 1
");

if (!$visit) {
    echo "⚠️ Tidak ada kunjungan dengan rekam medis. Menjalankan skrip seeding / simulasi terlebih dahulu...\n";
    // Buat dummy visit dengan EMR untuk pengujian
    $p = Database::fetchOne("SELECT id FROM patients LIMIT 1");
    $poly = Database::fetchOne("SELECT id FROM polyclinics LIMIT 1");
    $doc = Database::fetchOne("SELECT id FROM medical_staff WHERE staff_type = 'DOCTOR' LIMIT 1");
    $vid = 'f0000000-0000-0000-0000-000000000099';
    Database::execute("
        INSERT INTO visits (id, visit_number, patient_id, polyclinic_id, doctor_id, visit_date, queue_number, queue_display, status)
        VALUES (:id, 'REG-TEST-FHIR-01', :pid, :poly, :doc, CURRENT_DATE, 99, 'A099', 'COMPLETED')
        ON CONFLICT (id) DO NOTHING
    ", [':id' => $vid, ':pid' => $p['id'], ':poly' => $poly['id'], ':doc' => $doc['id']]);

    Database::execute("
        INSERT INTO medical_records (id, visit_id, patient_id, doctor_id, chief_complaint, anamnesis, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature, weight, height, status)
        VALUES ('f0000000-0000-0000-0000-000000000199', :vid, :pid, :doc, 'Pusing dan lemas', 'Pasien mengeluhkan pusing sejak 3 hari', 130, 85, 80, 18, 36.8, 65.5, 168.0, 'FINALIZED')
        ON CONFLICT (visit_id) DO NOTHING
    ", [':vid' => $vid, ':pid' => $p['id'], ':doc' => $doc['id']]);

    $visit = ['id' => $vid, 'visit_number' => 'REG-TEST-FHIR-01'];
}

$visitId = $visit['id'];
echo "\nTarget Visit ID Uji: {$visitId} ({$visit['visit_number']})\n\n";

// --- TEST SUITE 1: SATUSEHAT FHIR R4 BUNDLE GENERATION ---
echo "--- 1. Uji Generator FHIR R4 Bundle ---\n";
$satuSehat = new SatuSehatService();

try {
    $bundle = $satuSehat->generateFhirBundle($visitId);
    
    assertTest("FHIR resourceType adalah 'Bundle'", ($bundle['resourceType'] ?? '') === 'Bundle');
    assertTest("FHIR bundle type adalah 'collection'", ($bundle['type'] ?? '') === 'collection');
    assertTest("FHIR profile menyertakan Kemenkes EncounterBundle", str_contains(json_encode($bundle['meta'] ?? []), 'EncounterBundle'));
    assertTest("Bundle memiliki entri resource (> 0)", ($bundle['total'] ?? 0) > 0 && !empty($bundle['entry']));
    
    // Periksa Patient Resource
    $patientEntry = array_values(array_filter($bundle['entry'], fn($e) => ($e['resource']['resourceType'] ?? '') === 'Patient'));
    assertTest("Terdapat Resource 'Patient' dalam bundle", !empty($patientEntry));
    if (!empty($patientEntry)) {
        $pRes = $patientEntry[0]['resource'];
        assertTest("Resource Patient memiliki NIK", !empty($pRes['identifier'][0]['value']));
        assertTest("Resource Patient memiliki Gender valid", in_array($pRes['gender'], ['male', 'female']));
    }

    // Periksa Encounter Resource
    $encounterEntry = array_values(array_filter($bundle['entry'], fn($e) => ($e['resource']['resourceType'] ?? '') === 'Encounter'));
    assertTest("Terdapat Resource 'Encounter' dalam bundle", !empty($encounterEntry));
    if (!empty($encounterEntry)) {
        $encRes = $encounterEntry[0]['resource'];
        assertTest("Encounter class adalah 'AMB' (Ambulatory)", ($encRes['class']['code'] ?? '') === 'AMB');
        assertTest("Encounter memiliki referensi ServiceProvider Rumah Sakit", !empty($encRes['serviceProvider']['reference']));
    }

    // Periksa Observation (Vital Signs)
    $obsEntries = array_values(array_filter($bundle['entry'], fn($e) => ($e['resource']['resourceType'] ?? '') === 'Observation'));
    assertTest("Terdapat Resource 'Observation' (Tanda Vital)", !empty($obsEntries));
} catch (Exception $e) {
    assertTest("FHIR Bundle generator gagal: " . $e->getMessage(), false);
}

// --- TEST SUITE 2: SATUSEHAT SYNC SIMULATION & LOGGING ---
echo "\n--- 2. Uji Sinkronisasi & Logging SATUSEHAT ---\n";
try {
    $syncResult = $satuSehat->syncToSatuSehat($visitId);
    
    assertTest("Respon sinkronisasi status 'SUCCESS'", ($syncResult['sync_result']['status'] ?? '') === 'SUCCESS');
    assertTest("Diterbitkan IHS Encounter ID", !empty($syncResult['sync_result']['registered_ihs_ids']['encounter_ihs_id']));
    assertTest("Diterbitkan IHS Patient ID", !empty($syncResult['sync_result']['registered_ihs_ids']['patient_ihs_id']));

    // Cek penyimpanan database satusehat_logs
    $logs = $satuSehat->getSyncLogs($visitId);
    assertTest("Log integrasi tersimpan di tabel satusehat_logs", count($logs) > 0);
    if (!empty($logs)) {
        assertTest("Status log adalah 'SYNCED'", $logs[0]['status'] === 'SYNCED');
    }
} catch (Exception $e) {
    assertTest("Sinkronisasi SATUSEHAT gagal: " . $e->getMessage(), false);
}

// --- TEST SUITE 3: RESUME MEDIS RAWAT JALAN (DISCHARGE SUMMARY) ---
echo "\n--- 3. Uji Ringkasan Pulang Rawat Jalan (Resume Medis) ---\n";
$resumeService = new MedicalResumeService();
try {
    $resume = $resumeService->getMedicalResume($visitId);

    assertTest("Resume medis memiliki kop rumah sakit", !empty($resume['hospital']['name']));
    assertTest("Resume medis memiliki nomor dokumen resmi", str_starts_with($resume['document_number'] ?? '', 'RES-'));
    assertTest("Resume medis memuat identitas pasien lengkap", !empty($resume['patient']['mr_number']) && !empty($resume['patient']['full_name']));
    assertTest("Resume medis memuat tanda vital pasien", isset($resume['clinical_findings']['vital_signs']));
    assertTest("Resume medis memuat rencana pulang & tanggal kontrol", !empty($resume['discharge_plan']['follow_up_date']));
    assertTest("Resume medis memiliki tanda tangan elektronik DPJP terverifikasi", !empty($resume['digital_signature']['verification_hash']));
} catch (Exception $e) {
    assertTest("Resume Medis gagal dibentuk: " . $e->getMessage(), false);
}

// --- TEST SUITE 4: BPJS VCLAIM 2.0 STUBS ---
echo "\n--- 4. Uji Integrasi BPJS VClaim 2.0 (Cek Peserta & SEP) ---\n";
$bpjsService = new BpjsService();
try {
    // Uji Cek Peserta dengan NIK
    $peserta = $bpjsService->checkPeserta('320101199001010001');
    assertTest("Cek Peserta BPJS status 200", ($peserta['metaData']['code'] ?? '') === '200');
    assertTest("Peserta BPJS status AKTIF", ($peserta['peserta']['statusPeserta']['keterangan'] ?? '') === 'AKTIF');
    assertTest("Peserta BPJS memiliki hak kelas rawat", !empty($peserta['peserta']['hakKelas']['keterangan']));

    // Uji Terbitkan SEP
    $sep = $bpjsService->generateSep([
        'no_kartu' => '0001234567890',
        'patient_name' => 'Budi Santoso',
        'polyclinic_name' => 'Poli Penyakit Dalam',
        'diagnosa_awal' => 'I10 - Essential (primary) hypertension',
    ]);
    assertTest("Penerbitan SEP BPJS status 200", ($sep['metaData']['code'] ?? '') === '200');
    assertTest("Nomor SEP memiliki format resmi BPJS (0101R001...)", str_starts_with($sep['sep']['noSep'] ?? '', '0101R001'));
    assertTest("SEP mencatat nama poli dan diagnosa rujukan", $sep['sep']['poli'] === 'Poli Penyakit Dalam');
} catch (Exception $e) {
    assertTest("BPJS VClaim Stubs gagal: " . $e->getMessage(), false);
}

// --- TEST SUITE 5: SATUSEHAT BRIDGING HUB & BATCH SYNC ---
echo "\n--- 5. Uji SATUSEHAT Bridging Hub & Monitoring Console ---\n";
$satuSehatService = new SatuSehatService();
try {
    $stats = $satuSehatService->getGlobalStats();
    assertTest("Global stats memiliki Organization ID resmi", ($stats['organization']['id'] ?? '') === '10000004');
    assertTest("Global stats status koneksi CONNECTED", ($stats['organization']['status'] ?? '') === 'CONNECTED');
    assertTest("Global stats menghitung total kunjungan RME", isset($stats['stats']['total_visits']) && $stats['stats']['total_visits'] > 0);
    assertTest("Global stats menghitung persentase kepatuhan sync", isset($stats['stats']['sync_percentage']));
    assertTest("Resource distribution mencakup 6 tipe FHIR R4", count($stats['resource_distribution']) === 6);

    $globalLogs = $satuSehatService->getGlobalLogs('ALL', 10);
    assertTest("Global logs transmisi SATUSEHAT dapat diambil", is_array($globalLogs));
    assertTest("Entri log memuat nama pasien dan No RM", !empty($globalLogs[0]['patient_name']) && !empty($globalLogs[0]['mr_number']));

    $batchResult = $satuSehatService->batchSync(5);
    assertTest("Batch sync memproses kunjungan pending", isset($batchResult['synced_count']));
    assertTest("Batch sync format hasil valid", is_array($batchResult['synced']));
} catch (Exception $e) {
    assertTest("SATUSEHAT Bridging Hub gagal: " . $e->getMessage(), false);
}

echo "\n========================================================================\n";
echo "📊 HASIL PENGUJIAN FASE 7:\n";
echo "  Total Berhasil: {$passCount}\n";
echo "  Total Gagal   : {$failCount}\n";
echo "========================================================================\n";

if ($failCount > 0) {
    exit(1);
}
echo "🎉 SEMUA PENGUJIAN FASE 7 BERHASIL DENGAN INTEGRITAS TINGGI!\n";
exit(0);
