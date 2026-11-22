<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

class PharmacyDispensationService
{
    /**
     * CRITICAL CASE 2: Penyerahan obat dengan penguncian baris PostgreSQL (SELECT FOR UPDATE)
     * dan conditional atomic update untuk mencegah stok minus akibat transaksi konkuren.
     */
    public function dispensePrescription(string $prescriptionId, string $dispensedByUserId, ?string $notes = null): array
    {
        $rx = Database::fetchOne("
            SELECT id, visit_id, prescription_number, status 
            FROM prescriptions 
            WHERE id = :id
        ", [':id' => $prescriptionId]);

        if (!$rx) {
            throw new Exception("Resep obat tidak ditemukan.", 404);
        }

        if ($rx['status'] === 'DISPENSED') {
            throw new Exception("Resep obat ini sudah diserahkan sebelumnya.", 400);
        }

        if ($rx['status'] === 'CANCELLED') {
            throw new Exception("Resep obat telah dibatalkan dan tidak dapat diserahkan.", 400);
        }

        // Ambil item resep
        $items = Database::fetchAll("
            SELECT ri.id, ri.medicine_id, ri.quantity, m.name AS medicine_name
            FROM prescription_items ri
            JOIN medicines m ON m.id = ri.medicine_id
            WHERE ri.prescription_id = :rxid
        ", [':rxid' => $prescriptionId]);

        if (empty($items)) {
            throw new Exception("Resep tidak memiliki item obat yang valid.", 422);
        }

        Database::beginTransaction();

        try {
            foreach ($items as $item) {
                $medId = $item['medicine_id'];
                $qtyNeeded = (int) $item['quantity'];

                // 1. Pessimistic Row-Level Lock: Kunci baris stok obat secara eksklusif
                $stockRow = Database::fetchOne("
                    SELECT id, current_stock 
                    FROM medicine_stocks 
                    WHERE medicine_id = :med_id 
                    FOR UPDATE
                ", [':med_id' => $medId]);

                if (!$stockRow) {
                    throw new Exception("Data persediaan untuk obat '{$item['medicine_name']}' tidak ditemukan di depo.", 404);
                }

                $currentStock = (int) $stockRow['current_stock'];
                if ($currentStock < $qtyNeeded) {
                    throw new Exception(
                        "Stok obat '{$item['medicine_name']}' tidak mencukupi (Tersedia: {$currentStock}, Diminta: {$qtyNeeded}).",
                        422
                    );
                }

                $stockAfter = $currentStock - $qtyNeeded;

                // 2. Conditional Atomic Update (Perlindungan ganda)
                $updatedRows = Database::execute("
                    UPDATE medicine_stocks 
                    SET current_stock = current_stock - :qty, updated_at = CURRENT_TIMESTAMP 
                    WHERE medicine_id = :med_id AND current_stock >= :qty
                ", [
                    ':qty' => $qtyNeeded,
                    ':med_id' => $medId,
                ]);

                if ($updatedRows === 0) {
                    throw new Exception("Terjadi konflik konkurensi stok pada obat '{$item['medicine_name']}'. Silakan coba lagi.", 409);
                }

                // 3. Catat Kartu Mutasi Persediaan (Stock Movements Audit Trail)
                Database::execute("
                    INSERT INTO stock_movements (
                        medicine_id, reference_type, reference_id, quantity_change, stock_before, stock_after, notes, created_by
                    ) VALUES (
                        :med_id, 'DISPENSATION', :ref_id, :qty_change, :before, :after, :notes, :user_id
                    )
                ", [
                    ':med_id' => $medId,
                    ':ref_id' => $prescriptionId,
                    ':qty_change' => -$qtyNeeded,
                    ':before' => $currentStock,
                    ':after' => $stockAfter,
                    ':notes' => "Penyerahan resep {$rx['prescription_number']}",
                    ':user_id' => $dispensedByUserId,
                ]);
            }

            // 4. Catat Penyerahan Fisik
            Database::execute("
                INSERT INTO medicine_dispensations (prescription_id, dispensed_by, notes)
                VALUES (:rxid, :uid, :notes)
            ", [
                ':rxid' => $prescriptionId,
                ':uid' => $dispensedByUserId,
                ':notes' => $notes ?? 'Obat telah diserahkan dan diedukasikan kepada pasien.',
            ]);

            // 5. Update Status Resep ke DISPENSED
            Database::execute("
                UPDATE prescriptions 
                SET status = 'DISPENSED', updated_at = CURRENT_TIMESTAMP 
                WHERE id = :rxid
            ", [':rxid' => $prescriptionId]);

            // Audit Trail Kepatuhan Permenkes 24/2022
            (new AuditService())->log('prescriptions', $prescriptionId, 'UPDATE', [
                'status' => $rx['status']
            ], [
                'status' => 'DISPENSED',
                'prescription_number' => $rx['prescription_number'],
                'items_count' => count($items),
            ], $dispensedByUserId);

            // 6. Transisi Status Kunjungan Pasien ke READY_FOR_BILLING
            Database::execute("
                UPDATE visits 
                SET status = 'READY_FOR_BILLING', updated_at = CURRENT_TIMESTAMP 
                WHERE id = :vid
            ", [':vid' => $rx['visit_id']]);

            Database::commit();

            return [
                'prescription_id' => $prescriptionId,
                'prescription_number' => $rx['prescription_number'],
                'status' => 'DISPENSED',
                'dispensed_at' => date('Y-m-d H:i:s'),
                'visit_status' => 'READY_FOR_BILLING',
            ];
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function getPrescriptions(?string $status = null): array
    {
        $where = "WHERE 1=1";
        $params = [];
        if (!empty($status)) {
            $where .= " AND p.status = :status";
            $params[':status'] = $status;
        }

        $prescriptions = Database::fetchAll("
            SELECT 
                p.id, p.prescription_number, p.visit_id, p.status, p.notes, p.created_at,
                d.full_name AS doctor_name,
                pt.full_name AS patient_name, pt.mr_number,
                v.visit_number
            FROM prescriptions p
            JOIN visits v ON v.id = p.visit_id
            JOIN patients pt ON pt.id = v.patient_id
            JOIN medical_staff d ON d.id = p.doctor_id
            {$where}
            ORDER BY p.created_at DESC
        ", $params);

        foreach ($prescriptions as &$rx) {
            $items = Database::fetchAll("
                SELECT 
                    pi.id, pi.medicine_id, pi.quantity, pi.dosage, pi.frequency, 
                    pi.snapshot_price, (pi.quantity * pi.snapshot_price) AS subtotal,
                    m.name AS medicine_name, m.unit, COALESCE(ms.current_stock, 0) AS current_stock
                FROM prescription_items pi
                JOIN medicines m ON m.id = pi.medicine_id
                LEFT JOIN medicine_stocks ms ON ms.medicine_id = m.id
                WHERE pi.prescription_id = :rxid
            ", [':rxid' => $rx['id']]);
            $rx['items'] = $items;
        }

        return $prescriptions;
    }
}
