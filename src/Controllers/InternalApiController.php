<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\Database;
use App\Common\ResponseHelper;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

class InternalApiController
{
    public function receiveLabResults(ServerRequestInterface $request): ResponseInterface
    {
        $expectedSecret = getenv('INTERNAL_SERVICE_SECRET') ?: 'simrs-service-secret-inova-2026';
        $providedSecret = $request->getHeaderLine('X-Internal-Secret');

        if ($providedSecret !== $expectedSecret) {
            return ResponseHelper::error("Unauthorized: Invalid internal service secret.", 401, [], "UNAUTHORIZED_SERVICE");
        }

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $labOrderId = $body['lab_order_id'] ?? null;
        $results = $body['results'] ?? [];

        if (empty($labOrderId) || empty($results) || !is_array($results)) {
            return ResponseHelper::error("lab_order_id dan results array wajib disertakan.", 422, [], "VALIDATION_ERROR");
        }

        Database::beginTransaction();

        try {
            $order = Database::fetchOne("
                SELECT id, visit_id, order_number, status 
                FROM lab_orders 
                WHERE id = :id 
                FOR UPDATE
            ", [':id' => $labOrderId]);

            if (!$order) {
                Database::rollBack();
                return ResponseHelper::error("Permintaan laboratorium tidak ditemukan.", 404, [], "NOT_FOUND");
            }

            if ($order['status'] === 'COMPLETED') {
                Database::rollBack();
                return ResponseHelper::success([
                    'lab_order_id' => $labOrderId,
                    'status' => 'COMPLETED',
                    'message' => 'Hasil laboratorium telah tercatat sebelumnya (idempotent response).',
                ], "Hasil lab sudah diproses sebelumnya.");
            }

            // Simpan setiap item hasil uji lab
            foreach ($results as $item) {
                $orderItemId = $item['lab_order_item_id'] ?? null;
                if (!$orderItemId) continue;

                // Ambil referensi harga dan tes
                $itemMeta = Database::fetchOne("
                    SELECT loi.id, lt.unit, lt.normal_range
                    FROM lab_order_items loi
                    JOIN lab_tests lt ON lt.id = loi.lab_test_id
                    WHERE loi.id = :loiid AND loi.lab_order_id = :loid
                ", [
                    ':loiid' => $orderItemId,
                    ':loid' => $labOrderId,
                ]);

                $unit = !empty($item['unit']) ? $item['unit'] : ($itemMeta['unit'] ?? '-');
                $normalRange = !empty($item['normal_range']) ? $item['normal_range'] : ($itemMeta['normal_range'] ?? '-');

                // Upsert ke lab_results
                Database::execute("
                    INSERT INTO lab_results (
                        lab_order_id, lab_order_item_id, result_value, normal_range_snapshot,
                        unit_snapshot, status, notes
                    ) VALUES (
                        :loid, :loiid, :val, :normal, :unit, :status, :notes
                    )
                    ON CONFLICT (lab_order_item_id) DO UPDATE SET
                        result_value = EXCLUDED.result_value,
                        normal_range_snapshot = EXCLUDED.normal_range_snapshot,
                        unit_snapshot = EXCLUDED.unit_snapshot,
                        status = EXCLUDED.status,
                        notes = EXCLUDED.notes,
                        updated_at = CURRENT_TIMESTAMP
                ", [
                    ':loid' => $labOrderId,
                    ':loiid' => $orderItemId,
                    ':val' => (string) ($item['result_value'] ?? ''),
                    ':normal' => $normalRange,
                    ':unit' => $unit,
                    ':status' => $item['status'] ?? 'FINAL',
                    ':notes' => $item['notes'] ?? 'Diteruskan dari gateway analyzer eksternal.',
                ]);
            }

            // Update status lab order menjadi COMPLETED
            Database::execute("
                UPDATE lab_orders 
                SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
                WHERE id = :id
            ", [':id' => $labOrderId]);

            // Cek apakah kunjungan masih berstatus WAITING_LAB. Jika ya, ubah ke READY_FOR_BILLING
            Database::execute("
                UPDATE visits 
                SET status = 'READY_FOR_BILLING', updated_at = CURRENT_TIMESTAMP 
                WHERE id = :vid AND status = 'WAITING_LAB'
            ", [':vid' => $order['visit_id']]);

            Database::commit();

            return ResponseHelper::success([
                'lab_order_id' => $labOrderId,
                'status' => 'COMPLETED',
                'order_number' => $order['order_number'],
                'items_ingested' => count($results),
            ], "Hasil pemeriksaan laboratorium berhasil disimpan ke SIMRS Core.");
        } catch (Exception $e) {
            Database::rollBack();
            return ResponseHelper::error("Gagal menyimpan hasil laboratorium: " . $e->getMessage(), 500);
        }
    }
}
