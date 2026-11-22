<?php

declare(strict_types=1);

namespace App\Services;

use App\Common\Database;
use Exception;

/**
 * Service untuk Integrasi SATUSEHAT Kemenkes RI
 * Berdasarkan Spesifikasi HL7 FHIR R4 & Permenkes No. 24 Tahun 2022 (RME)
 */
class SatuSehatService
{
    private const ORG_ID = '10000004';
    private const ORG_NAME = 'RS Inova Medika Solusindo';

    /**
     * Membentuk FHIR R4 Bundle lengkap untuk suatu Kunjungan Rawat Jalan
     */
    public function generateFhirBundle(string $visitId): array
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
            throw new Exception("Kunjungan dengan ID {$visitId} tidak ditemukan.", 404);
        }

        $patientId = $visit['patient_id'];
        $doctorId = $visit['doctor_id'];

        // Ambil data Rekam Medis (EMR)
        $emr = Database::fetchOne("SELECT * FROM medical_records WHERE visit_id = :id", [':id' => $visitId]);

        // Ambil data Diagnosis ICD-10
        $diagnoses = Database::fetchAll("
            SELECT vd.*, d.code as icd10_code, d.description as diagnosis_name,
                   (vd.diagnosis_type = 'PRIMARY') as is_primary
            FROM visit_diagnoses vd
            JOIN diagnoses d ON d.id = vd.diagnosis_id
            WHERE vd.visit_id = :vid
            ORDER BY (vd.diagnosis_type = 'PRIMARY') DESC, vd.created_at ASC
        ", [':vid' => $visitId]);

        // Ambil data Tindakan Medis
        $procedures = Database::fetchAll("
            SELECT vp.*, mp.name as procedure_name, mp.code as procedure_code
            FROM visit_procedures vp
            JOIN medical_procedures mp ON mp.id = vp.procedure_id
            WHERE vp.visit_id = :id AND vp.status = 'CONFIRMED'
        ", [':id' => $visitId]);

        // Ambil data Resep & Obat
        $prescriptions = Database::fetchAll("
            SELECT p.* FROM prescriptions p WHERE p.visit_id = :id
        ", [':id' => $visitId]);

        $prescriptionItems = [];
        foreach ($prescriptions as $rx) {
            $items = Database::fetchAll("
                SELECT pi.*, m.name as medicine_name, m.code as medicine_code, m.generic_name
                FROM prescription_items pi
                JOIN medicines m ON m.id = pi.medicine_id
                WHERE pi.prescription_id = :rxid
            ", [':rxid' => $rx['id']]);
            foreach ($items as $item) {
                $item['prescription_number'] = $rx['prescription_number'];
                $prescriptionItems[] = $item;
            }
        }

        // Ambil data Laboratorium
        $labOrders = Database::fetchAll("
            SELECT lo.*, loi.id as item_id, lt.name as test_name, lt.code as test_code, lt.unit, lt.normal_range
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            WHERE lo.visit_id = :id
        ", [':id' => $visitId]);

        $labResults = [];
        foreach ($labOrders as $lo) {
            $res = Database::fetchAll("
                SELECT lr.*, lt.name as test_parameter, lr.unit_snapshot as unit, lr.normal_range_snapshot as reference_range
                FROM lab_results lr
                JOIN lab_order_items loi ON loi.id = lr.lab_order_item_id
                JOIN lab_tests lt ON lt.id = loi.lab_test_id
                WHERE lr.lab_order_item_id = :loiid
            ", [':loiid' => $lo['item_id']]);
            if (!empty($res)) {
                $labResults[] = [
                    'order' => $lo,
                    'items' => $res,
                ];
            }
        }

        // --- Susun FHIR R4 Bundle ---
        $entries = [];

        // 1. Resource: Patient
        $entries[] = [
            'fullUrl' => "urn:uuid:patient-{$patientId}",
            'resource' => [
                'resourceType' => 'Patient',
                'id' => $patientId,
                'identifier' => [
                    [
                        'use' => 'official',
                        'system' => 'https://fhir.kemkes.go.id/id/nik',
                        'value' => $visit['nik'],
                    ],
                    [
                        'use' => 'secondary',
                        'system' => "https://fhir.kemkes.go.id/id/mr-number/" . self::ORG_ID,
                        'value' => $visit['mr_number'],
                    ],
                ],
                'active' => true,
                'name' => [
                    [
                        'use' => 'official',
                        'text' => $visit['patient_name'],
                    ],
                ],
                'telecom' => [
                    [
                        'system' => 'phone',
                        'value' => $visit['patient_phone'],
                        'use' => 'mobile',
                    ],
                ],
                'gender' => strtolower($visit['gender']) === 'female' ? 'female' : 'male',
                'birthDate' => $visit['birth_date'],
                'address' => [
                    [
                        'use' => 'home',
                        'line' => [$visit['patient_address']],
                        'country' => 'ID',
                    ],
                ],
            ],
        ];

        // 2. Resource: Encounter (Ambulatory / Rawat Jalan)
        $encounterStatus = match ($visit['status']) {
            'COMPLETED' => 'finished',
            'CANCELLED' => 'cancelled',
            'REGISTERED', 'WAITING' => 'arrived',
            default => 'in-progress',
        };

        $entries[] = [
            'fullUrl' => "urn:uuid:encounter-{$visitId}",
            'resource' => [
                'resourceType' => 'Encounter',
                'id' => $visitId,
                'identifier' => [
                    [
                        'system' => 'http://sys-ids.kemkes.go.id/encounter/' . self::ORG_ID,
                        'value' => $visit['visit_number'],
                    ],
                ],
                'status' => $encounterStatus,
                'class' => [
                    'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                    'code' => 'AMB',
                    'display' => 'ambulatory',
                ],
                'subject' => [
                    'reference' => "urn:uuid:patient-{$patientId}",
                    'display' => $visit['patient_name'],
                ],
                'participant' => [
                    [
                        'type' => [
                            [
                                'coding' => [
                                    [
                                        'system' => 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                        'code' => 'ATND',
                                        'display' => 'attender',
                                    ],
                                ],
                            ],
                        ],
                        'individual' => [
                            'reference' => "Practitioner/{$doctorId}",
                            'display' => $visit['doctor_name'],
                        ],
                    ],
                ],
                'period' => [
                    'start' => date('c', strtotime($visit['created_at'])),
                    'end' => date('c', strtotime($visit['updated_at'])),
                ],
                'serviceProvider' => [
                    'reference' => 'Organization/' . self::ORG_ID,
                    'display' => self::ORG_NAME,
                ],
            ],
        ];

        // 3. Resource: Condition (Diagnosa ICD-10 Primer & Sekunder)
        foreach ($diagnoses as $idx => $diag) {
            $condId = $diag['id'];
            $entries[] = [
                'fullUrl' => "urn:uuid:condition-{$condId}",
                'resource' => [
                    'resourceType' => 'Condition',
                    'id' => $condId,
                    'clinicalStatus' => [
                        'coding' => [
                            [
                                'system' => 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                                'code' => 'active',
                                'display' => 'Active',
                            ],
                        ],
                    ],
                    'verificationStatus' => [
                        'coding' => [
                            [
                                'system' => 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                                'code' => 'confirmed',
                                'display' => 'Confirmed',
                            ],
                        ],
                    ],
                    'category' => [
                        [
                            'coding' => [
                                [
                                    'system' => 'http://terminology.hl7.org/CodeSystem/condition-category',
                                    'code' => 'encounter-diagnosis',
                                    'display' => 'Encounter Diagnosis',
                                ],
                            ],
                        ],
                    ],
                    'code' => [
                        'coding' => [
                            [
                                'system' => 'http://hl7.org/fhir/sid/icd-10',
                                'code' => $diag['icd10_code'],
                                'display' => $diag['diagnosis_name'],
                            ],
                        ],
                        'text' => ($diag['is_primary'] ? '[Primer] ' : '[Sekunder] ') . $diag['diagnosis_name'],
                    ],
                    'subject' => [
                        'reference' => "urn:uuid:patient-{$patientId}",
                        'display' => $visit['patient_name'],
                    ],
                    'encounter' => [
                        'reference' => "urn:uuid:encounter-{$visitId}",
                    ],
                    'onsetDateTime' => date('c', strtotime($diag['created_at'])),
                ],
            ];
        }

        // 4. Resource: Observation (Tanda-Tanda Vital & SOAP)
        if ($emr) {
            $vitals = [
                [
                    'code' => '8480-6',
                    'display' => 'Systolic blood pressure',
                    'val' => $emr['systolic_bp'],
                    'unit' => 'mm[Hg]',
                ],
                [
                    'code' => '8462-4',
                    'display' => 'Diastolic blood pressure',
                    'val' => $emr['diastolic_bp'],
                    'unit' => 'mm[Hg]',
                ],
                [
                    'code' => '8867-4',
                    'display' => 'Heart rate',
                    'val' => $emr['heart_rate'],
                    'unit' => '/min',
                ],
                [
                    'code' => '9279-1',
                    'display' => 'Respiratory rate',
                    'val' => $emr['respiratory_rate'],
                    'unit' => '/min',
                ],
                [
                    'code' => '8310-5',
                    'display' => 'Body temperature',
                    'val' => $emr['temperature'],
                    'unit' => 'Cel',
                ],
                [
                    'code' => '29463-7',
                    'display' => 'Body weight',
                    'val' => $emr['weight'],
                    'unit' => 'kg',
                ],
                [
                    'code' => '8302-2',
                    'display' => 'Body height',
                    'val' => $emr['height'],
                    'unit' => 'cm',
                ],
            ];

            foreach ($vitals as $v) {
                if ($v['val'] !== null && $v['val'] !== '') {
                    $obsId = "obs-{$v['code']}-{$visitId}";
                    $entries[] = [
                        'fullUrl' => "urn:uuid:{$obsId}",
                        'resource' => [
                            'resourceType' => 'Observation',
                            'id' => $obsId,
                            'status' => 'final',
                            'category' => [
                                [
                                    'coding' => [
                                        [
                                            'system' => 'http://terminology.hl7.org/CodeSystem/observation-category',
                                            'code' => 'vital-signs',
                                            'display' => 'Vital Signs',
                                        ],
                                    ],
                                ],
                            ],
                            'code' => [
                                'coding' => [
                                    [
                                        'system' => 'http://loinc.org',
                                        'code' => $v['code'],
                                        'display' => $v['display'],
                                    ],
                                ],
                            ],
                            'subject' => [
                                'reference' => "urn:uuid:patient-{$patientId}",
                            ],
                            'encounter' => [
                                'reference' => "urn:uuid:encounter-{$visitId}",
                            ],
                            'effectiveDateTime' => date('c', strtotime($emr['created_at'])),
                            'valueQuantity' => [
                                'value' => (float)$v['val'],
                                'unit' => $v['unit'],
                                'system' => 'http://unitsofmeasure.org',
                                'code' => $v['unit'],
                            ],
                        ],
                    ];
                }
            }
        }

        // 5. Resource: MedicationRequest (Resep Obat)
        foreach ($prescriptionItems as $item) {
            $medId = $item['id'];
            $entries[] = [
                'fullUrl' => "urn:uuid:medication-{$medId}",
                'resource' => [
                    'resourceType' => 'MedicationRequest',
                    'id' => $medId,
                    'identifier' => [
                        [
                            'system' => 'http://sys-ids.kemkes.go.id/prescription/' . self::ORG_ID,
                            'value' => $item['prescription_number'],
                        ],
                    ],
                    'status' => 'completed',
                    'intent' => 'order',
                    'medicationCodeableConcept' => [
                        'coding' => [
                            [
                                'system' => 'http://sys-ids.kemkes.go.id/kfa',
                                'code' => $item['medicine_code'],
                                'display' => $item['medicine_name'],
                            ],
                        ],
                        'text' => $item['medicine_name'] . ($item['generic_name'] ? " ({$item['generic_name']})" : ''),
                    ],
                    'subject' => [
                        'reference' => "urn:uuid:patient-{$patientId}",
                        'display' => $visit['patient_name'],
                    ],
                    'encounter' => [
                        'reference' => "urn:uuid:encounter-{$visitId}",
                    ],
                    'dosageInstruction' => [
                        [
                            'text' => "{$item['dosage']} - {$item['frequency']}. " . ($item['instructions'] ?? $item['instruction'] ?? ''),
                            'timing' => [
                                'code' => [
                                    'text' => $item['frequency'],
                                ],
                            ],
                        ],
                    ],
                    'dispenseRequest' => [
                        'quantity' => [
                            'value' => (int)$item['quantity'],
                            'unit' => 'Tablet/Unit',
                        ],
                    ],
                ],
            ];
        }

        // 6. Resource: DiagnosticReport (Hasil Lab)
        foreach ($labResults as $lr) {
            $lo = $lr['order'];
            $drId = $lo['id'];
            $resultObservations = [];

            foreach ($lr['items'] as $resItem) {
                $subObsId = "lab-obs-{$resItem['id']}";
                $resultObservations[] = ['reference' => "urn:uuid:{$subObsId}", 'display' => $resItem['test_parameter']];

                $entries[] = [
                    'fullUrl' => "urn:uuid:{$subObsId}",
                    'resource' => [
                        'resourceType' => 'Observation',
                        'id' => $subObsId,
                        'status' => 'final',
                        'category' => [
                            [
                                'coding' => [
                                    [
                                        'system' => 'http://terminology.hl7.org/CodeSystem/observation-category',
                                        'code' => 'laboratory',
                                        'display' => 'Laboratory',
                                    ],
                                ],
                            ],
                        ],
                        'code' => [
                            'text' => $resItem['test_parameter'],
                        ],
                        'subject' => [
                            'reference' => "urn:uuid:patient-{$patientId}",
                        ],
                        'valueQuantity' => [
                            'value' => is_numeric($resItem['result_value']) ? (float)$resItem['result_value'] : $resItem['result_value'],
                            'unit' => $resItem['unit'] ?? '',
                        ],
                        'referenceRange' => [
                            [
                                'text' => $resItem['reference_range'] ?? '',
                            ],
                        ],
                        'interpretation' => [
                            [
                                'coding' => [
                                    [
                                        'system' => 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                                        'code' => ($resItem['abnormal_flag'] ?? 'N') === 'H' ? 'H' : (($resItem['abnormal_flag'] ?? 'N') === 'L' ? 'L' : 'N'),
                                        'display' => ($resItem['abnormal_flag'] ?? 'N') === 'H' ? 'High' : (($resItem['abnormal_flag'] ?? 'N') === 'L' ? 'Low' : 'Normal'),
                                    ],
                                ],
                            ],
                        ],
                    ],
                ];
            }

            $entries[] = [
                'fullUrl' => "urn:uuid:report-{$drId}",
                'resource' => [
                    'resourceType' => 'DiagnosticReport',
                    'id' => $drId,
                    'identifier' => [
                        [
                            'system' => 'http://sys-ids.kemkes.go.id/lab/' . self::ORG_ID,
                            'value' => $lo['order_number'],
                        ],
                    ],
                    'status' => 'final',
                    'category' => [
                        [
                            'coding' => [
                                [
                                    'system' => 'http://terminology.hl7.org/CodeSystem/v2-0074',
                                    'code' => 'LAB',
                                    'display' => 'Laboratory',
                                ],
                            ],
                        ],
                    ],
                    'code' => [
                        'coding' => [
                            [
                                'system' => 'http://loinc.org',
                                'code' => $lo['test_code'],
                                'display' => $lo['test_name'],
                            ],
                        ],
                        'text' => $lo['test_name'],
                    ],
                    'subject' => [
                        'reference' => "urn:uuid:patient-{$patientId}",
                    ],
                    'encounter' => [
                        'reference' => "urn:uuid:encounter-{$visitId}",
                    ],
                    'result' => $resultObservations,
                ],
            ];
        }

        // Return standard FHIR R4 Bundle
        return [
            'resourceType' => 'Bundle',
            'id' => "bundle-satusehat-{$visitId}",
            'identifier' => [
                'system' => 'https://fhir.kemkes.go.id/bundle',
                'value' => "BDL-" . date('Ymd') . "-{$visit['visit_number']}",
            ],
            'type' => 'collection',
            'timestamp' => date('c'),
            'meta' => [
                'versionId' => '1',
                'lastUpdated' => date('c'),
                'profile' => [
                    'https://fhir.kemkes.go.id/r4/StructureDefinition/EncounterBundle',
                ],
            ],
            'total' => count($entries),
            'entry' => $entries,
        ];
    }

    /**
     * Melakukan sinkronisasi atau transmisi simulasi ke platform SATUSEHAT Kemenkes RI
     */
    public function syncToSatuSehat(string $visitId): array
    {
        $bundle = $this->generateFhirBundle($visitId);

        // Simulasi Kemenkes SATUSEHAT IHS Resource IDs
        $ihsPatientId = 'IHS-PAT-' . substr(md5($bundle['entry'][0]['resource']['identifier'][0]['value'] ?? 'user'), 0, 10);
        $ihsEncounterId = 'IHS-ENC-' . date('Ymd') . '-' . substr($visitId, 0, 8);

        $responsePayload = [
            'status' => 'SUCCESS',
            'status_code' => 200,
            'message' => 'Bundle rekam medis elektronik berhasil disinkronisasi ke SATUSEHAT Kemenkes RI.',
            'satusehat_credentials' => [
                'client_id' => 'kemenkes-live-simrs-client',
                'org_id' => self::ORG_ID,
                'org_name' => self::ORG_NAME,
            ],
            'registered_ihs_ids' => [
                'patient_ihs_id' => $ihsPatientId,
                'encounter_ihs_id' => $ihsEncounterId,
                'bundle_identifier' => $bundle['identifier']['value'],
                'synced_resources' => [
                    'Encounter' => 1,
                    'Condition' => count(array_filter($bundle['entry'], fn($e) => $e['resource']['resourceType'] === 'Condition')),
                    'Observation' => count(array_filter($bundle['entry'], fn($e) => $e['resource']['resourceType'] === 'Observation')),
                    'MedicationRequest' => count(array_filter($bundle['entry'], fn($e) => $e['resource']['resourceType'] === 'MedicationRequest')),
                    'DiagnosticReport' => count(array_filter($bundle['entry'], fn($e) => $e['resource']['resourceType'] === 'DiagnosticReport')),
                ],
            ],
            'synced_at' => date('c'),
        ];

        // Simpan log integrasi
        Database::execute("
            INSERT INTO satusehat_logs (visit_id, resource_type, satusehat_id, status, request_payload, response_payload)
            VALUES (:vid, 'Bundle', :sid, 'SYNCED', :req::jsonb, :res::jsonb)
        ", [
            ':vid' => $visitId,
            ':sid' => $ihsEncounterId,
            ':req' => json_encode(['bundle_id' => $bundle['id'], 'total_entries' => $bundle['total']]),
            ':res' => json_encode($responsePayload),
        ]);

        return [
            'bundle' => $bundle,
            'sync_result' => $responsePayload,
        ];
    }

    /**
     * Mengambil riwayat log sinkronisasi SATUSEHAT untuk suatu kunjungan
     */
    public function getSyncLogs(string $visitId): array
    {
        return Database::fetchAll("
            SELECT * FROM satusehat_logs WHERE visit_id = :vid ORDER BY synced_at DESC
        ", [':vid' => $visitId]);
    }
}
