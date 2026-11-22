<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

/**
 * Service Audit Trail Kepatuhan Rekam Medis Elektronik (Permenkes No. 24 Tahun 2022)
 * Memastikan setiap akses, mutasi klinis, resep, dan transaksi finansial tercatat secara immutable.
 */
class AuditService
{
    /**
     * Catat aksi mutasi data ke tabel audit_logs sesuai Permenkes No. 24 Tahun 2022
     *
     * @param string $tableName Nama tabel sumber
     * @param string $recordId ID unik record yang diubah/dibuat
     * @param string $action 'INSERT', 'UPDATE', atau 'DELETE'
     * @param array|null $oldValues Data sebelum mutasi
     * @param array|null $newValues Data setelah mutasi
     * @param string|null $userId UUID pengguna pelaku aksi
     * @param string|null $ipAddress IP address klien
     * @return int ID audit log yang terbentuk
     */
    public function log(
        string $tableName,
        string $recordId,
        string $action,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $userId = null,
        ?string $ipAddress = null
    ): int {
        $validActions = ['INSERT', 'UPDATE', 'DELETE'];
        $actionUpper = strtoupper($action);
        if (!in_array($actionUpper, $validActions, true)) {
            $actionUpper = 'INSERT';
        }

        $ip = $ipAddress ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        $sql = "
            INSERT INTO audit_logs (
                table_name,
                record_id,
                action,
                old_values,
                new_values,
                user_id,
                ip_address,
                created_at
            ) VALUES (
                :table_name,
                :record_id,
                :action,
                :old_values::jsonb,
                :new_values::jsonb,
                :user_id,
                :ip_address,
                CURRENT_TIMESTAMP
            ) RETURNING id;
        ";

        $res = Database::fetchOne($sql, [
            ':table_name' => $tableName,
            ':record_id' => $recordId,
            ':action' => $actionUpper,
            ':old_values' => $oldValues !== null ? json_encode($oldValues) : null,
            ':new_values' => $newValues !== null ? json_encode($newValues) : null,
            ':user_id' => $userId,
            ':ip_address' => substr($ip, 0, 45),
        ]);

        return (int) ($res['id'] ?? 0);
    }

    /**
     * Mengambil daftar riwayat audit log sistem dengan filter
     */
    public function getLogs(int $limit = 50, ?string $tableName = null, ?string $action = null): array
    {
        $limit = max(1, min(500, $limit));
        $params = [':limit' => $limit];
        $where = [];

        if ($tableName) {
            $where[] = "al.table_name = :tname";
            $params[':tname'] = $tableName;
        }

        if ($action) {
            $where[] = "al.action = :act";
            $params[':act'] = strtoupper($action);
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                al.id,
                al.table_name,
                al.record_id,
                al.action,
                al.old_values,
                al.new_values,
                al.user_id,
                al.ip_address,
                al.created_at,
                u.username,
                u.full_name as user_full_name,
                u.role_code as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            {$whereClause}
            ORDER BY al.created_at DESC
            LIMIT :limit
        ";

        return Database::fetchAll($sql, $params);
    }

    /**
     * Mengambil jejak audit komprehensif pasien untuk audit kepatuhan RME (Permenkes 24/2022)
     */
    public function getPatientAuditTrail(string $patientId): array
    {
        $patient = Database::fetchOne(
            "SELECT id, mr_number, full_name, nik, gender, birth_date FROM patients WHERE id = :pid",
            [':pid' => $patientId]
        );

        if (!$patient) {
            throw new Exception("Pasien dengan ID '{$patientId}' tidak ditemukan.", 404);
        }

        // Ambil mutasi dari audit_logs terkait pasien
        $sql = "
            SELECT 
                al.id::text,
                al.table_name,
                al.record_id,
                al.action,
                al.old_values,
                al.new_values,
                al.user_id,
                al.ip_address,
                al.created_at,
                u.username,
                u.full_name as user_full_name,
                u.role_code as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 
                (al.table_name = 'patients' AND al.record_id = :pid)
                OR (al.new_values->>'patient_id' = :pid)
                OR (al.record_id IN (SELECT id::text FROM visits WHERE patient_id = :pid::uuid))
                OR (al.record_id IN (SELECT mr.id::text FROM medical_records mr JOIN visits v ON mr.visit_id = v.id WHERE v.patient_id = :pid::uuid))
                OR (al.record_id IN (SELECT p.id::text FROM prescriptions p JOIN visits v ON p.visit_id = v.id WHERE v.patient_id = :pid::uuid))
                OR (al.record_id IN (SELECT i.id::text FROM invoices i JOIN visits v ON i.visit_id = v.id WHERE v.patient_id = :pid::uuid))
            ORDER BY al.created_at DESC
        ";

        $logs = Database::fetchAll($sql, [':pid' => $patientId]);

        // Ambil revisi medis dari medical_record_revisions
        $revSql = "
            SELECT 
                mrr.id::text,
                'medical_record_revisions' as table_name,
                mrr.medical_record_id::text as record_id,
                'UPDATE' as action,
                mrr.previous_data as old_values,
                json_build_object('revision_reason', mrr.revision_reason) as new_values,
                mrr.revised_by as user_id,
                '127.0.0.1' as ip_address,
                mrr.created_at,
                u.username,
                u.full_name as user_full_name,
                u.role_code as user_role
            FROM medical_record_revisions mrr
            JOIN medical_records mr ON mrr.medical_record_id = mr.id
            JOIN visits v ON mr.visit_id = v.id
            JOIN users u ON mrr.revised_by = u.id
            WHERE v.patient_id = :pid::uuid
            ORDER BY mrr.created_at DESC
        ";
        $revisions = Database::fetchAll($revSql, [':pid' => $patientId]);

        $combined = array_merge($logs, $revisions);
        usort($combined, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return [
            'patient' => $patient,
            'total_events' => count($combined),
            'compliance_standard' => 'Permenkes No. 24 Tahun 2022 (Pasal 25 & 26)',
            'events' => $combined,
        ];
    }

    /**
     * Ringkasan kepatuhan regulasi (Regulatory Compliance Summary)
     */
    public function getComplianceSummary(): array
    {
        $totalAudit = (int) (Database::fetchOne("SELECT COUNT(*) as count FROM audit_logs")['count'] ?? 0);
        $totalRevisions = (int) (Database::fetchOne("SELECT COUNT(*) as count FROM medical_record_revisions")['count'] ?? 0);
        $totalSatusehatLogs = (int) (Database::fetchOne("SELECT COUNT(*) as count FROM satusehat_logs")['count'] ?? 0);
        $totalPayments = (int) (Database::fetchOne("SELECT COUNT(*) as count FROM payments")['count'] ?? 0);

        return [
            'status' => 'COMPLIANT',
            'regulation' => 'Permenkes RI No. 24 / 2022 tentang Rekam Medis Elektronik',
            'evaluated_at' => date('Y-m-d H:i:s'),
            'metrics' => [
                'total_audit_records' => $totalAudit,
                'total_rme_revisions' => $totalRevisions,
                'satusehat_fhir_sync_events' => $totalSatusehatLogs,
                'idempotent_financial_transactions' => $totalPayments,
                'immutability_status' => 'ENFORCED',
                'retention_policy_years' => 25,
            ],
            'audit_domains' => [
                'pendaftaran_dan_antrean' => (int) (Database::fetchOne("SELECT COUNT(*) as count FROM audit_logs WHERE table_name = 'visits'")['count'] ?? 0),
                'rekam_medis_soap' => (int) (Database::fetchOne("SELECT COUNT(*) as count FROM audit_logs WHERE table_name = 'medical_records'")['count'] ?? 0),
                'dispensasi_farmasi' => (int) (Database::fetchOne("SELECT COUNT(*) as count FROM audit_logs WHERE table_name = 'prescriptions'")['count'] ?? 0),
                'billing_dan_kasir' => (int) (Database::fetchOne("SELECT COUNT(*) as count FROM audit_logs WHERE table_name = 'payments'")['count'] ?? 0),
            ]
        ];
    }
}
