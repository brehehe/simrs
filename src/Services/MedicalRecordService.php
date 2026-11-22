<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

class MedicalRecordService
{
    /**
     * Menyimpan data Rekam Medis Elektronik (SOAP) dan diagnosis ICD-10
     */
    public function saveMedicalRecord(array $data, string $doctorId): array
    {
        if (empty($data['visit_id']) || empty($data['chief_complaint']) || empty($data['anamnesis'])) {
            throw new Exception("ID Kunjungan, Keluhan Utama, dan Anamnesis wajib diisi.", 422);
        }

        $visit = Database::fetchOne(
            "SELECT id, patient_id, status FROM visits WHERE id = :id",
            [':id' => $data['visit_id']]
        );

        if (!$visit) {
            throw new Exception("Kunjungan pasien tidak ditemukan.", 404);
        }

        Database::beginTransaction();

        try {
            // Check if medical record already exists for this visit (Update or Insert)
            $existing = Database::fetchOne(
                "SELECT id FROM medical_records WHERE visit_id = :vid",
                [':vid' => $data['visit_id']]
            );

            if ($existing) {
                // Catat riwayat revisi sebelum update
                $oldData = Database::fetchOne("SELECT * FROM medical_records WHERE id = :id", [':id' => $existing['id']]);
                Database::execute("
                    INSERT INTO medical_record_revisions (medical_record_id, revised_by, revision_reason, previous_data)
                    VALUES (:mrid, :uid, :reason, :prev::jsonb)
                ", [
                    ':mrid' => $existing['id'],
                    ':uid' => $doctorId,
                    ':reason' => $data['revision_reason'] ?? 'Pembaruan data klinis berkala',
                    ':prev' => json_encode($oldData),
                ]);

                // Update
                $sql = "
                    UPDATE medical_records SET
                        chief_complaint = :cc,
                        anamnesis = :anamnesis,
                        systolic_bp = :sys,
                        diastolic_bp = :dia,
                        heart_rate = :hr,
                        respiratory_rate = :rr,
                        temperature = :temp,
                        weight = :weight,
                        height = :height,
                        physical_examination = :pe,
                        doctor_notes = :notes,
                        status = 'FINALIZED',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                    RETURNING *;
                ";
                $record = Database::fetchOne($sql, [
                    ':id' => $existing['id'],
                    ':cc' => $data['chief_complaint'],
                    ':anamnesis' => $data['anamnesis'],
                    ':sys' => $data['systolic_bp'] ?? null,
                    ':dia' => $data['diastolic_bp'] ?? null,
                    ':hr' => $data['heart_rate'] ?? null,
                    ':rr' => $data['respiratory_rate'] ?? null,
                    ':temp' => $data['temperature'] ?? null,
                    ':weight' => $data['weight'] ?? null,
                    ':height' => $data['height'] ?? null,
                    ':pe' => $data['physical_examination'] ?? null,
                    ':notes' => $data['doctor_notes'] ?? null,
                ]);
            } else {
                // Insert baru
                $sql = "
                    INSERT INTO medical_records (
                        visit_id, patient_id, doctor_id, chief_complaint, anamnesis,
                        systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature,
                        weight, height, physical_examination, doctor_notes, status
                    ) VALUES (
                        :vid, :pid, :did, :cc, :anamnesis,
                        :sys, :dia, :hr, :rr, :temp,
                        :weight, :height, :pe, :notes, 'FINALIZED'
                    )
                    RETURNING *;
                ";
                $record = Database::fetchOne($sql, [
                    ':vid' => $data['visit_id'],
                    ':pid' => $visit['patient_id'],
                    ':did' => $doctorId,
                    ':cc' => $data['chief_complaint'],
                    ':anamnesis' => $data['anamnesis'],
                    ':sys' => $data['systolic_bp'] ?? null,
                    ':dia' => $data['diastolic_bp'] ?? null,
                    ':hr' => $data['heart_rate'] ?? null,
                    ':rr' => $data['respiratory_rate'] ?? null,
                    ':temp' => $data['temperature'] ?? null,
                    ':weight' => $data['weight'] ?? null,
                    ':height' => $data['height'] ?? null,
                    ':pe' => $data['physical_examination'] ?? null,
                    ':notes' => $data['doctor_notes'] ?? null,
                ]);
            }

            // Simpan Diagnosis ICD-10 jika ada
            if (!empty($data['diagnoses']) && is_array($data['diagnoses'])) {
                Database::execute("DELETE FROM visit_diagnoses WHERE visit_id = :vid", [':vid' => $data['visit_id']]);
                foreach ($data['diagnoses'] as $diag) {
                    Database::execute("
                        INSERT INTO visit_diagnoses (visit_id, diagnosis_id, diagnosis_type, notes)
                        VALUES (:vid, :did, :type, :notes)
                    ", [
                        ':vid' => $data['visit_id'],
                        ':did' => $diag['diagnosis_id'],
                        ':type' => $diag['type'] ?? 'PRIMARY',
                        ':notes' => $diag['notes'] ?? null,
                    ]);
                }
            }

            // Update status kunjungan ke IN_EXAMINATION bila masih WAITING
            Database::execute("
                UPDATE visits SET status = 'IN_EXAMINATION', updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND status = 'WAITING'
            ", [':id' => $data['visit_id']]);

            Database::commit();

            return $record;
        } catch (Exception $e) {
            Database::rollBack();
            throw $e;
        }
    }

    public function getMedicalRecordByVisitId(string $visitId): ?array
    {
        $record = Database::fetchOne("
            SELECT mr.*, doc.full_name AS doctor_name, doc.sip_number
            FROM medical_records mr
            JOIN medical_staff doc ON doc.id = mr.doctor_id
            WHERE mr.visit_id = :vid
        ", [':vid' => $visitId]);

        if (!$record) return null;

        $diagnoses = Database::fetchAll("
            SELECT vd.id, vd.diagnosis_type, vd.notes, d.code AS icd10_code, d.description
            FROM visit_diagnoses vd
            JOIN diagnoses d ON d.id = vd.diagnosis_id
            WHERE vd.visit_id = :vid
            ORDER BY vd.diagnosis_type ASC
        ", [':vid' => $visitId]);

        $revisions = Database::fetchAll("
            SELECT r.id, r.revision_reason, r.created_at, u.full_name AS revised_by_name
            FROM medical_record_revisions r
            JOIN users u ON u.id = r.revised_by
            WHERE r.medical_record_id = :mrid
            ORDER BY r.created_at DESC
        ", [':mrid' => $record['id']]);

        $record['diagnoses'] = $diagnoses;
        $record['revisions'] = $revisions;

        return $record;
    }

    public function getPatientMedicalHistory(string $patientId): array
    {
        return Database::fetchAll("
            SELECT mr.id, mr.chief_complaint, mr.anamnesis, mr.status, mr.created_at,
                   v.visit_number, v.visit_date, poly.name AS polyclinic_name, doc.full_name AS doctor_name
            FROM medical_records mr
            JOIN visits v ON v.id = mr.visit_id
            JOIN polyclinics poly ON poly.id = v.polyclinic_id
            JOIN medical_staff doc ON doc.id = mr.doctor_id
            WHERE mr.patient_id = :pid
            ORDER BY v.visit_date DESC
        ", [':pid' => $patientId]);
    }
}
