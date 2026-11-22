<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

class ClinicalService
{
    // =========================================================================
    // 1. TINDAKAN MEDIS (PROCEDURES) DENGAN SNAPSHOT TARIF
    // =========================================================================

    public function addProcedure(string $visitId, string $procedureId, string $doctorId, int $quantity = 1): array
    {
        $visit = Database::fetchOne("SELECT id, status FROM visits WHERE id = :id", [':id' => $visitId]);
        if (!$visit) throw new Exception("Kunjungan tidak ditemukan.", 404);

        $proc = Database::fetchOne("SELECT id, name, base_price FROM medical_procedures WHERE id = :id AND is_active = TRUE", [':id' => $procedureId]);
        if (!$proc) throw new Exception("Tindakan medis tidak ditemukan atau non-aktif.", 404);

        $quantity = max(1, $quantity);
        $snapshotPrice = (float) $proc['base_price'];
        $subtotal = $snapshotPrice * $quantity;

        $sql = "
            INSERT INTO visit_procedures (visit_id, procedure_id, doctor_id, snapshot_price, quantity, subtotal, status)
            VALUES (:vid, :pid, :did, :price, :qty, :subtotal, 'CONFIRMED')
            RETURNING id, procedure_id, snapshot_price, quantity, subtotal, status, created_at;
        ";

        $res = Database::fetchOne($sql, [
            ':vid' => $visitId,
            ':pid' => $procedureId,
            ':did' => $doctorId,
            ':price' => $snapshotPrice,
            ':qty' => $quantity,
            ':subtotal' => $subtotal,
        ]);

        $res['procedure_name'] = $proc['name'];
        return $res;
    }

    public function getProceduresByVisit(string $visitId): array
    {
        return Database::fetchAll("
            SELECT vp.id, vp.procedure_id, vp.snapshot_price, vp.quantity, vp.subtotal, vp.status, vp.cancel_reason, vp.created_at,
                   mp.code, mp.name AS procedure_name, doc.full_name AS doctor_name
            FROM visit_procedures vp
            JOIN medical_procedures mp ON mp.id = vp.procedure_id
            JOIN medical_staff doc ON doc.id = vp.doctor_id
            WHERE vp.visit_id = :vid
            ORDER BY vp.created_at ASC
        ", [':vid' => $visitId]);
    }

    public function cancelProcedure(string $id, string $reason): array
    {
        if (empty($reason)) throw new Exception("Alasan pembatalan tindakan wajib diisi.", 422);

        $sql = "
            UPDATE visit_procedures 
            SET status = 'CANCELLED', cancel_reason = :reason 
            WHERE id = :id 
            RETURNING id, status, cancel_reason;
        ";
        return Database::fetchOne($sql, [':id' => $id, ':reason' => $reason]);
    }

    // =========================================================================
    // 2. RESEP OBAT (PRESCRIPTIONS)
    // =========================================================================

    public function createPrescription(string $visitId, string $doctorId, array $items, ?string $notes = null): array
    {
        if (empty($items)) throw new Exception("Resep obat harus memiliki minimal 1 item obat.", 422);

        $visit = Database::fetchOne("SELECT id, status FROM visits WHERE id = :id", [':id' => $visitId]);
        if (!$visit) throw new Exception("Kunjungan tidak ditemukan.", 404);

        Database::beginTransaction();

        try {
            $dateClean = date('Ymd');
            $randSuffix = str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $rxNumber = "RX-{$dateClean}-{$randSuffix}";

            $rxSql = "
                INSERT INTO prescriptions (visit_id, doctor_id, prescription_number, status, notes)
                VALUES (:vid, :did, :rxnum, 'SUBMITTED', :notes)
                RETURNING id, prescription_number, status, notes, created_at;
            ";

            $prescription = Database::fetchOne($rxSql, [
                ':vid' => $visitId,
                ':did' => $doctorId,
                ':rxnum' => $rxNumber,
                ':notes' => $notes,
            ]);

            $savedItems = [];
            foreach ($items as $item) {
                if (empty($item['medicine_id']) || empty($item['quantity'])) continue;

                $med = Database::fetchOne("SELECT name, base_price FROM medicines WHERE id = :id", [':id' => $item['medicine_id']]);
                if (!$med) continue;

                $qty = max(1, (int) $item['quantity']);
                $price = (float) $med['base_price'];
                $subtotal = $price * $qty;

                $itemSql = "
                    INSERT INTO prescription_items (
                        prescription_id, medicine_id, dosage, frequency, quantity, route, instructions, snapshot_price, subtotal
                    ) VALUES (
                        :rxid, :medid, :dosage, :freq, :qty, :route, :inst, :price, :subtotal
                    ) RETURNING id, medicine_id, dosage, frequency, quantity, snapshot_price, subtotal;
                ";

                $savedItem = Database::fetchOne($itemSql, [
                    ':rxid' => $prescription['id'],
                    ':medid' => $item['medicine_id'],
                    ':dosage' => $item['dosage'] ?? '1 Tablet',
                    ':freq' => $item['frequency'] ?? '3x1 Sehari',
                    ':qty' => $qty,
                    ':route' => $item['route'] ?? 'Oral',
                    ':inst' => $item['instructions'] ?? null,
                    ':price' => $price,
                    ':subtotal' => $subtotal,
                ]);

                $savedItem['medicine_name'] = $med['name'];
                $savedItems[] = $savedItem;
            }

            // Transisi status kunjungan ke WAITING_PHARMACY
            Database::execute("
                UPDATE visits SET status = 'WAITING_PHARMACY', updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND status IN ('WAITING', 'IN_EXAMINATION')
            ", [':id' => $visitId]);

            Database::commit();

            $prescription['items'] = $savedItems;
            return $prescription;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function getPrescriptionsByVisit(string $visitId): array
    {
        $prescriptions = Database::fetchAll("
            SELECT rx.id, rx.prescription_number, rx.status, rx.notes, rx.created_at,
                   doc.full_name AS doctor_name
            FROM prescriptions rx
            JOIN medical_staff doc ON doc.id = rx.doctor_id
            WHERE rx.visit_id = :vid
            ORDER BY rx.created_at DESC
        ", [':vid' => $visitId]);

        foreach ($prescriptions as &$rx) {
            $rx['items'] = Database::fetchAll("
                SELECT ri.id, ri.medicine_id, ri.dosage, ri.frequency, ri.quantity, ri.snapshot_price, ri.subtotal, ri.instructions,
                       m.name AS medicine_name, m.unit
                FROM prescription_items ri
                JOIN medicines m ON m.id = ri.medicine_id
                WHERE ri.prescription_id = :rxid
            ", [':rxid' => $rx['id']]);
        }

        return $prescriptions;
    }

    // =========================================================================
    // 3. PERMINTAAN LABORATORIUM (LAB ORDERS)
    // =========================================================================

    public function createLabOrder(string $visitId, string $doctorId, array $testIds, ?string $clinicalNotes = null): array
    {
        if (empty($testIds)) throw new Exception("Permintaan lab harus memilih minimal 1 parameter tes.", 422);

        $visit = Database::fetchOne("SELECT id, status FROM visits WHERE id = :id", [':id' => $visitId]);
        if (!$visit) throw new Exception("Kunjungan tidak ditemukan.", 404);

        Database::beginTransaction();

        try {
            $dateClean = date('Ymd');
            $randSuffix = str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $orderNumber = "LAB-ORD-{$dateClean}-{$randSuffix}";

            $orderSql = "
                INSERT INTO lab_orders (visit_id, doctor_id, order_number, status, clinical_notes)
                VALUES (:vid, :did, :ordnum, 'ORDERED', :notes)
                RETURNING id, order_number, status, clinical_notes, created_at;
            ";

            $order = Database::fetchOne($orderSql, [
                ':vid' => $visitId,
                ':did' => $doctorId,
                ':ordnum' => $orderNumber,
                ':notes' => $clinicalNotes,
            ]);

            $savedItems = [];
            foreach ($testIds as $testId) {
                $test = Database::fetchOne("SELECT name, base_price FROM lab_tests WHERE id = :id", [':id' => $testId]);
                if (!$test) continue;

                $itemSql = "
                    INSERT INTO lab_order_items (lab_order_id, lab_test_id, snapshot_price)
                    VALUES (:loid, :ltid, :price)
                    RETURNING id, lab_test_id, snapshot_price;
                ";

                $savedItem = Database::fetchOne($itemSql, [
                    ':loid' => $order['id'],
                    ':ltid' => $testId,
                    ':price' => $test['base_price'],
                ]);

                $savedItem['test_name'] = $test['name'];
                $savedItems[] = $savedItem;
            }

            // Transisi status kunjungan ke WAITING_LAB
            Database::execute("
                UPDATE visits SET status = 'WAITING_LAB', updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND status IN ('WAITING', 'IN_EXAMINATION')
            ", [':id' => $visitId]);

            Database::commit();

            $order['items'] = $savedItems;
            return $order;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function getLabOrdersByVisit(string $visitId): array
    {
        $orders = Database::fetchAll("
            SELECT lo.id, lo.order_number, lo.status, lo.clinical_notes, lo.created_at,
                   doc.full_name AS doctor_name
            FROM lab_orders lo
            JOIN medical_staff doc ON doc.id = lo.doctor_id
            WHERE lo.visit_id = :vid
            ORDER BY lo.created_at DESC
        ", [':vid' => $visitId]);

        foreach ($orders as &$order) {
            $order['items'] = Database::fetchAll("
                SELECT loi.id, loi.lab_test_id, loi.snapshot_price,
                       lt.name AS test_name, lt.normal_range, lt.unit,
                       lr.result_value, lr.status AS result_status
                FROM lab_order_items loi
                JOIN lab_tests lt ON lt.id = loi.lab_test_id
                LEFT JOIN lab_results lr ON lr.lab_order_item_id = loi.id
                WHERE loi.lab_order_id = :loid
            ", [':loid' => $order['id']]);
        }

        return $orders;
    }
}
