<?php

declare(strict_types=1);

/**
 * Pengujian Terotomasi untuk Modul Laporan Klinis & Finansial
 * Standar Kemenkes RI (Form RL 5.3) & Rekonsiliasi Kasir
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\ReportService;

echo "========================================================================\n";
echo "📊 PENGUJIAN MODUL LAPORAN KLINIS, FINANSIAL, & KEMENKES RI (RL 5.3)\n";
echo "========================================================================\n";

$passCount = 0;
$failCount = 0;

function assertRep(string $title, bool $condition, string $detail = ''): void {
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

$reportService = new ReportService();

// 1. Uji Laporan 10 Besar Penyakit (RL 5.3)
echo "\n--- 1. Uji Laporan 10 Besar Penyakit Rawat Jalan (RL 5.3 Kemenkes) ---\n";
try {
    $topDiag = $reportService->getTopDiagnoses('2026-01-01', date('Y-m-d'), 10);
    assertRep("Format Laporan RL 5.3 teridentifikasi", $topDiag['form_code'] === 'RL 5.3 KEMENKES RI');
    assertRep("Data diagnosa memiliki pemeringkatan (ranking)", !empty($topDiag['items']));
    if (!empty($topDiag['items'])) {
        $first = $topDiag['items'][0];
        assertRep("Diagnosa rank 1 memiliki kode ICD-10", !empty($first['icd10_code']));
        assertRep("Terdapat pemisahan kasus laki-laki dan perempuan", isset($first['male_cases']) && isset($first['female_cases']));
        assertRep("Kalkulasi persentase proporsional (0 - 100%)", $first['percentage'] >= 0.0 && $first['percentage'] <= 100.0, "Rank 1: {$first['icd10_code']} - {$first['diagnosis_name']} ({$first['total_cases']} kasus / {$first['percentage']}%)");
    }
} catch (Exception $e) {
    assertRep("Gagal mengambil laporan 10 besar penyakit: " . $e->getMessage(), false);
}

// 2. Uji Laporan Rekonsiliasi Finansial Kasir
echo "\n--- 2. Uji Laporan Rekonsiliasi Finansial Kasir ---\n";
try {
    $reconciliation = $reportService->getFinancialReconciliation('2026-01-01', date('Y-m-d'));
    assertRep("Total transaksi tercatat positif", $reconciliation['summary']['total_transactions'] > 0);
    assertRep("Total pendapatan terakumulasi (> 0)", $reconciliation['summary']['total_revenue'] > 0, "Total: Rp " . number_format($reconciliation['summary']['total_revenue'], 0, ',', '.'));
    assertRep("Terdapat rincian breakdown metode pembayaran", count($reconciliation['payment_methods']) > 0);
    if (!empty($reconciliation['payment_methods'])) {
        $firstMethod = $reconciliation['payment_methods'][0];
        assertRep("Metode pembayaran valid (CASH / QRIS / DEBIT_CARD / BANK_TRANSFER)", in_array($firstMethod['method'], ['CASH', 'QRIS', 'DEBIT_CARD', 'BANK_TRANSFER']), "Metode Utama: {$firstMethod['method']} (Rp " . number_format($firstMethod['amount'], 0, ',', '.') . ")");
    }
} catch (Exception $e) {
    assertRep("Gagal mengambil rekonsiliasi kasir: " . $e->getMessage(), false);
}

// 3. Uji Laporan Kunjungan Rawat Jalan
echo "\n--- 3. Uji Laporan Ringkasan Kunjungan Rawat Jalan ---\n";
try {
    $visitRep = $reportService->getVisitSummary('2026-01-01', date('Y-m-d'));
    assertRep("Total kunjungan terhitung (> 0)", $visitRep['total_visits'] > 0, "Total Kunjungan: {$visitRep['total_visits']}");
    assertRep("Terdapat data distribusi per poliklinik", count($visitRep['by_polyclinic']) > 0);
    assertRep("Terdapat data beban kerja per dokter DPJP", count($visitRep['by_doctor']) > 0);
} catch (Exception $e) {
    assertRep("Gagal mengambil ringkasan kunjungan: " . $e->getMessage(), false);
}

// 4. Uji Laporan Pemakaian Obat Apotek
echo "\n--- 4. Uji Laporan Pemakaian & Mutasi Obat Apotek ---\n";
try {
    $medRep = $reportService->getMedicineUsageReport('2026-01-01', date('Y-m-d'));
    assertRep("Daftar katalog obat memiliki data mutasi", count($medRep['items']) > 0);
    if (!empty($medRep['items'])) {
        $firstMed = $medRep['items'][0];
        assertRep("Item obat memuat data stok dan total kuantitas keluar", isset($firstMed['current_stock']) && isset($firstMed['total_dispensed']), "Top Obat: {$firstMed['name']} (Keluar: {$firstMed['total_dispensed']} {$firstMed['unit']}, Sisa Stok: {$firstMed['current_stock']})");
    }
} catch (Exception $e) {
    assertRep("Gagal mengambil laporan pemakaian obat: " . $e->getMessage(), false);
}

echo "\n========================================================================\n";
echo "📊 REKAPITULASI PENGUJIAN LAPORAN:\n";
echo "  Total Lulus : \033[32m{$passCount}\033[0m\n";
echo "  Total Gagal : " . ($failCount > 0 ? "\033[31m{$failCount}\033[0m" : "\033[32m0\033[0m") . "\n";
echo "========================================================================\n";

if ($failCount > 0) {
    exit(1);
}
echo "🎉 SELURUH PENGUJIAN MODUL LAPORAN BERHASIL DENGAN INTEGRITAS TINGGI!\n";
exit(0);
