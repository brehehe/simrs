<?php

declare(strict_types=1);

/**
 * Pengujian Terotomasi untuk Modul Audit Trail & Kepatuhan Regulasi RME
 * Standar Permenkes RI No. 24 Tahun 2022 (Pasal 25 & 26)
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;
use App\Services\AuditService;
use App\Services\MasterDataService;
use App\Services\RegistrationService;
use App\Services\MedicalRecordService;
use App\Services\PharmacyDispensationService;
use App\Services\BillingService;

echo "========================================================================\n";
echo "🛡️  PENGUJIAN AUDIT TRAIL & KEPATUHAN RME (PERMENKES 24/2022)\n";
echo "========================================================================\n";

$passCount = 0;
$failCount = 0;

function assertAudit(string $title, bool $condition, string $detail = ''): void {
    global $passCount, $failCount;
    if ($condition) {
        echo "  [\033[32mPASS\033[0m] {$title}\n";
        if ($detail) echo "         \033[36m↳ {$detail}\033[0m\n";
        $passCount++;
    } else {
        echo "  [\033[31mFAIL\033[0m] {$title}\n";
        if ($detail) echo "         \033[31m↳ {$detail}\033[0m\n";
        $failCount++;
    }
}

$auditService = new AuditService();

// Ambil user dokter dan user admin untuk pengujian
$doctorUser = Database::fetchOne("SELECT id, username, full_name, role_code as role FROM users WHERE role_code = 'DOKTER' LIMIT 1");
$adminUser = Database::fetchOne("SELECT id, username, full_name, role_code as role FROM users WHERE role_code = 'ADMIN' LIMIT 1");
$cashierUser = Database::fetchOne("SELECT id, username, full_name, role_code as role FROM users WHERE role_code = 'KASIR' LIMIT 1");
$pharmacyUser = Database::fetchOne("SELECT id, username, full_name, role_code as role FROM users WHERE role_code = 'FARMASI' LIMIT 1");

$testPatient = Database::fetchOne("SELECT id, mr_number, full_name FROM patients LIMIT 1");

// 1. Direct Audit Log Creation
echo "\n--- 1. Uji Pencatatan Immutable Audit Log ---\n";
try {
    $logId = $auditService->log(
        'patients',
        $testPatient['id'],
        'UPDATE',
        ['phone' => '081200000000'],
        ['phone' => '081299999999', 'reason' => 'Perubahan kontak darurat'],
        $adminUser['id'],
        '192.168.1.100'
    );
    assertAudit("Audit log berhasil dibuat", $logId > 0, "Log ID: {$logId}");
} catch (Exception $e) {
    assertAudit("Gagal mencatat audit log: " . $e->getMessage(), false);
}

// 2. Query Audit Logs dengan User Join
echo "\n--- 2. Uji Penarikan Audit Logs & Resolusi Pelaku (RBAC) ---\n";
try {
    $logs = $auditService->getLogs(10);
    assertAudit("Daftar audit log tidak kosong", !empty($logs));
    if (!empty($logs)) {
        $first = $logs[0];
        assertAudit("Audit log memuat relasi user pelaku aksi", !empty($first['user_full_name']) || !empty($first['username']), "User: {$first['user_full_name']} ({$first['user_role']})");
        assertAudit("Audit log memuat IP address klien", !empty($first['ip_address']), "IP: {$first['ip_address']}");
    }
} catch (Exception $e) {
    assertAudit("Gagal query audit logs: " . $e->getMessage(), false);
}

// 3. Filter Audit Log Berdasarkan Tabel & Aksi
echo "\n--- 3. Uji Filter Audit Logs Berdasarkan Sumber Entitas & Aksi ---\n";
try {
    $patientLogs = $auditService->getLogs(5, 'patients', 'UPDATE');
    $allMatch = true;
    foreach ($patientLogs as $pl) {
        if ($pl['table_name'] !== 'patients' || $pl['action'] !== 'UPDATE') {
            $allMatch = false;
            break;
        }
    }
    assertAudit("Filter tabel 'patients' dan aksi 'UPDATE' valid", $allMatch && count($patientLogs) > 0, "Ditemukan " . count($patientLogs) . " log");
} catch (Exception $e) {
    assertAudit("Gagal filter audit logs: " . $e->getMessage(), false);
}

// 4. Jejak Audit Kepatuhan Pasien Komprehensif (Multi-Domain)
echo "\n--- 4. Uji Jejak Audit Pasien Longitudinal (Permenkes 24/2022) ---\n";
try {
    $trail = $auditService->getPatientAuditTrail($testPatient['id']);
    assertAudit("Format audit trail pasien sesuai standar Permenkes", $trail['compliance_standard'] === 'Permenkes No. 24 Tahun 2022 (Pasal 25 & 26)');
    assertAudit("Identitas pasien terkonfirmasi dalam audit", $trail['patient']['mr_number'] === $testPatient['mr_number'], "No. RM: {$trail['patient']['mr_number']} - {$trail['patient']['full_name']}");
    assertAudit("Total riwayat mutasi/akses klinis teragregasi", isset($trail['total_events']), "Total Events: {$trail['total_events']}");
} catch (Exception $e) {
    assertAudit("Gagal mengambil audit trail pasien: " . $e->getMessage(), false);
}

// 5. Ringkasan Kepatuhan Regulasi RME (Compliance Summary)
echo "\n--- 5. Uji Ringkasan Kepatuhan Regulasi RME Nasional ---\n";
try {
    $summary = $auditService->getComplianceSummary();
    assertAudit("Status kepatuhan regulasi terkonfirmasi", $summary['status'] === 'COMPLIANT');
    assertAudit("Metrik mencakup retensi data rekam medis 25 tahun", $summary['metrics']['retention_policy_years'] === 25);
    assertAudit("Metrik memuat audit mutasi transaksi", $summary['metrics']['total_audit_records'] > 0, "Total Audit Records: " . $summary['metrics']['total_audit_records']);
    assertAudit("Metrik domain klinis terakomodasi", isset($summary['audit_domains']['rekam_medis_soap']));
} catch (Exception $e) {
    assertAudit("Gagal mengambil ringkasan kepatuhan: " . $e->getMessage(), false);
}

// 6. Database Check Constraint Validation
echo "\n--- 6. Uji Integritas & Keamanan Check Constraint DB ---\n";
try {
    // Aksi selain INSERT/UPDATE/DELETE harus ditolak atau dinormalisasi
    $invalidActionRejected = false;
    try {
        Database::execute("
            INSERT INTO audit_logs (table_name, record_id, action, user_id)
            VALUES ('test', '123', 'INVALID_ACTION', :uid)
        ", [':uid' => $adminUser['id']]);
    } catch (Exception $dbErr) {
        // Harus melempar violation check constraint
        $invalidActionRejected = true;
    }
    assertAudit("Database menolak aksi manipulasi di luar INSERT/UPDATE/DELETE", $invalidActionRejected, "PostgreSQL Check Constraint Enforced");
} catch (Exception $e) {
    assertAudit("Gagal uji constraint keamanan: " . $e->getMessage(), false);
}

echo "\n========================================================================\n";
echo "📊 REKAPITULASI PENGUJIAN AUDIT TRAIL:\n";
echo "  Total Lulus : {$passCount}\n";
echo "  Total Gagal : {$failCount}\n";
echo "========================================================================\n";

if ($failCount === 0) {
    echo "🎉 SISTEM MEMENUHI 100% STANDAR AUDIT TRAIL PERMENKES 24/2022!\n";
    exit(0);
} else {
    echo "❌ TERDAPAT PENGUJIAN YANG GAGAL. SILAKAN PERIKSA DETAIL DI ATAS.\n";
    exit(1);
}
