<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Common\JwtHelper;
use App\Services\RegistrationService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class VisitController
{
    private RegistrationService $service;

    public function __construct()
    {
        $this->service = new RegistrationService();
    }

    public function create(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $authUser = JwtHelper::getAuthenticatedUser($request);
        $userId = $authUser['id'] ?? null;

        try {
            $visit = $this->service->registerVisit($body, $userId);
            return ResponseHelper::success($visit, "Kunjungan berhasil didaftarkan.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error(
                $e->getMessage(),
                $code,
                [],
                $code === 409 ? "DUPLICATE_ACTIVE_VISIT" : "REGISTRATION_ERROR"
            );
        }
    }

    public function list(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = max(1, min(100, (int) ($params['limit'] ?? 20)));

        try {
            $result = $this->service->getVisits($params, $page, $limit);
            return ResponseHelper::success(
                $result['items'],
                "Daftar kunjungan berhasil diambil.",
                200,
                ['pagination' => $result['pagination']]
            );
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function detail(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $id = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($id)) {
            return ResponseHelper::error("ID kunjungan wajib disertakan.", 400);
        }

        try {
            $visit = $this->service->getVisitById($id);
            if (!$visit) {
                return ResponseHelper::error("Kunjungan tidak ditemukan.", 404, [], "NOT_FOUND");
            }

            return ResponseHelper::success($visit, "Detail kunjungan berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function updateStatus(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $id = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($id)) {
            return ResponseHelper::error("ID kunjungan wajib disertakan.", 400);
        }

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $status = $body['status'] ?? '';
        $cancelReason = $body['cancel_reason'] ?? null;

        try {
            $updated = $this->service->updateVisitStatus($id, $status, $cancelReason);
            return ResponseHelper::success($updated, "Status kunjungan berhasil diperbarui.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function todayQueues(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $params['visit_date'] = date('Y-m-d');

        try {
            $result = $this->service->getVisits($params, 1, 50);
            return ResponseHelper::success($result['items'], "Antrean hari ini berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
