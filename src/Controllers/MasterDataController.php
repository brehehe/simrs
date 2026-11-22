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

    private function getJsonBody(ServerRequestInterface $request): array
    {
        $body = $request->getParsedBody();
        if (empty($body) || !is_array($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }
        return $body;
    }

    private function getRouteId(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): string
    {
        return (string) ($currentRoute?->getArgument('id') ?? $request->getAttribute('id') ?? '');
    }

    // --- Polyclinic CRUD ---
    public function createPolyclinic(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createPolyclinic($body);
            return ResponseHelper::success($item, "Poliklinik berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_POLYCLINIC_ERROR");
        }
    }

    public function updatePolyclinic(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updatePolyclinic($id, $body);
            return ResponseHelper::success($item, "Poliklinik berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_POLYCLINIC_ERROR");
        }
    }

    public function deletePolyclinic(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deletePolyclinic($id);
            return ResponseHelper::success(null, "Poliklinik berhasil dinonaktifkan.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_POLYCLINIC_ERROR");
        }
    }

    // --- Medical Staff CRUD ---
    public function createMedicalStaff(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createMedicalStaff($body);
            return ResponseHelper::success($item, "Tenaga medis berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_STAFF_ERROR");
        }
    }

    public function updateMedicalStaff(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updateMedicalStaff($id, $body);
            return ResponseHelper::success($item, "Tenaga medis berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_STAFF_ERROR");
        }
    }

    public function deleteMedicalStaff(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deleteMedicalStaff($id);
            return ResponseHelper::success(null, "Tenaga medis berhasil dinonaktifkan.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_STAFF_ERROR");
        }
    }

    // --- Doctor Schedules CRUD ---
    public function createDoctorSchedule(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createDoctorSchedule($body);
            return ResponseHelper::success($item, "Jadwal dokter berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_SCHEDULE_ERROR");
        }
    }

    public function updateDoctorSchedule(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updateDoctorSchedule($id, $body);
            return ResponseHelper::success($item, "Jadwal dokter berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_SCHEDULE_ERROR");
        }
    }

    public function deleteDoctorSchedule(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deleteDoctorSchedule($id);
            return ResponseHelper::success(null, "Jadwal dokter berhasil dihapus.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_SCHEDULE_ERROR");
        }
    }

    // --- Procedures CRUD ---
    public function createProcedure(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createProcedure($body);
            return ResponseHelper::success($item, "Tindakan medis berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_PROCEDURE_ERROR");
        }
    }

    public function updateProcedure(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updateProcedure($id, $body);
            return ResponseHelper::success($item, "Tindakan medis berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_PROCEDURE_ERROR");
        }
    }

    public function deleteProcedure(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deleteProcedure($id);
            return ResponseHelper::success(null, "Tindakan medis berhasil dinonaktifkan.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_PROCEDURE_ERROR");
        }
    }

    // --- Medicines CRUD ---
    public function createMedicine(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createMedicine($body);
            return ResponseHelper::success($item, "Obat berhasil ditambahkan ke katalog.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_MEDICINE_ERROR");
        }
    }

    public function updateMedicine(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updateMedicine($id, $body);
            return ResponseHelper::success($item, "Data obat & stok berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_MEDICINE_ERROR");
        }
    }

    public function deleteMedicine(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deleteMedicine($id);
            return ResponseHelper::success(null, "Obat berhasil dinonaktifkan.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_MEDICINE_ERROR");
        }
    }

    // --- Users CRUD ---
    public function createUser(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = $this->getJsonBody($request);
            $item = $this->service->createUser($body);
            return ResponseHelper::success($item, "Pengguna sistem berhasil ditambahkan.", 201);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "CREATE_USER_ERROR");
        }
    }

    public function updateUser(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $body = $this->getJsonBody($request);
            $item = $this->service->updateUser($id, $body);
            return ResponseHelper::success($item, "Data pengguna berhasil diperbarui.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "UPDATE_USER_ERROR");
        }
    }

    public function deleteUser(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        try {
            $id = $this->getRouteId($request, $currentRoute);
            $this->service->deleteUser($id);
            return ResponseHelper::success(null, "Pengguna berhasil dinonaktifkan.", 200);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "DELETE_USER_ERROR");
        }
    }
}
