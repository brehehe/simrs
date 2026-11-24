<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

/**
 * Service untuk Pembentukan Ringkasan Pulang Rawat Jalan (Resume Medis Rawat Jalan)
 * Standar Akreditasi Rumah Sakit (KARS/STARKES) dan Permenkes RI
 */
class MedicalResumeService
{
    public function getMedicalResume(string $visitId): array
    {
        $visit = Database::fetchOne("
            SELECT v.*, p.name as polyclinic_name, p.code as polyclinic_code,
                   pat.mr_number, pat.nik, pat.full_name as patient_name, pat.birth_date,
                   pat.gender, pat.address as patient_address, pat.phone as patient_phone,
                   doc.full_name as doctor_name, doc.sip_number
            FROM visits v
            JOIN polyclinics p ON p.id = v.polyclinic_id
            JOIN patients pat ON pat.id = v.patient_id
            JOIN medical_staff doc ON doc.id = v.doctor_id
            WHERE v.id = :id
        ", [':id' => $visitId]);

        if (!$visit) {
            throw new Exception("Kunjungan ID {$visitId} tidak ditemukan.", 404);
        }

        // Hitung umur pasien
        $birthDate = new \DateTime($visit['birth_date']);
        $now = new \DateTime($visit['visit_date']);
        $ageYears = $birthDate->diff($now)->y;

        // Ambil Rekam Medis (EMR)
        $emr = Database::fetchOne("SELECT * FROM medical_records WHERE visit_id = :id", [':id' => $visitId]) ?: [];

        // Ambil Diagnosa ICD-10
        $diagnoses = Database::fetchAll("
            SELECT vd.*, d.code as icd10_code, d.description as diagnosis_name,
                   (vd.diagnosis_type = 'PRIMARY') as is_primary
            FROM visit_diagnoses vd
            JOIN diagnoses d ON d.id = vd.diagnosis_id
            WHERE vd.visit_id = :vid
            ORDER BY (vd.diagnosis_type = 'PRIMARY') DESC, vd.created_at ASC
        ", [':vid' => $visitId]);

        // Ambil Tindakan Medis
        $procedures = Database::fetchAll("
            SELECT vp.*, mp.name as procedure_name, mp.code as procedure_code
            FROM visit_procedures vp
            JOIN medical_procedures mp ON mp.id = vp.procedure_id
            WHERE vp.visit_id = :id AND vp.status = 'CONFIRMED'
            ORDER BY vp.created_at ASC
        ", [':id' => $visitId]);

        // Ambil Resep & Terapi Obat
        $prescriptions = Database::fetchAll("
            SELECT p.* FROM prescriptions p WHERE p.visit_id = :id
        ", [':id' => $visitId]);

        $medicines = [];
        foreach ($prescriptions as $rx) {
            $items = Database::fetchAll("
                SELECT pi.*, m.name as medicine_name, m.generic_name, m.unit
                FROM prescription_items pi
                JOIN medicines m ON m.id = pi.medicine_id
                WHERE pi.prescription_id = :rxid
            ", [':rxid' => $rx['id']]);
            foreach ($items as $item) {
                $medicines[] = $item;
            }
        }

        // Ambil Hasil Laboratorium
        $labOrders = Database::fetchAll("
            SELECT lo.*, loi.id as item_id, lt.name as test_name, lt.code as test_code, lt.unit, lt.normal_range
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            WHERE lo.visit_id = :id
        ", [':id' => $visitId]);

        $labResults = [];
        foreach ($labOrders as $lo) {
            $items = Database::fetchAll("
                SELECT lr.*, lt.name as test_parameter, lr.unit_snapshot as unit, lr.normal_range_snapshot as reference_range
                FROM lab_results lr
                JOIN lab_order_items loi ON loi.id = lr.lab_order_item_id
                JOIN lab_tests lt ON lt.id = loi.lab_test_id
                WHERE lr.lab_order_item_id = :loiid
                ORDER BY lr.created_at ASC
            ", [':loiid' => $lo['item_id']]);

            $labResults[] = [
                'order_number' => $lo['order_number'],
                'test_name' => $lo['test_name'],
                'status' => $lo['status'],
                'results' => $items,
            ];
        }

        // Hitung BMI jika tinggi dan berat tersedia
        $bmi = null;
        $bmiCategory = null;
        if (!empty($emr['height']) && !empty($emr['weight']) && (float)$emr['height'] > 0) {
            $heightM = (float)$emr['height'] / 100;
            $bmi = round((float)$emr['weight'] / ($heightM * $heightM), 1);
            $bmiCategory = match (true) {
                $bmi < 18.5 => 'Kurang (Underweight)',
                $bmi <= 22.9 => 'Normal',
                $bmi <= 29.9 => 'Kelebihan (Overweight)',
                default => 'Obesitas',
            };
        }

        return [
            'hospital' => [
                'name' => 'RS INOVA MEDIKA SOLUSINDO',
                'address' => 'Jl. Kesehatan No. 45, Jakarta Selatan 12430',
                'phone' => '(021) 789-0123 / Fax: (021) 789-0124',
                'license' => 'KEMENKES RI NO: 440/123/RS-B/2023',
                'accreditation' => 'Paripurna (KARS Bintang Lima)',
            ],
            'document_title' => 'RINGKASAN PULANG RAWAT JALAN (RESUME MEDIS)',
            'document_number' => "RES-{$visit['visit_number']}",
            'created_at' => date('Y-m-d H:i:s'),
            'patient' => [
                'mr_number' => $visit['mr_number'],
                'nik' => $visit['nik'],
                'full_name' => $visit['patient_name'],
                'birth_date' => $visit['birth_date'],
                'age_years' => $ageYears,
                'gender' => $visit['gender'] === 'FEMALE' ? 'Perempuan' : 'Laki-laki',
                'address' => $visit['patient_address'],
                'phone' => $visit['patient_phone'],
            ],
            'visit' => [
                'visit_number' => $visit['visit_number'],
                'visit_date' => $visit['visit_date'],
                'polyclinic' => $visit['polyclinic_name'],
                'doctor_dpjp' => $visit['doctor_name'],
                'sip_number' => $visit['sip_number'],
                'status' => $visit['status'],
            ],
            'clinical_findings' => [
                'chief_complaint' => !empty($emr['chief_complaint']) ? $emr['chief_complaint'] : '-',
                'anamnesis' => !empty($emr['anamnesis']) ? $emr['anamnesis'] : '-',
                'physical_examination' => !empty($emr['physical_examination']) ? $emr['physical_examination'] : '-',
                'vital_signs' => [
                    'blood_pressure' => (!empty($emr['systolic_bp']) && !empty($emr['diastolic_bp'])) ? "{$emr['systolic_bp']}/{$emr['diastolic_bp']} mmHg" : '-',
                    'heart_rate' => !empty($emr['heart_rate']) ? "{$emr['heart_rate']} x/menit" : '-',
                    'respiratory_rate' => !empty($emr['respiratory_rate']) ? "{$emr['respiratory_rate']} x/menit" : '-',
                    'temperature' => !empty($emr['temperature']) ? "{$emr['temperature']} °C" : '-',
                    'weight' => !empty($emr['weight']) ? "{$emr['weight']} kg" : '-',
                    'height' => !empty($emr['height']) ? "{$emr['height']} cm" : '-',
                    'bmi' => $bmi ? "{$bmi} ({$bmiCategory})" : '-',
                ],
                'doctor_notes' => !empty($emr['doctor_notes']) ? $emr['doctor_notes'] : '-',
            ],
            'diagnoses' => array_map(fn($d) => [
                'code' => $d['icd10_code'],
                'name' => $d['diagnosis_name'],
                'type' => $d['is_primary'] ? 'DIAGNOSIS UTAMA' : 'DIAGNOSIS SEKUNDER',
            ], $diagnoses),
            'procedures' => array_map(fn($p) => [
                'code' => $p['procedure_code'],
                'name' => $p['procedure_name'],
                'quantity' => $p['quantity'],
            ], $procedures),
            'prescriptions' => array_map(fn($m) => [
                'name' => $m['medicine_name'],
                'generic_name' => $m['generic_name'],
                'quantity' => $m['quantity'],
                'unit' => $m['unit'],
                'dosage' => $m['dosage'],
                'frequency' => $m['frequency'],
                'instruction' => $m['instructions'] ?? $m['instruction'] ?? '',
            ], $medicines),
            'lab_results' => $labResults,
            'discharge_plan' => [
                'condition' => 'Membaik / Boleh Pulang',
                'follow_up_date' => date('Y-m-d', strtotime($visit['visit_date'] . ' + 7 days')),
                'education' => 'Minum obat sesuai anjuran secara teratur. Istirahat cukup, hindari makanan berlemak tinggi/garam berlebih. Segera kembali jika timbul gejala darurat.',
            ],
            'digital_signature' => [
                'doctor_name' => $visit['doctor_name'],
                'sip_number' => $visit['sip_number'],
                'signed_at' => date('Y-m-d H:i:s'),
                'verification_hash' => hash('sha256', "RESUME-{$visit['id']}-{$visit['doctor_name']}"),
                'verified_by' => 'Sistem Rekam Medis Elektronik Terintegrasi (Permenkes 24/2022)',
            ],
        ];
    }
}
