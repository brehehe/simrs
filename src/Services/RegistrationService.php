<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use PDOException;
use Exception;

class RegistrationService
{
    /**
     * Mendaftarkan kunjungan pasien baru dengan perlindungan konkurensi penuh
     */
    public function registerVisit(array $data, ?string $registeredBy = null): array
    {
        // 1. Validasi input wajib
        $requiredFields = ['patient_id', 'polyclinic_id', 'doctor_id', 'visit_date'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field '{$field}' wajib diisi.", 422);
            }
        }

        $patientId = $data['patient_id'];
        $polyclinicId = $data['polyclinic_id'];
        $doctorId = $data['doctor_id'];
        $scheduleId = $data['schedule_id'] ?? null;
        $visitDate = $data['visit_date'];

        // 2. Validasi keberadaan pasien
        $patient = Database::fetchOne("SELECT id, mr_number, full_name FROM patients WHERE id = :id AND is_active = TRUE", [':id' => $patientId]);
        if (!$patient) {
            throw new Exception("Pasien tidak ditemukan atau berstatus non-aktif.", 404);
        }

        // 3. Validasi poliklinik
        $poly = Database::fetchOne("SELECT id, name, queue_prefix FROM polyclinics WHERE id = :id AND is_active = TRUE", [':id' => $polyclinicId]);
        if (!$poly) {
            throw new Exception("Poliklinik tidak ditemukan atau berstatus non-aktif.", 404);
        }

        // 4. Validasi dokter
        $doctor = Database::fetchOne(
            "SELECT id, full_name FROM medical_staff WHERE id = :id AND polyclinic_id = :poly AND is_active = TRUE",
            [':id' => $doctorId, ':poly' => $polyclinicId]
        );
        if (!$doctor) {
            throw new Exception("Dokter yang dipilih tidak bertugas pada poliklinik ini.", 422);
        }

        // 5. Cek Pendaftaran Ganda Aktif (Level Aplikasi)
        $existing = Database::fetchOne("
            SELECT id, visit_number, queue_display, status
            FROM visits
            WHERE patient_id = :patient_id 
              AND polyclinic_id = :poly_id 
              AND visit_date = :date 
              AND status NOT IN ('CANCELLED')
            LIMIT 1
        ", [
            ':patient_id' => $patientId,
            ':poly_id' => $polyclinicId,
            ':date' => $visitDate,
        ]);

        if ($existing) {
            throw new Exception("Pasien sudah memiliki antrean aktif ({$existing['queue_display']} - {$existing['status']}) di poliklinik ini pada tanggal {$visitDate}.", 409);
        }

        // 6. Transaksi Database untuk Alokasi Nomor Antrean Atomik & Simpan Kunjungan
        Database::beginTransaction();

        try {
            // Atomic Queue Counter increment
            $counterSql = "
                INSERT INTO queue_counters (polyclinic_id, queue_date, last_number, updated_at)
                VALUES (:poly_id, :queue_date, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (polyclinic_id, queue_date)
                DO UPDATE SET last_number = queue_counters.last_number + 1, updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            ";

            $counterRow = Database::fetchOne($counterSql, [
                ':poly_id' => $polyclinicId,
                ':queue_date' => $visitDate,
            ]);

            $queueNumber = (int) ($counterRow['last_number'] ?? 1);
            $queueDisplay = $poly['queue_prefix'] . str_pad((string) $queueNumber, 3, '0', STR_PAD_LEFT);

            // Generate visit_number: REG-YYYYMMDD-PXXXX (Unique hospital-wide)
            $dateClean = str_replace('-', '', $visitDate);
            $visitNumber = "REG-{$dateClean}-" . $poly['queue_prefix'] . str_pad((string) $queueNumber, 4, '0', STR_PAD_LEFT);

            // Simpan ke tabel visits
            $insertSql = "
                INSERT INTO visits (
                    visit_number, patient_id, polyclinic_id, doctor_id, schedule_id,
                    visit_date, queue_number, queue_display, status, registered_by
                ) VALUES (
                    :visit_num, :patient_id, :poly_id, :doctor_id, :sched_id,
                    :visit_date, :queue_num, :queue_disp, 'WAITING', :reg_by
                )
                RETURNING id, visit_number, visit_date, queue_number, queue_display, status, created_at;
            ";

            $visit = Database::fetchOne($insertSql, [
                ':visit_num' => $visitNumber,
                ':patient_id' => $patientId,
                ':poly_id' => $polyclinicId,
                ':doctor_id' => $doctorId,
                ':sched_id' => $scheduleId,
                ':visit_date' => $visitDate,
                ':queue_num' => $queueNumber,
                ':queue_disp' => $queueDisplay,
                ':reg_by' => $registeredBy,
            ]);

            // Audit Trail Kepatuhan Permenkes 24/2022
            (new AuditService())->log('visits', $visit['id'], 'INSERT', null, [
                'visit_number' => $visitNumber,
                'patient_id' => $patientId,
                'polyclinic_id' => $polyclinicId,
                'queue_display' => $queueDisplay,
                'status' => 'WAITING',
            ], $registeredBy);

            Database::commit();

            return [
                'id' => $visit['id'],
                'visit_number' => $visit['visit_number'],
                'visit_date' => $visit['visit_date'],
                'queue_number' => $visit['queue_number'],
                'queue_display' => $visit['queue_display'],
                'status' => $visit['status'],
                'patient_name' => $patient['full_name'],
                'mr_number' => $patient['mr_number'],
                'polyclinic_name' => $poly['name'],
                'doctor_name' => $doctor['full_name'],
                'created_at' => $visit['created_at'],
            ];
        } catch (PDOException $e) {
            Database::rollBack();

            // Tangkap PostgreSQL Error 23505 (Unique Constraint Violation on Partial Index)
            if ($e->getCode() === '23505') {
                throw new Exception("Pasien sudah memiliki antrean aktif pada poliklinik dan tanggal yang dipilih.", 409);
            }

            throw $e;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function getVisits(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $offset = ($page - 1) * $limit;
        $params = [];
        $where = "WHERE 1=1";

        if (!empty($filters['visit_date'])) {
            $where .= " AND v.visit_date = :vdate";
            $params[':vdate'] = $filters['visit_date'];
        }
        if (!empty($filters['polyclinic_id'])) {
            $where .= " AND v.polyclinic_id = :poly_id";
            $params[':poly_id'] = $filters['polyclinic_id'];
        }
        if (!empty($filters['doctor_id'])) {
            $where .= " AND v.doctor_id = :doc_id";
            $params[':doc_id'] = $filters['doctor_id'];
        }
        if (!empty($filters['status'])) {
            $where .= " AND v.status = :status";
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['search'])) {
            $where .= " AND (p.full_name ILIKE :s OR p.mr_number ILIKE :s OR v.visit_number ILIKE :s OR v.queue_display ILIKE :s)";
            $params[':s'] = "%" . trim($filters['search']) . "%";
        }
        if (!empty($filters['unpaid_only'])) {
            $where .= " AND v.status != 'CANCELLED' AND v.status != 'COMPLETED' AND (inv.status IS NULL OR inv.status != 'PAID' OR inv.outstanding_balance > 0)";
        }

        $countSql = "
            SELECT COUNT(*) 
            FROM visits v 
            JOIN patients p ON p.id = v.patient_id 
            LEFT JOIN invoices inv ON inv.visit_id = v.id
            {$where}
        ";
        $totalCount = (int) (Database::fetchOne($countSql, $params)['count'] ?? 0);

        $sql = "
            SELECT v.id, v.visit_number, v.visit_date, v.queue_number, v.queue_display, v.status, v.cancel_reason, v.created_at,
                   p.id AS patient_id, p.mr_number, p.full_name AS patient_name, p.gender, p.birth_date, p.phone,
                   poly.id AS polyclinic_id, poly.name AS polyclinic_name,
                   ms.id AS doctor_id, ms.full_name AS doctor_name,
                   inv.status AS invoice_status, inv.outstanding_balance
            FROM visits v
            JOIN patients p ON p.id = v.patient_id
            JOIN polyclinics poly ON poly.id = v.polyclinic_id
            JOIN medical_staff ms ON ms.id = v.doctor_id
            LEFT JOIN invoices inv ON inv.visit_id = v.id
            {$where}
            ORDER BY v.visit_date DESC, v.queue_number ASC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $items = Database::fetchAll($sql, $params);

        return [
            'items' => $items,
            'pagination' => [
                'total_count' => $totalCount,
                'page_count' => (int) ceil($totalCount / $limit),
                'current_page' => $page,
                'page_size' => $limit,
            ],
        ];
    }

    public function getVisitById(string $id): ?array
    {
        $sql = "
            SELECT v.id, v.visit_number, v.visit_date, v.queue_number, v.queue_display, v.status, v.cancel_reason, v.created_at,
                   p.id AS patient_id, p.mr_number, p.nik, p.full_name AS patient_name, p.gender, p.birth_date, p.address, p.phone,
                   poly.id AS polyclinic_id, poly.name AS polyclinic_name,
                   ms.id AS doctor_id, ms.full_name AS doctor_name, ms.sip_number
            FROM visits v
            JOIN patients p ON p.id = v.patient_id
            JOIN polyclinics poly ON poly.id = v.polyclinic_id
            JOIN medical_staff ms ON ms.id = v.doctor_id
            WHERE v.id = :id
        ";

        return Database::fetchOne($sql, [':id' => $id]);
    }

    public function updateVisitStatus(string $id, string $status, ?string $cancelReason = null): array
    {
        $validStatuses = [
            'REGISTERED', 'WAITING', 'IN_EXAMINATION', 'WAITING_LAB', 
            'WAITING_PHARMACY', 'READY_FOR_BILLING', 'COMPLETED', 'CANCELLED'
        ];

        if (!in_array($status, $validStatuses, true)) {
            throw new Exception("Status '{$status}' tidak valid.", 422);
        }

        $visit = Database::fetchOne("SELECT id, status FROM visits WHERE id = :id", [':id' => $id]);
        if (!$visit) {
            throw new Exception("Kunjungan tidak ditemukan.", 404);
        }

        if ($status === 'CANCELLED' && empty($cancelReason)) {
            throw new Exception("Alasan pembatalan (cancel_reason) wajib diisi.", 422);
        }

        $sql = "
            UPDATE visits 
            SET status = :status, cancel_reason = :cancel, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id, visit_number, status, cancel_reason, updated_at;
        ";

        return Database::fetchOne($sql, [
            ':status' => $status,
            ':cancel' => $cancelReason,
            ':id' => $id,
        ]);
    }
}
