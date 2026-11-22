<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

class BillingService
{
    /**
     * Mengagregasi seluruh komponen tagihan rawat jalan dan membuat/memperbarui snapshot invoice
     */
    public function getOrCreateInvoice(string $visitId): array
    {
        $visit = Database::fetchOne("
            SELECT v.id, v.patient_id, v.visit_number, p.full_name AS patient_name, p.mr_number
            FROM visits v
            JOIN patients p ON p.id = v.patient_id
            WHERE v.id = :vid
        ", [':vid' => $visitId]);

        if (!$visit) throw new Exception("Kunjungan tidak ditemukan.", 404);

        Database::beginTransaction();

        try {
            $registrationFee = 25000.00;

            // 1. Hitung total tindakan medis terkonfirmasi
            $procRow = Database::fetchOne("
                SELECT COALESCE(SUM(subtotal), 0) AS total 
                FROM visit_procedures 
                WHERE visit_id = :vid AND status = 'CONFIRMED'
            ", [':vid' => $visitId]);
            $proceduresTotal = (float) $procRow['total'];

            // 2. Hitung total uji laboratorium
            $labRow = Database::fetchOne("
                SELECT COALESCE(SUM(loi.snapshot_price), 0) AS total
                FROM lab_orders lo
                JOIN lab_order_items loi ON loi.lab_order_id = lo.id
                WHERE lo.visit_id = :vid AND lo.status != 'CANCELLED'
            ", [':vid' => $visitId]);
            $labTotal = (float) $labRow['total'];

            // 3. Hitung total obat yang telah diserahkan (DISPENSED)
            $rxRow = Database::fetchOne("
                SELECT COALESCE(SUM(ri.subtotal), 0) AS total
                FROM prescriptions rx
                JOIN prescription_items ri ON ri.prescription_id = rx.id
                WHERE rx.visit_id = :vid AND rx.status = 'DISPENSED'
            ", [':vid' => $visitId]);
            $medicinesTotal = (float) $rxRow['total'];

            $totalAmount = $registrationFee + $proceduresTotal + $labTotal + $medicinesTotal;

            // Cek apakah invoice sudah pernah dibuat
            $existing = Database::fetchOne("
                SELECT id, invoice_number, paid_amount, status, version 
                FROM invoices 
                WHERE visit_id = :vid
            ", [':vid' => $visitId]);

            if ($existing) {
                $paidAmount = (float) $existing['paid_amount'];
                $outstanding = max(0.0, $totalAmount - $paidAmount);
                $status = ($outstanding <= 0.0) ? 'PAID' : (($paidAmount > 0.0) ? 'PARTIALLY_PAID' : 'UNPAID');

                $updateSql = "
                    UPDATE invoices SET
                        procedures_total = :proc_total,
                        lab_total = :lab_total,
                        medicines_total = :med_total,
                        total_amount = :tot_amount,
                        outstanding_balance = :outstanding,
                        status = :status,
                        version = version + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                    RETURNING *;
                ";
                $invoice = Database::fetchOne($updateSql, [
                    ':id' => $existing['id'],
                    ':proc_total' => $proceduresTotal,
                    ':lab_total' => $labTotal,
                    ':med_total' => $medicinesTotal,
                    ':tot_amount' => $totalAmount,
                    ':outstanding' => $outstanding,
                    ':status' => $status,
                ]);
            } else {
                $dateClean = date('Ymd');
                do {
                    $countRow = Database::fetchOne("SELECT count(*) as c FROM invoices WHERE invoice_number LIKE :p", [':p' => "INV-{$dateClean}-%"]);
                    $nextSeq = ((int)($countRow['c'] ?? 0)) + 1;
                    $invoiceNumber = sprintf("INV-%s-%04d%02d", $dateClean, $nextSeq, mt_rand(10, 99));
                    $exists = Database::fetchOne("SELECT id FROM invoices WHERE invoice_number = :num", [':num' => $invoiceNumber]);
                } while ($exists);

                $insertSql = "
                    INSERT INTO invoices (
                        invoice_number, visit_id, patient_id, registration_fee,
                        procedures_total, lab_total, medicines_total,
                        total_amount, paid_amount, outstanding_balance, status, version
                    ) VALUES (
                        :inv_num, :vid, :pid, :reg_fee,
                        :proc_tot, :lab_tot, :med_tot,
                        :tot, 0.00, :tot, 'UNPAID', 1
                    )
                    RETURNING *;
                ";
                $invoice = Database::fetchOne($insertSql, [
                    ':inv_num' => $invoiceNumber,
                    ':vid' => $visitId,
                    ':pid' => $visit['patient_id'],
                    ':reg_fee' => $registrationFee,
                    ':proc_tot' => $proceduresTotal,
                    ':lab_tot' => $labTotal,
                    ':med_tot' => $medicinesTotal,
                    ':tot' => $totalAmount,
                ]);
            }

            // Snapshot Invoice Items
            Database::execute("DELETE FROM invoice_items WHERE invoice_id = :invid", [':invid' => $invoice['id']]);

            // Item Registrasi
            Database::execute("
                INSERT INTO invoice_items (invoice_id, item_type, description, unit_price, quantity, subtotal)
                VALUES (:invid, 'REGISTRATION', 'Biaya Registrasi Rawat Jalan', 25000.00, 1, 25000.00)
            ", [':invid' => $invoice['id']]);

            // Item Tindakan
            $procs = Database::fetchAll("
                SELECT vp.id, vp.snapshot_price, vp.quantity, vp.subtotal, mp.name
                FROM visit_procedures vp
                JOIN medical_procedures mp ON mp.id = vp.procedure_id
                WHERE vp.visit_id = :vid AND vp.status = 'CONFIRMED'
            ", [':vid' => $visitId]);
            foreach ($procs as $p) {
                Database::execute("
                    INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, unit_price, quantity, subtotal)
                    VALUES (:invid, 'PROCEDURE', :ref, :desc, :price, :qty, :subtotal)
                ", [
                    ':invid' => $invoice['id'],
                    ':ref' => $p['id'],
                    ':desc' => "Tindakan: " . $p['name'],
                    ':price' => $p['snapshot_price'],
                    ':qty' => $p['quantity'],
                    ':subtotal' => $p['subtotal'],
                ]);
            }

            // Item Lab
            $labs = Database::fetchAll("
                SELECT loi.id, loi.snapshot_price, lt.name
                FROM lab_orders lo
                JOIN lab_order_items loi ON loi.lab_order_id = lo.id
                JOIN lab_tests lt ON lt.id = loi.lab_test_id
                WHERE lo.visit_id = :vid AND lo.status != 'CANCELLED'
            ", [':vid' => $visitId]);
            foreach ($labs as $l) {
                Database::execute("
                    INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, unit_price, quantity, subtotal)
                    VALUES (:invid, 'LAB', :ref, :desc, :price, 1, :price)
                ", [
                    ':invid' => $invoice['id'],
                    ':ref' => $l['id'],
                    ':desc' => "Laboratorium: " . $l['name'],
                    ':price' => $l['snapshot_price'],
                ]);
            }

            // Item Obat
            $meds = Database::fetchAll("
                SELECT ri.id, ri.snapshot_price, ri.quantity, ri.subtotal, m.name
                FROM prescriptions rx
                JOIN prescription_items ri ON ri.prescription_id = rx.id
                JOIN medicines m ON m.id = ri.medicine_id
                WHERE rx.visit_id = :vid AND rx.status = 'DISPENSED'
            ", [':vid' => $visitId]);
            foreach ($meds as $m) {
                Database::execute("
                    INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, unit_price, quantity, subtotal)
                    VALUES (:invid, 'MEDICINE', :ref, :desc, :price, :qty, :subtotal)
                ", [
                    ':invid' => $invoice['id'],
                    ':ref' => $m['id'],
                    ':desc' => "Obat: " . $m['name'],
                    ':price' => $m['snapshot_price'],
                    ':qty' => $m['quantity'],
                    ':subtotal' => $m['subtotal'],
                ]);
            }

            Database::commit();

            $invoice['items'] = Database::fetchAll("
                SELECT id, item_type, description, unit_price, quantity, subtotal
                FROM invoice_items 
                WHERE invoice_id = :invid 
                ORDER BY created_at ASC
            ", [':invid' => $invoice['id']]);

            $invoice['adjustments'] = (new InvoiceAdjustmentService())->getAdjustmentsByInvoice($invoice['id']);

            $invoice['patient_name'] = $visit['patient_name'];
            $invoice['mr_number'] = $visit['mr_number'];
            $invoice['visit_number'] = $visit['visit_number'];

            return $invoice;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    /**
     * CRITICAL CASE 3: Pembayaran Kasir dengan Idempotency Key dan Pessimistic Locking
     */
    public function processPayment(string $invoiceId, array $data, string $cashierUserId): array
    {
        if (empty($data['idempotency_key'])) {
            throw new Exception("Header atau parameter 'idempotency_key' wajib disertakan.", 422);
        }

        $idempotencyKey = trim((string) $data['idempotency_key']);
        $amount = (float) ($data['amount'] ?? 0);
        $method = strtoupper(trim((string) ($data['payment_method'] ?? 'CASH')));
        if ($method === 'DEBIT') $method = 'DEBIT_CARD';
        if ($method === 'TRANSFER') $method = 'BANK_TRANSFER';
        $refNo = $data['reference_no'] ?? null;

        if ($amount <= 0) {
            throw new Exception("Nominal pembayaran harus lebih besar dari 0.", 422);
        }

        // 1. Pengecekan Idempotensi: Cek apakah key ini sudah pernah sukses diproses
        $existingPayment = Database::fetchOne("
            SELECT p.*, inv.invoice_number, inv.status AS invoice_status, inv.outstanding_balance
            FROM payments p
            JOIN invoices inv ON inv.id = p.invoice_id
            WHERE p.idempotency_key = :key
        ", [':key' => $idempotencyKey]);

        if ($existingPayment) {
            // Idempotent Replay: Return hasil pembayaran sebelumnya tanpa menduplikasi data
            if (abs((float)$existingPayment['amount'] - $amount) > 0.01) {
                throw new Exception("Idempotency key telah digunakan dengan nominal pembayaran yang berbeda.", 422);
            }
            return [
                'payment_id' => $existingPayment['id'],
                'payment_number' => $existingPayment['payment_number'],
                'invoice_number' => $existingPayment['invoice_number'],
                'amount_paid' => (float) $existingPayment['amount'],
                'outstanding_balance' => (float) $existingPayment['outstanding_balance'],
                'invoice_status' => $existingPayment['invoice_status'],
                'paid_at' => $existingPayment['paid_at'],
                'is_idempotent_replay' => true,
            ];
        }

        Database::beginTransaction();

        try {
            // 2. Pessimistic Row Lock pada baris invoice
            $invoice = Database::fetchOne("
                SELECT id, visit_id, invoice_number, total_amount, paid_amount, outstanding_balance, status
                FROM invoices
                WHERE id = :id
                FOR UPDATE
            ", [':id' => $invoiceId]);

            if (!$invoice) throw new Exception("Invoice tidak ditemukan.", 404);

            $outstanding = (float) $invoice['outstanding_balance'];
            if ($outstanding <= 0.0) {
                throw new Exception("Tagihan ini sudah lunas.", 400);
            }

            if ($amount > $outstanding) {
                throw new Exception("Nominal pembayaran (Rp {$amount}) melebihi sisa tagihan (Rp {$outstanding}).", 422);
            }

            // 3. Simpan Pembayaran
            $dateClean = date('Ymd');
            do {
                $countPay = Database::fetchOne("SELECT count(*) as c FROM payments WHERE payment_number LIKE :p", [':p' => "PAY-{$dateClean}-%"]);
                $nextPaySeq = ((int)($countPay['c'] ?? 0)) + 1;
                $payNumber = sprintf("PAY-%s-%04d%02d", $dateClean, $nextPaySeq, mt_rand(10, 99));
                $existsPay = Database::fetchOne("SELECT id FROM payments WHERE payment_number = :num", [':num' => $payNumber]);
            } while ($existsPay);

            $insertPaymentSql = "
                INSERT INTO payments (
                    payment_number, invoice_id, idempotency_key, amount,
                    payment_method, payment_status, cashier_id, reference_no
                ) VALUES (
                    :pay_num, :inv_id, :idemp_key, :amount,
                    :method, 'SUCCESS', :cashier, :ref_no
                )
                RETURNING id, payment_number, amount, paid_at;
            ";

            $payment = Database::fetchOne($insertPaymentSql, [
                ':pay_num' => $payNumber,
                ':inv_id' => $invoiceId,
                ':idemp_key' => $idempotencyKey,
                ':amount' => $amount,
                ':method' => $method,
                ':cashier' => $cashierUserId,
                ':ref_no' => $refNo,
            ]);

            // 4. Perbarui Saldo & Status Invoice
            $newPaid = (float) $invoice['paid_amount'] + $amount;
            $newOutstanding = max(0.0, (float) $invoice['total_amount'] - $newPaid);
            $newStatus = ($newOutstanding <= 0.0) ? 'PAID' : 'PARTIALLY_PAID';

            Database::execute("
                UPDATE invoices SET
                    paid_amount = :paid,
                    outstanding_balance = :outstanding,
                    status = :status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ", [
                ':paid' => $newPaid,
                ':outstanding' => $newOutstanding,
                ':status' => $newStatus,
                ':id' => $invoiceId,
            ]);

            // 5. Jika Lunas, Kunjungan Menjadi COMPLETED
            if ($newStatus === 'PAID') {
                Database::execute("
                    UPDATE visits SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
                    WHERE id = :vid
                ", [':vid' => $invoice['visit_id']]);
            }

            // Audit Trail Kepatuhan Permenkes 24/2022
            (new AuditService())->log('payments', $payment['id'], 'INSERT', null, [
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoice['invoice_number'],
                'amount' => $amount,
                'payment_method' => $method,
                'idempotency_key' => $idempotencyKey,
                'invoice_status' => $newStatus,
            ], $cashierUserId);

            Database::commit();

            return [
                'payment_id' => $payment['id'],
                'payment_number' => $payment['payment_number'],
                'invoice_number' => $invoice['invoice_number'],
                'amount_paid' => (float) $payment['amount'],
                'outstanding_balance' => $newOutstanding,
                'invoice_status' => $newStatus,
                'paid_at' => $payment['paid_at'],
                'is_idempotent_replay' => false,
            ];
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }
}
