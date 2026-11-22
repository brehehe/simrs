<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;

/**
 * Service Laporan Pelayanan & Finansial Rumah Sakit
 * Standar Pelaporan Kemenkes RI (Form RL 5.3) & Rekonsiliasi Kasir
 */
class ReportService
{
    /**
     * 1. Laporan 10 Besar Penyakit Rawat Jalan (Standar Kemenkes RI Form RL 5.3)
     */
    public function getTopDiagnoses(?string $startDate = null, ?string $endDate = null, int $limit = 10): array
    {
        $startDate = $startDate ?: date('Y-m-01');
        $endDate = $endDate ?: date('Y-m-d');

        // Total seluruh diagnosa dalam periode
        $totalRow = Database::fetchOne("
            SELECT count(*) as total 
            FROM visit_diagnoses vd
            JOIN visits v ON v.id = vd.visit_id
            WHERE v.visit_date BETWEEN :start AND :end
        ", [':start' => $startDate, ':end' => $endDate]);
        $grandTotal = (int) ($totalRow['total'] ?? 0);

        $sql = "
            SELECT 
                d.code as icd10_code,
                d.description as diagnosis_name,
                COUNT(vd.id) as total_cases,
                SUM(CASE WHEN p.gender = 'MALE' THEN 1 ELSE 0 END) as male_cases,
                SUM(CASE WHEN p.gender = 'FEMALE' THEN 1 ELSE 0 END) as female_cases,
                SUM(CASE WHEN vd.diagnosis_type = 'PRIMARY' THEN 1 ELSE 0 END) as primary_cases
            FROM visit_diagnoses vd
            JOIN diagnoses d ON d.id = vd.diagnosis_id
            JOIN visits v ON v.id = vd.visit_id
            JOIN patients p ON p.id = v.patient_id
            WHERE v.visit_date BETWEEN :start AND :end
            GROUP BY d.code, d.description
            ORDER BY total_cases DESC, primary_cases DESC
            LIMIT :limit
        ";

        $rows = Database::fetchAll($sql, [
            ':start' => $startDate,
            ':end' => $endDate,
            ':limit' => $limit,
        ]);

        $ranked = [];
        foreach ($rows as $index => $row) {
            $totalCases = (int) $row['total_cases'];
            $pct = $grandTotal > 0 ? round(($totalCases / $grandTotal) * 100, 2) : 0.0;
            $ranked[] = [
                'rank' => $index + 1,
                'icd10_code' => $row['icd10_code'],
                'diagnosis_name' => $row['diagnosis_name'],
                'male_cases' => (int) $row['male_cases'],
                'female_cases' => (int) $row['female_cases'],
                'primary_cases' => (int) $row['primary_cases'],
                'total_cases' => $totalCases,
                'percentage' => $pct,
            ];
        }

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'form_code' => 'RL 5.3 KEMENKES RI',
            'form_title' => 'Laporan 10 Besar Penyakit Rawat Jalan',
            'grand_total_cases' => $grandTotal,
            'items' => $ranked,
        ];
    }

    /**
     * 2. Laporan Rekonsiliasi Kasir & Finansial (Breakdown Metode Pembayaran)
     */
    public function getFinancialReconciliation(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-m-01');
        $endDate = $endDate ?: date('Y-m-d');

        // Total penerimaan kasir
        $summary = Database::fetchOne("
            SELECT 
                COUNT(p.id) as total_transactions,
                COALESCE(SUM(p.amount), 0) as total_revenue,
                COALESCE(AVG(p.amount), 0) as average_transaction
            FROM payments p
            WHERE p.paid_at::date BETWEEN :start AND :end AND p.payment_status = 'SUCCESS'
        ", [':start' => $startDate, ':end' => $endDate]);

        // Rincian per metode pembayaran
        $methods = Database::fetchAll("
            SELECT 
                p.payment_method,
                COUNT(p.id) as transaction_count,
                COALESCE(SUM(p.amount), 0) as total_amount
            FROM payments p
            WHERE p.paid_at::date BETWEEN :start AND :end AND p.payment_status = 'SUCCESS'
            GROUP BY p.payment_method
            ORDER BY total_amount DESC
        ", [':start' => $startDate, ':end' => $endDate]);

        // Rincian transaksi per kasir
        $byCashier = Database::fetchAll("
            SELECT 
                u.full_name as cashier_name,
                COUNT(p.id) as transaction_count,
                COALESCE(SUM(p.amount), 0) as total_collected
            FROM payments p
            JOIN users u ON u.id = p.cashier_id
            WHERE p.paid_at::date BETWEEN :start AND :end AND p.payment_status = 'SUCCESS'
            GROUP BY u.full_name
            ORDER BY total_collected DESC
        ", [':start' => $startDate, ':end' => $endDate]);

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'summary' => [
                'total_transactions' => (int) ($summary['total_transactions'] ?? 0),
                'total_revenue' => (float) ($summary['total_revenue'] ?? 0),
                'average_transaction' => round((float) ($summary['average_transaction'] ?? 0), 2),
            ],
            'payment_methods' => array_map(fn($m) => [
                'method' => $m['payment_method'],
                'count' => (int) $m['transaction_count'],
                'amount' => (float) $m['total_amount'],
                'percentage' => (float) $summary['total_revenue'] > 0 
                    ? round(((float)$m['total_amount'] / (float)$summary['total_revenue']) * 100, 2) 
                    : 0.0,
            ], $methods),
            'cashier_breakdown' => array_map(fn($c) => [
                'cashier_name' => $c['cashier_name'],
                'transaction_count' => (int) $c['transaction_count'],
                'total_collected' => (float) $c['total_collected'],
            ], $byCashier),
        ];
    }

    /**
     * 3. Laporan Kunjungan Rawat Jalan per Poliklinik & Dokter DPJP
     */
    public function getVisitSummary(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-m-01');
        $endDate = $endDate ?: date('Y-m-d');

        // Total kunjungan
        $totalVisits = (int) (Database::fetchOne("
            SELECT count(*) as c FROM visits WHERE visit_date BETWEEN :start AND :end
        ", [':start' => $startDate, ':end' => $endDate])['c'] ?? 0);

        // Per Poliklinik
        $byPoly = Database::fetchAll("
            SELECT 
                poly.name as polyclinic_name,
                poly.code as polyclinic_code,
                COUNT(v.id) as total_visits,
                SUM(CASE WHEN v.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_visits,
                SUM(CASE WHEN v.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_visits
            FROM visits v
            JOIN polyclinics poly ON poly.id = v.polyclinic_id
            WHERE v.visit_date BETWEEN :start AND :end
            GROUP BY poly.name, poly.code
            ORDER BY total_visits DESC
        ", [':start' => $startDate, ':end' => $endDate]);

        // Per Dokter DPJP
        $byDoctor = Database::fetchAll("
            SELECT 
                doc.full_name as doctor_name,
                poly.name as polyclinic_name,
                COUNT(v.id) as total_handled,
                SUM(CASE WHEN v.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
            FROM visits v
            JOIN medical_staff doc ON doc.id = v.doctor_id
            JOIN polyclinics poly ON poly.id = v.polyclinic_id
            WHERE v.visit_date BETWEEN :start AND :end
            GROUP BY doc.full_name, poly.name
            ORDER BY total_handled DESC
        ", [':start' => $startDate, ':end' => $endDate]);

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'total_visits' => $totalVisits,
            'by_polyclinic' => array_map(fn($p) => [
                'name' => $p['polyclinic_name'],
                'code' => $p['polyclinic_code'],
                'total' => (int) $p['total_visits'],
                'completed' => (int) $p['completed_visits'],
                'cancelled' => (int) $p['cancelled_visits'],
                'percentage' => $totalVisits > 0 ? round(((int)$p['total_visits'] / $totalVisits) * 100, 2) : 0.0,
            ], $byPoly),
            'by_doctor' => array_map(fn($d) => [
                'doctor_name' => $d['doctor_name'],
                'polyclinic' => $d['polyclinic_name'],
                'total_handled' => (int) $d['total_handled'],
                'completed' => (int) $d['completed_count'],
            ], $byDoctor),
        ];
    }

    /**
     * 4. Laporan Pemakaian & Mutasi Obat Apotek (Drug Consumption & Turnover)
     */
    public function getMedicineUsageReport(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-m-01');
        $endDate = $endDate ?: date('Y-m-d');

        $sql = "
            SELECT 
                m.code,
                m.name as medicine_name,
                m.generic_name,
                m.unit,
                m.base_price,
                ms.current_stock,
                ms.minimum_stock,
                COALESCE(SUM(pi.quantity), 0) as total_dispensed,
                COALESCE(SUM(pi.subtotal), 0) as total_value
            FROM medicines m
            JOIN medicine_stocks ms ON ms.medicine_id = m.id
            LEFT JOIN prescription_items pi ON pi.medicine_id = m.id
            LEFT JOIN prescriptions p ON p.id = pi.prescription_id AND p.status = 'DISPENSED'
            LEFT JOIN visits v ON v.id = p.visit_id AND v.visit_date BETWEEN :start AND :end
            GROUP BY m.id, m.code, m.name, m.generic_name, m.unit, m.base_price, ms.current_stock, ms.minimum_stock
            ORDER BY total_dispensed DESC, m.name ASC
        ";

        $rows = Database::fetchAll($sql, [':start' => $startDate, ':end' => $endDate]);

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'items' => array_map(fn($r) => [
                'code' => $r['code'],
                'name' => $r['medicine_name'],
                'generic_name' => $r['generic_name'] ?: '-',
                'unit' => $r['unit'],
                'base_price' => (float) $r['base_price'],
                'current_stock' => (int) $r['current_stock'],
                'minimum_stock' => (int) $r['minimum_stock'],
                'is_low_stock' => (int) $r['current_stock'] <= (int) $r['minimum_stock'],
                'total_dispensed' => (int) $r['total_dispensed'],
                'total_value' => (float) $r['total_value'],
            ], $rows),
        ];
    }
}
