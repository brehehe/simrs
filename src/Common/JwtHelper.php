<?php

declare(strict_types=1);

namespace App\Common;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

class JwtHelper
{
    private static string $secretKey = 'simrs-jwt-ultra-secret-key-inova-2026';
    private static string $algorithm = 'HS256';

    public static function generateToken(array $user, int $ttlSeconds = 28800): string
    {
        $issuedAt = time();
        $expireAt = $issuedAt + $ttlSeconds;

        $payload = [
            'iss' => 'simrs-api',
            'aud' => 'simrs-client',
            'iat' => $issuedAt,
            'exp' => $expireAt,
            'sub' => $user['id'],
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role_code'] ?? $user['role'],
                'medical_staff_id' => $user['medical_staff_id'] ?? null,
                'polyclinic_id' => $user['polyclinic_id'] ?? null,
            ],
        ];

        return JWT::encode($payload, self::$secretKey, self::$algorithm);
    }

    public static function verifyToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key(self::$secretKey, self::$algorithm));
            return (array) $decoded->user;
        } catch (Exception) {
            return null;
        }
    }

    public static function getAuthenticatedUser(ServerRequestInterface $request): ?array
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }

        return self::verifyToken($matches[1]);
    }
}
