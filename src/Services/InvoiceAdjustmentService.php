<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

/**
 * Service Penyesuaian Tagihan Finansial (CRITICAL CASE 4)
 * Menangani perubahan pemeriksaan/tarif pasca-invoice tanpa merusak snapshot historis,
 * mendukung penambahan biaya (ADDITION), potongan/diskon (DEDUCTION), dan pembatalan (CANCELLATION).
 */
class InvoiceAdjustmentService
{
    private AuditService $auditService;

    public function __construct()
    {
        $this->auditService = new AuditService();
    }

    /**
     * Membuat penyesuaian biaya / koreksi tagihan pasca-invoice
     */
    public function createAdjustment(string $invoiceId, array $data, string $userId): array
    {
        $type = strtoupper(trim((string) ($data['adjustment_type'] ?? '')));
        $validTypes = ['ADDITION', 'DEDUCTION', 'CANCELLATION'];

        if (!in_array($type, $validTypes, true)) {
            throw new Exception("Tipe penyesuaian tidak valid. Pilihan: ADDITION, DEDUCTION, CANCELLATION.", 422);
        }

        $amount = (float) ($data['amount'] ?? 0);
        if ($type !== 'CANCELLATION' && $amount <= 0) {
            throw new Exception("Nominal penyesuaian harus lebih besar dari 0.", 422);
        }

        $reason = trim((string) ($data['reason'] ?? ''));
        if (strlen($reason) < 5) {
            throw new Exception("Alasan penyesuaian wajib diisi secara rinci (minimal 5 karakter).", 422);
        }

        Database::beginTransaction();

        try {
            // Pessimistic Row Lock pada invoice
            $invoice = Database::fetchOne("
                SELECT id, invoice_number, visit_id, total_amount, paid_amount, outstanding_balance, status, version
                FROM invoices
                WHERE id = :id
                FOR UPDATE
            ", [':id' => $invoiceId]);

            if (!$invoice) {
                throw new Exception("Invoice dengan ID '{$invoiceId}' tidak ditemukan.", 404);
            }

            $currentTotal = (float) $invoice['total_amount'];
            $currentPaid = (float) $invoice['paid_amount'];
            $currentOutstanding = (float) $invoice['outstanding_balance'];
            $currentVersion = (int) ($invoice['version'] ?? 1);

            $newTotal = $currentTotal;
            $newOutstanding = $currentOutstanding;
            $newStatus = $invoice['status'];

            if ($type === 'DEDUCTION') {
                if ($amount > $currentOutstanding) {
                    throw new Exception("Nominal potongan (Rp " . number_format($amount, 0, ',', '.') . ") tidak boleh melebihi sisa tagihan (Rp " . number_format($currentOutstanding, 0, ',', '.') . ").", 422);
                }
                $newOutstanding = max(0.0, $currentOutstanding - $amount);
                $newTotal = max($currentPaid, $currentTotal - $amount);
                if ($newOutstanding <= 0.0) {
                    $newStatus = 'PAID';
                }
            } elseif ($type === 'ADDITION') {
                $newTotal = $currentTotal + $amount;
                $newOutstanding = $currentOutstanding + $amount;
                if ($newStatus === 'PAID' && $newOutstanding > 0.0) {
                    $newStatus = 'PARTIALLY_PAID';
                }
            } elseif ($type === 'CANCELLATION') {
                if ($currentPaid > 0) {
                    throw new Exception("Invoice yang sudah memiliki pembayaran tercatat tidak dapat dibatalkan langsung. Gunakan DEDUCTION (koreksi/refund).", 422);
                }
                $amount = $currentOutstanding;
                $newTotal = 0.0;
                $newOutstanding = 0.0;
            }

            $newVersion = $currentVersion + 1;

            // 1. Simpan ke tabel invoice_adjustments
            $adjSql = "
                INSERT INTO invoice_adjustments (
                    invoice_id, adjustment_type, amount, reason, created_by, created_at
                ) VALUES (
                    :invid, :type, :amt, :reason, :uid, CURRENT_TIMESTAMP
                ) RETURNING *;
            ";

            $adj = Database::fetchOne($adjSql, [
                ':invid' => $invoiceId,
                ':type' => $type,
                ':amt' => $amount,
                ':reason' => $reason,
                ':uid' => $userId,
            ]);

            // 2. Perbarui Saldo, Total, dan Versi Invoice
            Database::execute("
                UPDATE invoices SET
                    total_amount = :tot,
                    outstanding_balance = :out,
                    status = :status,
                    version = :ver,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ", [
                ':tot' => $newTotal,
                ':out' => $newOutstanding,
                ':status' => $newStatus,
                ':ver' => $newVersion,
                ':id' => $invoiceId,
            ]);

            // 3. Catat ke Audit Trail Kepatuhan Permenkes 24/2022
            $this->auditService->log(
                'invoice_adjustments',
                $adj['id'],
                'INSERT',
                ['version' => $currentVersion, 'total' => $currentTotal, 'outstanding' => $currentOutstanding],
                [
                    'adjustment_type' => $type,
                    'amount' => $amount,
                    'reason' => $reason,
                    'invoice_number' => $invoice['invoice_number'],
                    'new_version' => $newVersion,
                    'new_outstanding' => $newOutstanding,
                ],
                $userId
            );

            Database::commit();

            return [
                'adjustment_id' => $adj['id'],
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoice['invoice_number'],
                'adjustment_type' => $type,
                'amount' => (float) $adj['amount'],
                'reason' => $adj['reason'],
                'previous_version' => $currentVersion,
                'new_version' => $newVersion,
                'previous_balance' => $currentOutstanding,
                'new_balance' => $newOutstanding,
                'invoice_status' => $newStatus,
                'created_at' => $adj['created_at'],
            ];
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    /**
     * Mengambil daftar penyesuaian biaya untuk satu invoice
     */
    public function getAdjustmentsByInvoice(string $invoiceId): array
    {
        $sql = "
            SELECT 
                ia.id,
                ia.invoice_id,
                ia.adjustment_type,
                ia.amount,
                ia.reason,
                ia.created_at,
                u.username,
                u.full_name as author_name,
                u.role_code as author_role
            FROM invoice_adjustments ia
            JOIN users u ON ia.created_by = u.id
            WHERE ia.invoice_id = :id
            ORDER BY ia.created_at ASC
        ";

        return Database::fetchAll($sql, [':id' => $invoiceId]);
    }

    /**
     * Rekapitulasi penyesuaian finansial untuk pelaporan eksekutif
     */
    public function getAdjustmentSummary(?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ?? date('Y-m-01');
        $end = $endDate ?? date('Y-m-d');

        $sql = "
            SELECT 
                ia.adjustment_type,
                count(*) as total_count,
                COALESCE(sum(ia.amount), 0) as total_amount
            FROM invoice_adjustments ia
            WHERE ia.created_at::date BETWEEN :start AND :end
            GROUP BY ia.adjustment_type
        ";

        $rows = Database::fetchAll($sql, [':start' => $start, ':end' => $end]);

        return [
            'period' => ['start_date' => $start, 'end_date' => $end],
            'items' => $rows,
            'total_adjustments' => array_sum(array_column($rows, 'total_count')),
        ];
    }
}
