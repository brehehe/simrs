<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

class MasterDataService
{
    public function getPatients(?string $search = null, int $page = 1, int $limit = 10): array
    {
        $offset = ($page - 1) * $limit;
        $params = [];
        $where = "WHERE is_active = TRUE";

        if (!empty($search)) {
            $where .= " AND (mr_number ILIKE :s OR nik ILIKE :s OR full_name ILIKE :s OR phone ILIKE :s)";
            $params[':s'] = "%" . trim($search) . "%";
        }

        $countSql = "SELECT COUNT(*) FROM patients {$where}";
        $totalCount = (int) (Database::fetchOne($countSql, $params)['count'] ?? 0);

        $sql = "
            SELECT id, mr_number, nik, full_name, birth_date, gender, address, phone, is_active, created_at
            FROM patients
            {$where}
            ORDER BY created_at DESC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $data = Database::fetchAll($sql, $params);

        return [
            'items' => $data,
            'pagination' => [
                'total_count' => $totalCount,
                'page_count' => (int) ceil($totalCount / $limit),
                'current_page' => $page,
                'page_size' => $limit,
            ],
        ];
    }

    public function getPatientById(string $id): ?array
    {
        return Database::fetchOne(
            "SELECT id, mr_number, nik, full_name, birth_date, gender, address, phone, is_active, created_at FROM patients WHERE id = :id",
            [':id' => $id]
        );
    }

    public function createPatient(array $data): array
    {
        // 1. Validate required fields
        if (empty($data['nik']) || empty($data['full_name']) || empty($data['birth_date']) || empty($data['gender'])) {
            throw new Exception("NIK, Nama Lengkap, Tanggal Lahir, dan Jenis Kelamin wajib diisi.", 422);
        }

        // 2. Validate unique NIK
        $existing = Database::fetchOne("SELECT id FROM patients WHERE nik = :nik", [':nik' => trim($data['nik'])]);
        if ($existing) {
            throw new Exception("Pasien dengan NIK " . $data['nik'] . " sudah terdaftar di sistem.", 409);
        }

        // 3. Auto-generate MR Number: RM-YYYYMM-XXXXX
        $prefix = 'RM-' . date('Ym') . '-';
        $lastRow = Database::fetchOne(
            "SELECT mr_number FROM patients WHERE mr_number LIKE :prefix ORDER BY mr_number DESC LIMIT 1",
            [':prefix' => $prefix . '%']
        );

        $nextSeq = 1;
        if ($lastRow && preg_match('/RM-\d{6}-(\d{5})/', $lastRow['mr_number'], $matches)) {
            $nextSeq = ((int) $matches[1]) + 1;
        }
        $mrNumber = $prefix . str_pad((string) $nextSeq, 5, '0', STR_PAD_LEFT);

        $sql = "
            INSERT INTO patients (mr_number, nik, full_name, birth_date, gender, address, phone, is_active)
            VALUES (:mr, :nik, :name, :birth, :gender, :address, :phone, TRUE)
            RETURNING id, mr_number, nik, full_name, birth_date, gender, address, phone, created_at
        ";

        $patient = Database::fetchOne($sql, [
            ':mr' => $mrNumber,
            ':nik' => trim($data['nik']),
            ':name' => trim($data['full_name']),
            ':birth' => $data['birth_date'],
            ':gender' => strtoupper($data['gender']),
            ':address' => $data['address'] ?? '-',
            ':phone' => $data['phone'] ?? '-',
        ]);

        return $patient;
    }

    public function getPolyclinics(): array
    {
        return Database::fetchAll(
            "SELECT id, code, name, queue_prefix, is_active FROM polyclinics WHERE is_active = TRUE ORDER BY name ASC"
        );
    }

    public function getMedicalStaff(?string $polyId = null): array
    {
        $params = [];
        $where = "WHERE ms.is_active = TRUE";
        if ($polyId) {
            $where .= " AND ms.polyclinic_id = :poly_id";
            $params[':poly_id'] = $polyId;
        }

        return Database::fetchAll("
            SELECT ms.id, ms.user_id, ms.staff_type, ms.sip_number, ms.full_name, ms.polyclinic_id, p.name AS polyclinic_name
            FROM medical_staff ms
            LEFT JOIN polyclinics p ON p.id = ms.polyclinic_id
            {$where}
            ORDER BY ms.full_name ASC
        ", $params);
    }

    public function getDoctorSchedules(?string $polyId = null, ?int $dayOfWeek = null): array
    {
        $params = [];
        $where = "WHERE ds.is_active = TRUE";
        if ($polyId) {
            $where .= " AND ds.polyclinic_id = :poly_id";
            $params[':poly_id'] = $polyId;
        }
        if ($dayOfWeek) {
            $where .= " AND ds.day_of_week = :day";
            $params[':day'] = $dayOfWeek;
        }

        return Database::fetchAll("
            SELECT ds.id, ds.doctor_id, ds.polyclinic_id, ds.day_of_week, ds.start_time, ds.end_time, ds.quota,
                   ms.full_name AS doctor_name, p.name AS polyclinic_name
            FROM doctor_schedules ds
            JOIN medical_staff ms ON ms.id = ds.doctor_id
            JOIN polyclinics p ON p.id = ds.polyclinic_id
            {$where}
            ORDER BY ds.day_of_week ASC, ds.start_time ASC
        ", $params);
    }

    public function getProcedures(): array
    {
        return Database::fetchAll(
            "SELECT id, code, name, base_price, is_active FROM medical_procedures WHERE is_active = TRUE ORDER BY name ASC"
        );
    }

    public function getMedicines(): array
    {
        return Database::fetchAll("
            SELECT m.id, m.code, m.name, m.generic_name, m.unit, m.base_price,
                   COALESCE(ms.current_stock, 0) AS current_stock, COALESCE(ms.minimum_stock, 10) AS minimum_stock
            FROM medicines m
            LEFT JOIN medicine_stocks ms ON ms.medicine_id = m.id
            WHERE m.is_active = TRUE
            ORDER BY m.name ASC
        ");
    }

    public function getLabTests(): array
    {
        return Database::fetchAll(
            "SELECT id, code, name, normal_range, unit, base_price, is_active FROM lab_tests WHERE is_active = TRUE ORDER BY name ASC"
        );
    }

    public function getDiagnoses(?string $search = null): array
    {
        $params = [];
        $where = "WHERE is_active = TRUE";
        if (!empty($search)) {
            $where .= " AND (code ILIKE :s OR description ILIKE :s)";
            $params[':s'] = "%" . trim($search) . "%";
        }

        return Database::fetchAll("
            SELECT id, code, description FROM diagnoses {$where} ORDER BY code ASC LIMIT 50
        ", $params);
    }
}
