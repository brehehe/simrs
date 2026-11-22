<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use App\Common\JwtHelper;
use Exception;

class AuthService
{
    public function login(string $username, string $password): array
    {
        $sql = "
            SELECT u.id, u.username, u.email, u.password_hash, u.role_code, u.full_name, u.is_active,
                   ms.id AS medical_staff_id, ms.polyclinic_id, p.name AS polyclinic_name
            FROM users u
            LEFT JOIN medical_staff ms ON ms.user_id = u.id AND ms.is_active = TRUE
            LEFT JOIN polyclinics p ON p.id = ms.polyclinic_id
            WHERE LOWER(u.username) = LOWER(:username)
        ";

        $user = Database::fetchOne($sql, [':username' => trim($username)]);

        if (!$user) {
            throw new Exception("Kredensial tidak valid. Silakan periksa kembali username dan kata sandi Anda.", 401);
        }

        if (!$user['is_active']) {
            throw new Exception("Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.", 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception("Kredensial tidak valid. Silakan periksa kembali username dan kata sandi Anda.", 401);
        }

        $token = JwtHelper::generateToken($user);

        return [
            'token' => $token,
            'expires_in' => 28800,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role_code'],
                'medical_staff_id' => $user['medical_staff_id'],
                'polyclinic_id' => $user['polyclinic_id'],
                'polyclinic_name' => $user['polyclinic_name'],
            ],
        ];
    }

    public function getUserProfile(string $userId): ?array
    {
        $sql = "
            SELECT u.id, u.username, u.email, u.role_code, u.full_name, u.is_active,
                   ms.id AS medical_staff_id, ms.polyclinic_id, p.name AS polyclinic_name
            FROM users u
            LEFT JOIN medical_staff ms ON ms.user_id = u.id AND ms.is_active = TRUE
            LEFT JOIN polyclinics p ON p.id = ms.polyclinic_id
            WHERE u.id = :id
        ";

        $user = Database::fetchOne($sql, [':id' => $userId]);
        if (!$user) {
            return null;
        }

        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'role' => $user['role_code'],
            'medical_staff_id' => $user['medical_staff_id'],
            'polyclinic_id' => $user['polyclinic_id'],
            'polyclinic_name' => $user['polyclinic_name'],
        ];
    }
}
