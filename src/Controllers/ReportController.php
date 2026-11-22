<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Services\ReportService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

class ReportController
{
    private ReportService $reportService;

    public function __construct()
    {
        $this->reportService = new ReportService();
    }

    /**
     * GET /api/v1/reports/top-diagnoses
     */
    public function getTopDiagnoses(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $start = $params['start_date'] ?? null;
        $end = $params['end_date'] ?? null;
        $limit = (int) ($params['limit'] ?? 10);

        try {
            $data = $this->reportService->getTopDiagnoses($start, $end, $limit);
            return ResponseHelper::success($data, "Laporan 10 besar penyakit berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/reports/financial-reconciliation
     */
    public function getFinancialReconciliation(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $start = $params['start_date'] ?? null;
        $end = $params['end_date'] ?? null;

        try {
            $data = $this->reportService->getFinancialReconciliation($start, $end);
            return ResponseHelper::success($data, "Laporan rekonsiliasi finansial berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/reports/visit-summary
     */
    public function getVisitSummary(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $start = $params['start_date'] ?? null;
        $end = $params['end_date'] ?? null;

        try {
            $data = $this->reportService->getVisitSummary($start, $end);
            return ResponseHelper::success($data, "Laporan ringkasan kunjungan berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/reports/medicine-usage
     */
    public function getMedicineUsage(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $start = $params['start_date'] ?? null;
        $end = $params['end_date'] ?? null;

        try {
            $data = $this->reportService->getMedicineUsageReport($start, $end);
            return ResponseHelper::success($data, "Laporan pemakaian obat berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
