<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Common\JwtHelper;
use App\Services\MedicalRecordService;
use App\Services\ClinicalService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class ClinicalController
{
    private MedicalRecordService $emrService;
    private ClinicalService $clinicalService;

    public function __construct()
    {
        $this->emrService = new MedicalRecordService();
        $this->clinicalService = new ClinicalService();
    }

    // --- EMR (SOAP) ---
    public function saveMedicalRecord(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $doctorId = $user['medical_staff_id'] ?? 'b0000000-0000-0000-0000-000000000001';

        try {
            $record = $this->emrService->saveMedicalRecord($body, $doctorId);
            return ResponseHelper::success($record, "Rekam medis berhasil disimpan.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getMedicalRecordByVisit(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('visitId') ?? $request->getAttribute('visitId');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        try {
            $record = $this->emrService->getMedicalRecordByVisitId($visitId);
            return ResponseHelper::success($record, "Data rekam medis berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getPatientHistory(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $patientId = $currentRoute?->getArgument('patientId') ?? $request->getAttribute('patientId');
        if (empty($patientId)) return ResponseHelper::error("Patient ID wajib disertakan.", 400);

        try {
            $history = $this->emrService->getPatientMedicalHistory($patientId);
            return ResponseHelper::success($history, "Riwayat medis pasien berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    // --- PROCEDURES ---
    public function addProcedure(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $doctorId = $user['medical_staff_id'] ?? 'b0000000-0000-0000-0000-000000000001';

        $procedureId = $body['procedure_id'] ?? '';
        $qty = (int) ($body['quantity'] ?? 1);

        try {
            $res = $this->clinicalService->addProcedure($visitId, $procedureId, $doctorId, $qty);
            return ResponseHelper::success($res, "Tindakan medis berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getProcedures(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        try {
            $data = $this->clinicalService->getProceduresByVisit($visitId);
            return ResponseHelper::success($data, "Daftar tindakan medis kunjungan berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    // --- PRESCRIPTIONS ---
    public function createPrescription(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $doctorId = $user['medical_staff_id'] ?? 'b0000000-0000-0000-0000-000000000001';

        $visitId = $body['visit_id'] ?? '';
        $items = $body['items'] ?? [];
        $notes = $body['notes'] ?? null;

        try {
            $rx = $this->clinicalService->createPrescription($visitId, $doctorId, $items, $notes);
            return ResponseHelper::success($rx, "Resep obat berhasil dikirim ke depo farmasi.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getPrescriptions(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        try {
            $data = $this->clinicalService->getPrescriptionsByVisit($visitId);
            return ResponseHelper::success($data, "Daftar resep kunjungan berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    // --- LAB ORDERS ---
    public function createLabOrder(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $doctorId = $user['medical_staff_id'] ?? 'b0000000-0000-0000-0000-000000000001';

        $visitId = $body['visit_id'] ?? '';
        $testIds = $body['test_ids'] ?? [];
        $notes = $body['clinical_notes'] ?? null;

        try {
            $order = $this->clinicalService->createLabOrder($visitId, $doctorId, $testIds, $notes);
            return ResponseHelper::success($order, "Permintaan laboratorium berhasil dibuat.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getLabOrders(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        try {
            $data = $this->clinicalService->getLabOrdersByVisit($visitId);
            return ResponseHelper::success($data, "Daftar permintaan laboratorium kunjungan berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
