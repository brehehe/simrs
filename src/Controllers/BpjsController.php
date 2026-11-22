<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Services\BpjsService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class BpjsController
{
    private BpjsService $bpjsService;

    public function __construct()
    {
        $this->bpjsService = new BpjsService();
    }

    /**
     * GET /api/v1/bpjs/peserta/{identifier}
     */
    public function checkPeserta(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $identifier = $currentRoute?->getArgument('identifier') ?? $request->getAttribute('identifier');
        if (empty($identifier)) return ResponseHelper::error("Nomor NIK atau No. Kartu BPJS wajib disertakan.", 400);

        try {
            $data = $this->bpjsService->checkPeserta($identifier);
            return ResponseHelper::success($data, "Data kepesertaan BPJS berhasil diverifikasi.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    /**
     * POST /api/v1/bpjs/sep
     */
    public function generateSep(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        try {
            $res = $this->bpjsService->generateSep($body);
            return ResponseHelper::success($res, "SEP berhasil diterbitkan.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }
}
