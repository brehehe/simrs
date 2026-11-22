<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use App\Common\JwtHelper;
use App\Services\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

class AuthController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function login(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();
        if (empty($body)) {
            $raw = (string) $request->getBody();
            $body = json_decode($raw, true) ?: [];
        }

        $username = $body['username'] ?? '';
        $password = $body['password'] ?? '';

        if (empty($username) || empty($password)) {
            return ResponseHelper::error("Username dan password wajib diisi.", 422, [
                'username' => empty($username) ? ["Username wajib diisi."] : [],
                'password' => empty($password) ? ["Password wajib diisi."] : [],
            ], "VALIDATION_ERROR");
        }

        try {
            $data = $this->authService->login($username, $password);
            return ResponseHelper::success($data, "Login berhasil.", 200);
        } catch (Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            return ResponseHelper::error($e->getMessage(), $code, [], "AUTH_ERROR");
        }
    }

    public function me(ServerRequestInterface $request): ResponseInterface
    {
        $authUser = JwtHelper::getAuthenticatedUser($request);
        if (!$authUser) {
            return ResponseHelper::error("Sesi tidak valid atau telah kedaluwarsa.", 401, [], "UNAUTHORIZED");
        }

        $profile = $this->authService->getUserProfile($authUser['id']);
        if (!$profile) {
            return ResponseHelper::error("Pengguna tidak ditemukan.", 404, [], "NOT_FOUND");
        }

        return ResponseHelper::success($profile, "Profil berhasil diambil.", 200);
    }

    public function logout(): ResponseInterface
    {
        return ResponseHelper::success(null, "Logout berhasil.", 200);
    }
}
