<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Services\SatuSehatService;
use App\Services\MedicalResumeService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class SatuSehatController
{
    private SatuSehatService $satuSehatService;
    private MedicalResumeService $resumeService;

    public function __construct()
    {
        $this->satuSehatService = new SatuSehatService();
        $this->resumeService = new MedicalResumeService();
    }

    /**
     * GET /api/v1/visits/{id}/fhir-bundle
     */
    public function getFhirBundle(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("ID Kunjungan wajib disertakan.", 400);

        try {
            $bundle = $this->satuSehatService->generateFhirBundle($visitId);
            return ResponseHelper::success($bundle, "FHIR R4 Bundle berhasil dibentuk.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 500;
            if ($code < 100 || $code > 599) $code = 500;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    /**
     * POST /api/v1/visits/{id}/satusehat-sync
     */
    public function sync(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("ID Kunjungan wajib disertakan.", 400);

        try {
            $res = $this->satuSehatService->syncToSatuSehat($visitId);
            return ResponseHelper::success($res, "Sinkronisasi SATUSEHAT Kemenkes RI berhasil diproses.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 500;
            if ($code < 100 || $code > 599) $code = 500;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    /**
     * GET /api/v1/visits/{id}/satusehat-logs
     */
    public function getLogs(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("ID Kunjungan wajib disertakan.", 400);

        try {
            $logs = $this->satuSehatService->getSyncLogs($visitId);
            return ResponseHelper::success($logs, "Riwayat sinkronisasi SATUSEHAT berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/visits/{id}/resume-medis
     */
    public function getResumeMedis(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("ID Kunjungan wajib disertakan.", 400);

        try {
            $resume = $this->resumeService->getMedicalResume($visitId);
            return ResponseHelper::success($resume, "Resume medis rawat jalan berhasil diambil.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 500;
            if ($code < 100 || $code > 599) $code = 500;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }
}
