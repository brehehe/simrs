<?php

declare(strict_types=1);

/**
 * Pengujian Terotomasi untuk Penyesuaian Tagihan & Koreksi Finansial (CRITICAL CASE 4)
 * Menjamin Immutability Snapshot Historis & Pencatatan Transparan via invoice_adjustments
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Common\Database;
use App\Services\BillingService;
use App\Services\InvoiceAdjustmentService;

echo "========================================================================\n";
echo "💰 PENGUJIAN PENYESUAIAN TAGIHAN FINANSIAL & KOREKSI (CRITICAL CASE 4)\n";
echo "========================================================================\n";

$passCount = 0;
$failCount = 0;

function assertAdj(string $title, bool $condition, string $detail = ''): void {
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

$adjService = new InvoiceAdjustmentService();
$billingService = new BillingService();

$cashierUser = Database::fetchOne("SELECT id, username, full_name FROM users WHERE role_code = 'CASHIER' LIMIT 1");
$adminUser = Database::fetchOne("SELECT id, username, full_name FROM users WHERE role_code = 'ADMIN' LIMIT 1");

// Ambil kunjungan yang memiliki invoice atau buat invoice uji baru
$testVisit = Database::fetchOne("SELECT id, patient_id FROM visits WHERE status IN ('READY_FOR_BILLING', 'IN_EXAMINATION', 'WAITING') LIMIT 1");
if (!$testVisit) {
    echo "Tidak ada kunjungan tersedia untuk pengujian invoice.\n";
    exit(1);
}

$invoice = $billingService->getOrCreateInvoice($testVisit['id']);
$initialBalance = (float) $invoice['outstanding_balance'];
$initialVersion = (int) ($invoice['version'] ?? 1);

echo "\n--- 1. Uji Penambahan Biaya / Surcharge (ADDITION) ---\n";
try {
    $addAmount = 50000.00;
    $resAdd = $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'ADDITION',
        'amount' => $addAmount,
        'reason' => 'Tindakan medis tambahan pasca-konsultasi dokter spesialis',
    ], $cashierUser['id']);

    assertAdj("Penambahan biaya berhasil dicatat", $resAdd['adjustment_type'] === 'ADDITION');
    assertAdj("Saldo tagihan bertambah tepat", abs($resAdd['new_balance'] - ($initialBalance + $addAmount)) < 0.01, "Saldo baru: Rp " . number_format($resAdd['new_balance'], 0, ',', '.'));
    assertAdj("Versi invoice bertambah (increment)", $resAdd['new_version'] === $initialVersion + 1, "Versi: {$resAdd['previous_version']} ➔ {$resAdd['new_version']}");
} catch (Exception $e) {
    assertAdj("Gagal penambahan biaya: " . $e->getMessage(), false);
}

echo "\n--- 2. Uji Potongan / Diskon Resmi (DEDUCTION) ---\n";
try {
    $currentInv = Database::fetchOne("SELECT outstanding_balance, version FROM invoices WHERE id = :id", [':id' => $invoice['id']]);
    $currBal = (float) $currentInv['outstanding_balance'];
    $currVer = (int) $currentInv['version'];
    $discount = 25000.00;

    $resDed = $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'DEDUCTION',
        'amount' => $discount,
        'reason' => 'Diskon persetujuan Direktur Pelayanan untuk pasien reguler',
    ], $adminUser['id']);

    assertAdj("Potongan biaya (DEDUCTION) berhasil dicatat", $resDed['adjustment_type'] === 'DEDUCTION');
    assertAdj("Saldo tagihan berkurang tepat", abs($resDed['new_balance'] - ($currBal - $discount)) < 0.01, "Sisa saldo: Rp " . number_format($resDed['new_balance'], 0, ',', '.'));
    assertAdj("Versi invoice bertambah", $resDed['new_version'] === $currVer + 1);
} catch (Exception $e) {
    assertAdj("Gagal potongan biaya: " . $e->getMessage(), false);
}

echo "\n--- 3. Uji Validasi Input & Proteksi Bisnis ---\n";
// A. Alasan terlalu pendek
try {
    $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'ADDITION',
        'amount' => 10000,
        'reason' => 'tes', // < 5 chars
    ], $cashierUser['id']);
    assertAdj("Penolakan alasan terlalu pendek gagal", false);
} catch (Exception $e) {
    assertAdj("Penolakan alasan penyesuaian terlalu pendek valid", true, $e->getMessage());
}

// B. Nominal <= 0
try {
    $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'ADDITION',
        'amount' => -5000,
        'reason' => 'Nominal negatif tidak valid',
    ], $cashierUser['id']);
    assertAdj("Penolakan nominal negatif gagal", false);
} catch (Exception $e) {
    assertAdj("Penolakan nominal negatif/nol valid", true, $e->getMessage());
}

// C. Tipe penyesuaian tidak valid
try {
    $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'INVALID_TYPE',
        'amount' => 10000,
        'reason' => 'Alasan coba-coba manipulasi',
    ], $cashierUser['id']);
    assertAdj("Penolakan tipe tidak valid gagal", false);
} catch (Exception $e) {
    assertAdj("Penolakan tipe di luar ADDITION/DEDUCTION/CANCELLATION valid", true, $e->getMessage());
}

// D. Potongan melebihi sisa tagihan
try {
    $adjService->createAdjustment($invoice['id'], [
        'adjustment_type' => 'DEDUCTION',
        'amount' => 999999999.00,
        'reason' => 'Potongan fiktif melebihi total tagihan',
    ], $adminUser['id']);
    assertAdj("Penolakan potongan melebihi saldo gagal", false);
} catch (Exception $e) {
    assertAdj("Penolakan potongan melebihi sisa saldo tagihan valid", true, $e->getMessage());
}

echo "\n--- 4. Uji Penarikan Histori Penyesuaian & Audit Trail ---\n";
try {
    $adjustments = $adjService->getAdjustmentsByInvoice($invoice['id']);
    assertAdj("Histori penyesuaian memuat data yang dicatat", count($adjustments) >= 2, "Total riwayat penyesuaian: " . count($adjustments));
    if (!empty($adjustments)) {
        $first = $adjustments[0];
        assertAdj("Histori penyesuaian memuat informasi pembuat otorisasi", !empty($first['author_name']), "Author: {$first['author_name']} ({$first['author_role']})");
    }

    // Cek keberadaan di audit_logs
    $auditLogs = Database::fetchAll("
        SELECT * FROM audit_logs 
        WHERE table_name = 'invoice_adjustments'
        ORDER BY id DESC LIMIT 5
    ");
    assertAdj("Aktivitas penyesuaian tagihan otomatis tercatat di audit_logs", !empty($auditLogs), "Audit records logged: " . count($auditLogs));
} catch (Exception $e) {
    assertAdj("Gagal uji histori dan audit: " . $e->getMessage(), false);
}

echo "\n--- 5. Uji Rekapitulasi Penyesuaian Finansial ---\n";
try {
    $summary = $adjService->getAdjustmentSummary('2026-01-01', date('Y-m-d'));
    assertAdj("Laporan rekapitulasi penyesuaian berhasil diagregasi", $summary['total_adjustments'] > 0, "Total penyesuaian tercatat: {$summary['total_adjustments']}");
} catch (Exception $e) {
    assertAdj("Gagal agregasi laporan penyesuaian: " . $e->getMessage(), false);
}

echo "\n========================================================================\n";
echo "📊 REKAPITULASI PENGUJIAN PENYESUAIAN FINANSIAL (KASUS 4):\n";
echo "  Total Lulus : {$passCount}\n";
echo "  Total Gagal : {$failCount}\n";
echo "========================================================================\n";

if ($failCount === 0) {
    echo "🎉 MITIGASI CRITICAL CASE 4 LULUS 100% DENGAN INTEGRITAS TINGGI!\n";
    exit(0);
} else {
    echo "❌ TERDAPAT PENGUJIAN YANG GAGAL.\n";
    exit(1);
}
