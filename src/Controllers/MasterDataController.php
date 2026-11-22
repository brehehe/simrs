<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Services\MasterDataService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class MasterDataController
{
    private MasterDataService $service;

    public function __construct()
    {
        $this->service = new MasterDataService();
    }

    public function getPatients(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $search = $params['search'] ?? null;
        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = max(1, min(100, (int) ($params['limit'] ?? 10)));

        try {
            $result = $this->service->getPatients($search, $page, $limit);
            return ResponseHelper::success(
                $result['items'],
                "Data pasien berhasil diambil.",
                200,
                ['pagination' => $result['pagination']]
            );
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getPatientById(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $id = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($id)) {
            return ResponseHelper::error("ID pasien wajib disertakan.", 400);
        }

        $patient = $this->service->getPatientById($id);
        if (!$patient) {
            return ResponseHelper::error("Pasien tidak ditemukan.", 404, [], "NOT_FOUND");
        }

        return ResponseHelper::success($patient, "Detail pasien berhasil diambil.", 200);
    }

    public function createPatient(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        try {
            $patient = $this->service->createPatient($body);
            return ResponseHelper::success($patient, "Pasien berhasil didaftarkan.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_PATIENT_ERROR");
        }
    }

    public function getPolyclinics(): ResponseInterface
    {
        try {
            $data = $this->service->getPolyclinics();
            return ResponseHelper::success($data, "Data poliklinik berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getMedicalStaff(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $polyId = $params['polyclinic_id'] ?? null;

        try {
            $data = $this->service->getMedicalStaff($polyId);
            return ResponseHelper::success($data, "Data tenaga medis berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getDoctorSchedules(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $polyId = $params['polyclinic_id'] ?? null;
        $dayOfWeek = isset($params['day_of_week']) ? (int) $params['day_of_week'] : null;

        try {
            $data = $this->service->getDoctorSchedules($polyId, $dayOfWeek);
            return ResponseHelper::success($data, "Data jadwal dokter berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getProcedures(): ResponseInterface
    {
        try {
            $data = $this->service->getProcedures();
            return ResponseHelper::success($data, "Data tindakan medis berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getMedicines(): ResponseInterface
    {
        try {
            $data = $this->service->getMedicines();
            return ResponseHelper::success($data, "Katalog obat berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getLabTests(): ResponseInterface
    {
        try {
            $data = $this->service->getLabTests();
            return ResponseHelper::success($data, "Katalog tes laboratorium berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getDiagnoses(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $search = $params['search'] ?? null;

        try {
            $data = $this->service->getDiagnoses($search);
            return ResponseHelper::success($data, "Daftar diagnosis ICD-10 berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function getUsers(): ResponseInterface
    {
        try {
            $data = $this->service->getUsers();
            return ResponseHelper::success($data, "Daftar pengguna sistem berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
