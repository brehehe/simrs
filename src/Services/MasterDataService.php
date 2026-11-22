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

    public function getUsers(): array
    {
        return Database::fetchAll("
            SELECT u.id, u.username, u.email, u.full_name, u.role_code, r.name as role_name,
                   u.is_active, u.created_at
            FROM users u
            JOIN roles r ON r.code = u.role_code
            WHERE u.is_active = TRUE
            ORDER BY u.created_at ASC
        ");
    }

    // --- Polyclinic CRUD ---
    public function createPolyclinic(array $data): array
    {
        if (empty($data['name']) || empty($data['code']) || empty($data['queue_prefix'])) {
            throw new Exception("Nama, kode, dan prefix antrean poliklinik wajib diisi.", 422);
        }
        $code = strtoupper(trim($data['code']));
        $queuePrefix = strtoupper(trim($data['queue_prefix']));

        $existing = Database::fetchOne("SELECT id FROM polyclinics WHERE code = :code", [':code' => $code]);
        if ($existing) throw new Exception("Kode poliklinik {$code} sudah terdaftar.", 409);

        return Database::fetchOne("
            INSERT INTO polyclinics (code, name, queue_prefix, is_active)
            VALUES (:code, :name, :pfx, TRUE)
            RETURNING id, code, name, queue_prefix, is_active
        ", [':code' => $code, ':name' => trim($data['name']), ':pfx' => $queuePrefix]);
    }

    public function updatePolyclinic(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM polyclinics WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Poliklinik tidak ditemukan.", 404);

        $name = trim($data['name'] ?? $existing['name']);
        $queuePrefix = strtoupper(trim($data['queue_prefix'] ?? $existing['queue_prefix']));
        $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : $existing['is_active'];

        return Database::fetchOne("
            UPDATE polyclinics
            SET name = :name, queue_prefix = :pfx, is_active = :act, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id, code, name, queue_prefix, is_active
        ", [':id' => $id, ':name' => $name, ':pfx' => $queuePrefix, ':act' => $isActive ? 'true' : 'false']);
    }

    public function deletePolyclinic(string $id): bool
    {
        Database::execute("UPDATE polyclinics SET is_active = FALSE WHERE id = :id", [':id' => $id]);
        return true;
    }

    // --- Doctor Schedules CRUD ---
    public function createDoctorSchedule(array $data): array
    {
        if (empty($data['doctor_id']) || empty($data['polyclinic_id']) || empty($data['day_of_week']) || empty($data['start_time']) || empty($data['end_time'])) {
            throw new Exception("Dokter, poliklinik, hari, dan jam praktik wajib diisi.", 422);
        }
        return Database::fetchOne("
            INSERT INTO doctor_schedules (doctor_id, polyclinic_id, day_of_week, start_time, end_time, quota, is_active)
            VALUES (:doc, :poly, :day, :start, :end, :quota, TRUE)
            RETURNING *
        ", [
            ':doc' => $data['doctor_id'],
            ':poly' => $data['polyclinic_id'],
            ':day' => (int)$data['day_of_week'],
            ':start' => $data['start_time'],
            ':end' => $data['end_time'],
            ':quota' => (int)($data['quota'] ?? 30),
        ]);
    }

    public function updateDoctorSchedule(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM doctor_schedules WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Jadwal dokter tidak ditemukan.", 404);

        return Database::fetchOne("
            UPDATE doctor_schedules
            SET doctor_id = :doc, polyclinic_id = :poly, day_of_week = :day,
                start_time = :start, end_time = :end, quota = :quota, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING *
        ", [
            ':id' => $id,
            ':doc' => $data['doctor_id'] ?? $existing['doctor_id'],
            ':poly' => $data['polyclinic_id'] ?? $existing['polyclinic_id'],
            ':day' => isset($data['day_of_week']) ? (int)$data['day_of_week'] : $existing['day_of_week'],
            ':start' => $data['start_time'] ?? $existing['start_time'],
            ':end' => $data['end_time'] ?? $existing['end_time'],
            ':quota' => isset($data['quota']) ? (int)$data['quota'] : $existing['quota'],
        ]);
    }

    public function deleteDoctorSchedule(string $id): bool
    {
        Database::execute("DELETE FROM doctor_schedules WHERE id = :id", [':id' => $id]);
        return true;
    }

    // --- Medical Staff CRUD ---
    public function createMedicalStaff(array $data): array
    {
        if (empty($data['full_name']) || empty($data['sip_number'])) {
            throw new Exception("Nama lengkap dan nomor SIP wajib diisi.", 422);
        }
        $sip = trim($data['sip_number']);
        $existing = Database::fetchOne("SELECT id FROM medical_staff WHERE sip_number = :sip", [':sip' => $sip]);
        if ($existing) throw new Exception("Nomor SIP {$sip} sudah terdaftar.", 409);

        return Database::fetchOne("
            INSERT INTO medical_staff (full_name, staff_type, sip_number, polyclinic_id, is_active)
            VALUES (:name, :type, :sip, :poly, TRUE)
            RETURNING id, full_name, staff_type, sip_number, polyclinic_id, is_active
        ", [
            ':name' => trim($data['full_name']),
            ':type' => in_array($data['staff_type'] ?? '', ['DOCTOR', 'NURSE']) ? $data['staff_type'] : 'DOCTOR',
            ':sip' => $sip,
            ':poly' => !empty($data['polyclinic_id']) ? $data['polyclinic_id'] : null,
        ]);
    }

    public function updateMedicalStaff(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM medical_staff WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Tenaga medis tidak ditemukan.", 404);

        return Database::fetchOne("
            UPDATE medical_staff
            SET full_name = :name, sip_number = :sip, staff_type = :type, polyclinic_id = :poly, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id, full_name, staff_type, sip_number, polyclinic_id, is_active
        ", [
            ':id' => $id,
            ':name' => trim($data['full_name'] ?? $existing['full_name']),
            ':sip' => trim($data['sip_number'] ?? $existing['sip_number']),
            ':type' => $data['staff_type'] ?? $existing['staff_type'],
            ':poly' => !empty($data['polyclinic_id']) ? $data['polyclinic_id'] : $existing['polyclinic_id'],
        ]);
    }

    public function deleteMedicalStaff(string $id): bool
    {
        Database::execute("UPDATE medical_staff SET is_active = FALSE WHERE id = :id", [':id' => $id]);
        return true;
    }

    // --- Medical Procedures CRUD ---
    public function createProcedure(array $data): array
    {
        if (empty($data['code']) || empty($data['name']) || !isset($data['base_price'])) {
            throw new Exception("Kode, nama tindakan, dan tarif dasar wajib diisi.", 422);
        }
        $code = strtoupper(trim($data['code']));
        $existing = Database::fetchOne("SELECT id FROM medical_procedures WHERE code = :c", [':c' => $code]);
        if ($existing) throw new Exception("Kode tindakan {$code} sudah terdaftar.", 409);

        return Database::fetchOne("
            INSERT INTO medical_procedures (code, name, base_price, is_active)
            VALUES (:c, :n, :p, TRUE)
            RETURNING id, code, name, base_price, is_active
        ", [
            ':c' => $code,
            ':n' => trim($data['name']),
            ':p' => (float)$data['base_price'],
        ]);
    }

    public function updateProcedure(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM medical_procedures WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Tindakan medis tidak ditemukan.", 404);

        return Database::fetchOne("
            UPDATE medical_procedures
            SET name = :n, base_price = :p, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id, code, name, base_price, is_active
        ", [
            ':id' => $id,
            ':n' => trim($data['name'] ?? $existing['name']),
            ':p' => isset($data['base_price']) ? (float)$data['base_price'] : $existing['base_price'],
        ]);
    }

    public function deleteProcedure(string $id): bool
    {
        Database::execute("UPDATE medical_procedures SET is_active = FALSE WHERE id = :id", [':id' => $id]);
        return true;
    }

    // --- Medicines & Stocks CRUD ---
    public function createMedicine(array $data): array
    {
        if (empty($data['code']) || empty($data['name']) || empty($data['unit']) || !isset($data['base_price'])) {
            throw new Exception("Kode, nama obat, satuan, dan harga dasar wajib diisi.", 422);
        }
        $code = strtoupper(trim($data['code']));
        $existing = Database::fetchOne("SELECT id FROM medicines WHERE code = :c", [':c' => $code]);
        if ($existing) throw new Exception("Kode obat {$code} sudah terdaftar.", 409);

        Database::beginTransaction();
        try {
            $med = Database::fetchOne("
                INSERT INTO medicines (code, name, generic_name, unit, base_price, is_active)
                VALUES (:c, :n, :g, :u, :p, TRUE)
                RETURNING id, code, name, generic_name, unit, base_price, is_active
            ", [
                ':c' => $code,
                ':n' => trim($data['name']),
                ':g' => trim($data['generic_name'] ?? $data['name']),
                ':u' => trim($data['unit']),
                ':p' => (float)$data['base_price'],
            ]);

            $stock = (int)($data['current_stock'] ?? 100);
            $minStock = (int)($data['minimum_stock'] ?? 20);

            Database::execute("
                INSERT INTO medicine_stocks (medicine_id, current_stock, minimum_stock)
                VALUES (:mid, :stk, :min)
            ", [':mid' => $med['id'], ':stk' => $stock, ':min' => $minStock]);

            Database::commit();
            $med['current_stock'] = $stock;
            $med['minimum_stock'] = $minStock;
            return $med;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function updateMedicine(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM medicines WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Obat tidak ditemukan.", 404);

        Database::beginTransaction();
        try {
            $med = Database::fetchOne("
                UPDATE medicines
                SET name = :n, generic_name = :g, unit = :u, base_price = :p, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING id, code, name, generic_name, unit, base_price, is_active
            ", [
                ':id' => $id,
                ':n' => trim($data['name'] ?? $existing['name']),
                ':g' => trim($data['generic_name'] ?? $existing['generic_name']),
                ':u' => trim($data['unit'] ?? $existing['unit']),
                ':p' => isset($data['base_price']) ? (float)$data['base_price'] : $existing['base_price'],
            ]);

            if (isset($data['current_stock']) || isset($data['minimum_stock'])) {
                $stockRow = Database::fetchOne("SELECT * FROM medicine_stocks WHERE medicine_id = :id", [':id' => $id]);
                $newStock = isset($data['current_stock']) ? (int)$data['current_stock'] : ($stockRow['current_stock'] ?? 0);
                $newMin = isset($data['minimum_stock']) ? (int)$data['minimum_stock'] : ($stockRow['minimum_stock'] ?? 10);

                Database::execute("
                    INSERT INTO medicine_stocks (medicine_id, current_stock, minimum_stock)
                    VALUES (:id, :s, :m)
                    ON CONFLICT (medicine_id)
                    DO UPDATE SET current_stock = :s, minimum_stock = :m
                ", [':id' => $id, ':s' => $newStock, ':m' => $newMin]);
                $med['current_stock'] = $newStock;
                $med['minimum_stock'] = $newMin;
            }

            Database::commit();
            return $med;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function deleteMedicine(string $id): bool
    {
        Database::execute("UPDATE medicines SET is_active = FALSE WHERE id = :id", [':id' => $id]);
        return true;
    }

    // --- Users CRUD ---
    public function createUser(array $data): array
    {
        if (empty($data['username']) || empty($data['full_name']) || empty($data['role_code'])) {
            throw new Exception("Username, nama lengkap, dan role wajib diisi.", 422);
        }
        $username = strtolower(trim($data['username']));
        $existing = Database::fetchOne("SELECT id FROM users WHERE username = :u", [':u' => $username]);
        if ($existing) throw new Exception("Username {$username} sudah digunakan.", 409);

        $password = $data['password'] ?? 'Password123!';
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $email = $data['email'] ?? "{$username}@simrs.hospital.id";

        return Database::fetchOne("
            INSERT INTO users (username, email, password_hash, role_code, full_name, is_active)
            VALUES (:u, :e, :p, :r, :fn, TRUE)
            RETURNING id, username, email, full_name, role_code, is_active, created_at
        ", [
            ':u' => $username,
            ':e' => $email,
            ':p' => $passwordHash,
            ':r' => strtoupper(trim($data['role_code'])),
            ':fn' => trim($data['full_name']),
        ]);
    }

    public function updateUser(string $id, array $data): array
    {
        $existing = Database::fetchOne("SELECT * FROM users WHERE id = :id", [':id' => $id]);
        if (!$existing) throw new Exception("Pengguna tidak ditemukan.", 404);

        $params = [
            ':id' => $id,
            ':fn' => trim($data['full_name'] ?? $existing['full_name']),
            ':e' => trim($data['email'] ?? $existing['email']),
            ':r' => strtoupper(trim($data['role_code'] ?? $existing['role_code'])),
        ];

        $passSql = "";
        if (!empty($data['password'])) {
            $passSql = ", password_hash = :p";
            $params[':p'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        return Database::fetchOne("
            UPDATE users
            SET full_name = :fn, email = :e, role_code = :r, updated_at = CURRENT_TIMESTAMP {$passSql}
            WHERE id = :id
            RETURNING id, username, email, full_name, role_code, is_active, created_at
        ", $params);
    }

    public function deleteUser(string $id): bool
    {
        Database::execute("UPDATE users SET is_active = FALSE WHERE id = :id", [':id' => $id]);
        return true;
    }
}
