<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Services\AuditService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

/**
 * Controller Audit Trail Kepatuhan RME (Permenkes No. 24 Tahun 2022)
 */
class AuditController
{
    private AuditService $auditService;

    public function __construct()
    {
        $this->auditService = new AuditService();
    }

    /**
     * GET /api/v1/audit/logs
     */
    public function getLogs(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $limit = (int) ($params['limit'] ?? 50);
        $tableName = $params['table_name'] ?? null;
        $action = $params['action'] ?? null;

        try {
            $data = $this->auditService->getLogs($limit, $tableName, $action);
            return ResponseHelper::success($data, "Daftar audit log berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/audit/patients/{patientId}
     */
    public function getPatientAuditTrail(ServerRequestInterface $request): ResponseInterface
    {
        $patientId = (string) $request->getAttribute('patientId');
        if (empty($patientId)) {
            $queryParams = $request->getQueryParams();
            $patientId = $queryParams['patient_id'] ?? '';
        }

        try {
            $data = $this->auditService->getPatientAuditTrail($patientId);
            return ResponseHelper::success($data, "Jejak audit kepatuhan RME pasien berhasil diambil.");
        } catch (Exception $e) {
            $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    /**
     * GET /api/v1/audit/compliance-summary
     */
    public function getComplianceSummary(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $data = $this->auditService->getComplianceSummary();
            return ResponseHelper::success($data, "Ringkasan kepatuhan regulasi RME berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
