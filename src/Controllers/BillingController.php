<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Common\JwtHelper;
use App\Common\Database;
use App\Services\BillingService;
use App\Services\InvoiceAdjustmentService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Router\CurrentRoute;
use Exception;

class BillingController
{
    private BillingService $service;

    public function __construct()
    {
        $this->service = new BillingService();
    }

    public function getInvoiceByVisit(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $visitId = $currentRoute?->getArgument('visitId') ?? $request->getAttribute('visitId');
        if (empty($visitId)) return ResponseHelper::error("Visit ID wajib disertakan.", 400);

        try {
            $invoice = $this->service->getOrCreateInvoice($visitId);
            return ResponseHelper::success($invoice, "Invoice tagihan rawat jalan berhasil dikonsolidasi.");
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function processPayment(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $invoiceId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($invoiceId)) return ResponseHelper::error("Invoice ID wajib disertakan.", 400);

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        // Ambil idempotency key dari header atau body
        $idempotencyKey = $request->getHeaderLine('X-Idempotency-Key') ?: ($body['idempotency_key'] ?? null);
        if ($idempotencyKey) {
            $body['idempotency_key'] = $idempotencyKey;
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $cashierId = $user['id'] ?? '88888888-8888-8888-8888-888888888888'; // Default Kasir

        try {
            $result = $this->service->processPayment($invoiceId, $body, $cashierId);
            $statusCode = $result['is_idempotent_replay'] ? 200 : 201;
            return ResponseHelper::success($result, "Pembayaran berhasil diproses.", $statusCode);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    public function getReceipt(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $paymentId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($paymentId)) return ResponseHelper::error("Payment ID wajib disertakan.", 400);

        try {
            $payment = Database::fetchOne("
                SELECT p.*,
                       p.amount AS amount_paid,
                       COALESCE(p.cash_received, p.amount) AS cash_received,
                       COALESCE(p.change_amount, 0) AS change_amount,
                       inv.invoice_number, inv.total_amount, inv.outstanding_balance, inv.status AS invoice_status,
                       pt.full_name AS patient_name, pt.mr_number, u.full_name AS cashier_name
                FROM payments p
                JOIN invoices inv ON inv.id = p.invoice_id
                JOIN patients pt ON pt.id = inv.patient_id
                JOIN users u ON u.id = p.cashier_id
                WHERE p.id = :id
            ", [':id' => $paymentId]);

            if (!$payment) return ResponseHelper::error("Kuitansi pembayaran tidak ditemukan.", 404);

            return ResponseHelper::success($payment, "Kuitansi pembayaran berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/invoices/{id}/adjustments
     */
    public function createAdjustment(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $invoiceId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($invoiceId)) return ResponseHelper::error("Invoice ID wajib disertakan.", 400);

        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $user = JwtHelper::getAuthenticatedUser($request);
        $userId = $user['id'] ?? '88888888-8888-8888-8888-888888888888';

        try {
            $adjService = new InvoiceAdjustmentService();
            $result = $adjService->createAdjustment($invoiceId, $body, $userId);
            return ResponseHelper::success($result, "Penyesuaian tagihan berhasil dicatat.", 201);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code);
        }
    }

    /**
     * GET /api/v1/invoices/{id}/adjustments
     */
    public function getAdjustments(ServerRequestInterface $request, ?CurrentRoute $currentRoute = null): ResponseInterface
    {
        $invoiceId = $currentRoute?->getArgument('id') ?? $request->getAttribute('id');
        if (empty($invoiceId)) return ResponseHelper::error("Invoice ID wajib disertakan.", 400);

        try {
            $adjService = new InvoiceAdjustmentService();
            $adjustments = $adjService->getAdjustmentsByInvoice($invoiceId);
            return ResponseHelper::success($adjustments, "Daftar penyesuaian invoice berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    public function listPayments(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getQueryParams();
        $limit = isset($params['limit']) ? (int) $params['limit'] : 50;

        try {
            $payments = Database::fetchAll("
                SELECT p.*,
                       p.amount AS amount_paid,
                       COALESCE(p.cash_received, p.amount) AS cash_received,
                       COALESCE(p.change_amount, 0) AS change_amount,
                       inv.invoice_number, inv.total_amount, inv.status AS invoice_status,
                       pt.full_name AS patient_name, pt.mr_number,
                       u.full_name AS cashier_name
                FROM payments p
                JOIN invoices inv ON inv.id = p.invoice_id
                JOIN patients pt ON pt.id = inv.patient_id
                JOIN users u ON u.id = p.cashier_id
                ORDER BY p.paid_at DESC
                LIMIT :limit
            ", [':limit' => $limit]);

            return ResponseHelper::success($payments, "Riwayat transaksi pembayaran kasir berhasil diambil.");
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }
}
