<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Common\JwtHelper;
use App\Common\Database;
use App\Services\PharmacyDispensationService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class PharmacyController
{
    private PharmacyDispensationService $service;

    public function __construct()
    {
        $this->service = new PharmacyDispensationService();
    }

    public function dispense(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $id = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($id)) {
            $body = $request->getParsedBody() ?: json_decode((string)$request->getBody(), true);
            $id = $body['prescription_id'] ?? null;
        }

        if (empty($id)) {
            return ResponseHelper::error("ID resep (prescription_id) wajib disertakan.", 400);
        }

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $userId = $user['id'] ?? '66666666-6666-6666-6666-666666666666'; // Default Petugas Farmasi

        try {
            $result = $this->service->dispensePrescription($id, $userId, $body['notes'] ?? null);
            return ResponseHelper::success($result, "Obat berhasil diserahkan dan persediaan telah dipotong.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getStockMovements(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $medicineId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($medicineId)) return ResponseHelper::error("ID obat wajib disertakan.", 400);

        try {
            $movements = Database::fetchAll("
                SELECT sm.*, u.full_name AS operator_name
                FROM stock_movements sm
                LEFT JOIN users u ON u.id = sm.created_by
                WHERE sm.medicine_id = :med_id
                ORDER BY sm.created_at DESC
                LIMIT 50
            ", [':med_id' => $medicineId]);

            return ResponseHelper::success($movements, "Kartu mutasi stok berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
