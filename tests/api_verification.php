<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Controllers\AuthController;
use App\Controllers\MasterDataController;
use App\Controllers\VisitController;
use HttpSoft\Message\ServerRequest;
use Yiisoft\Router\CurrentRoute;

echo "=== STARTING SIMRS CORE API & CONCURRENCY VERIFICATION ===\n\n";

$authController = new AuthController();
$masterController = new MasterDataController();
$visitController = new VisitController();

$passed = 0;
$failed = 0;

function assertTest(string $description, bool $condition): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$description}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$description}\n";
        $failed++;
    }
}

// -----------------------------------------------------------------------------
// TEST 1: Login Valid Credentials
// -----------------------------------------------------------------------------
echo "Test 1: Login dr.budi (Role: DOCTOR)\n";
$req1 = (new ServerRequest(method: 'POST', uri: '/api/v1/auth/login'))
    ->withParsedBody(['username' => 'dr.budi', 'password' => 'Password123!']);

$res1 = $authController->login($req1);
$data1 = json_decode((string) $res1->getBody(), true);

assertTest("Status code 200 OK", $res1->getStatusCode() === 200);
assertTest("Response success true", $data1['success'] === true);
assertTest("JWT Token returned", !empty($data1['data']['token']));
assertTest("Role is DOCTOR", $data1['data']['user']['role'] === 'DOCTOR');
$jwtToken = $data1['data']['token'] ?? '';

// -----------------------------------------------------------------------------
// TEST 2: Login Invalid Credentials
// -----------------------------------------------------------------------------
echo "\nTest 2: Login with Invalid Password\n";
$req2 = (new ServerRequest(method: 'POST', uri: '/api/v1/auth/login'))
    ->withParsedBody(['username' => 'dr.budi', 'password' => 'WrongPassword!']);

$res2 = $authController->login($req2);
$data2 = json_decode((string) $res2->getBody(), true);

assertTest("Status code 401 Unauthorized", $res2->getStatusCode() === 401);
assertTest("Response success false", $data2['success'] === false);

// -----------------------------------------------------------------------------
// TEST 3: Auth Profile (GET /api/v1/auth/me)
// -----------------------------------------------------------------------------
echo "\nTest 3: Profile Verification with Bearer Token\n";
$req3 = (new ServerRequest(method: 'GET', uri: '/api/v1/auth/me'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken);

$res3 = $authController->me($req3);
$data3 = json_decode((string) $res3->getBody(), true);

assertTest("Status code 200 OK", $res3->getStatusCode() === 200);
assertTest("Profile matches dr.budi", $data3['data']['username'] === 'dr.budi');

// -----------------------------------------------------------------------------
// TEST 4: Master Data Polyclinics
// -----------------------------------------------------------------------------
echo "\nTest 4: Master Polyclinics List\n";
$res4 = $masterController->getPolyclinics();
$data4 = json_decode((string) $res4->getBody(), true);

assertTest("Status code 200 OK", $res4->getStatusCode() === 200);
assertTest("Contains 6 polyclinics", count($data4['data']) === 6);
$polyInt = null;
foreach ($data4['data'] as $p) {
    if ($p['code'] === 'POLI-INT') $polyInt = $p;
}
assertTest("POLI-INT prefix is A", $polyInt !== null && $polyInt['queue_prefix'] === 'A');

// -----------------------------------------------------------------------------
// TEST 5: Create New Patient (Validation & Auto MR)
// -----------------------------------------------------------------------------
echo "\nTest 5: Register New Patient\n";
$testNik = '32730' . time();
$req5 = (new ServerRequest(method: 'POST', uri: '/api/v1/patients'))
    ->withParsedBody([
        'nik' => $testNik,
        'full_name' => 'Pasien Uji Coba Cepat',
        'birth_date' => '1995-10-20',
        'gender' => 'MALE',
        'address' => 'Jl. Pengujian No. 1, Bandung',
        'phone' => '081299887766',
    ]);

$res5 = $masterController->createPatient($req5);
$data5 = json_decode((string) $res5->getBody(), true);

assertTest("Status code 201 Created", $res5->getStatusCode() === 201);
assertTest("Auto MR Number generated", str_starts_with($data5['data']['mr_number'], 'RM-'));
$newPatientId = $data5['data']['id'] ?? '';

// -----------------------------------------------------------------------------
// TEST 6: Reject Duplicate Patient NIK
// -----------------------------------------------------------------------------
echo "\nTest 6: Reject Duplicate Patient NIK\n";
$req6 = (new ServerRequest(method: 'POST', uri: '/api/v1/patients'))
    ->withParsedBody([
        'nik' => $testNik,
        'full_name' => 'Pasien Duplikat NIK',
        'birth_date' => '1995-10-20',
        'gender' => 'MALE',
    ]);

$res6 = $masterController->createPatient($req6);
$data6 = json_decode((string) $res6->getBody(), true);

assertTest("Status code 409 Conflict", $res6->getStatusCode() === 409);
assertTest("Success is false", $data6['success'] === false);

// -----------------------------------------------------------------------------
// TEST 7: Atomic Registration & Queue Counter Allocation
// -----------------------------------------------------------------------------
echo "\nTest 7: Patient Registration & Queue Generation\n";
$doctorList = json_decode((string) $masterController->getMedicalStaff((new ServerRequest())->withQueryParams(['polyclinic_id' => $polyInt['id']]))->getBody(), true)['data'];
$doctor = $doctorList[0];

$todayDate = date('Y-m-d');
$req7 = (new ServerRequest(method: 'POST', uri: '/api/v1/visits'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'patient_id' => $newPatientId,
        'polyclinic_id' => $polyInt['id'],
        'doctor_id' => $doctor['id'],
        'visit_date' => $todayDate,
    ]);

$res7 = $visitController->create($req7);
$data7 = json_decode((string) $res7->getBody(), true);

assertTest("Status code 201 Created", $res7->getStatusCode() === 201);
assertTest("Queue display starts with A", str_starts_with($data7['data']['queue_display'], 'A'));
assertTest("Status is WAITING", $data7['data']['status'] === 'WAITING');
$createdVisitId = $data7['data']['id'] ?? '';

// -----------------------------------------------------------------------------
// TEST 8: CRITICAL CASE 1 - Reject Duplicate Active Visit on Same Day
// -----------------------------------------------------------------------------
echo "\nTest 8: CRITICAL CASE 1 - Duplicate Visit Rejection (HTTP 409)\n";
$req8 = (new ServerRequest(method: 'POST', uri: '/api/v1/visits'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'patient_id' => $newPatientId,
        'polyclinic_id' => $polyInt['id'],
        'doctor_id' => $doctor['id'],
        'visit_date' => $todayDate,
    ]);

$res8 = $visitController->create($req8);
$data8 = json_decode((string) $res8->getBody(), true);

assertTest("Status code 409 Conflict", $res8->getStatusCode() === 409);
assertTest("Code is DUPLICATE_ACTIVE_VISIT", $data8['code'] === 'DUPLICATE_ACTIVE_VISIT');

// -----------------------------------------------------------------------------
// TEST 9: Update Visit Status Transition
// -----------------------------------------------------------------------------
echo "\nTest 9: Visit State Transition to IN_EXAMINATION\n";
$req9 = (new ServerRequest(method: 'PATCH', uri: "/api/v1/visits/{$createdVisitId}/status"))
    ->withAttribute('id', $createdVisitId)
    ->withParsedBody(['status' => 'IN_EXAMINATION']);

$res9 = $visitController->updateStatus($req9, null);
$data9 = json_decode((string) $res9->getBody(), true);

assertTest("Status code 200 OK", $res9->getStatusCode() === 200);
assertTest("Visit status updated to IN_EXAMINATION", $data9['data']['status'] === 'IN_EXAMINATION');

// -----------------------------------------------------------------------------
// TEST 10: Clinical EMR (SOAP, Vital Signs, ICD-10 Diagnoses)
// -----------------------------------------------------------------------------
echo "\nTest 10: Input EMR SOAP & ICD-10 Diagnoses\n";
$clinicalController = new \App\Controllers\ClinicalController();

$diagList = json_decode((string) $masterController->getDiagnoses(new ServerRequest())->getBody(), true)['data'];
$diag1 = $diagList[0]; // I10
$diag2 = $diagList[1]; // E11.9

$req10 = (new ServerRequest(method: 'POST', uri: '/api/v1/medical-records'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'visit_id' => $createdVisitId,
        'chief_complaint' => 'Sakit kepala berdenyut dan leher terasa kaku sejak 2 hari',
        'anamnesis' => 'Pasien memiliki riwayat tekanan darah tinggi tidak terkontrol.',
        'systolic_bp' => 150,
        'diastolic_bp' => 95,
        'heart_rate' => 84,
        'respiratory_rate' => 18,
        'temperature' => 36.8,
        'weight' => 70.5,
        'height' => 165.0,
        'physical_examination' => 'Mata: pupil isokor. Thorax: cor/pulmo dalam batas normal.',
        'doctor_notes' => 'Hipertensi stage 2, anjurkan kurangi garam dan istirahat.',
        'diagnoses' => [
            ['diagnosis_id' => $diag1['id'], 'type' => 'PRIMARY', 'notes' => 'Hipertensi primer primer'],
            ['diagnosis_id' => $diag2['id'], 'type' => 'SECONDARY', 'notes' => 'Pemeriksaan lanjutan gula darah'],
        ],
    ]);

$res10 = $clinicalController->saveMedicalRecord($req10);
$data10 = json_decode((string) $res10->getBody(), true);

assertTest("Status code 201 Created", $res10->getStatusCode() === 201);
assertTest("EMR record status is FINALIZED", $data10['data']['status'] === 'FINALIZED');

// -----------------------------------------------------------------------------
// TEST 11: Procedure with Snapshot Price
// -----------------------------------------------------------------------------
echo "\nTest 11: Add Medical Procedure with Snapshot Price\n";
$procList = json_decode((string) $masterController->getProcedures()->getBody(), true)['data'];
$procEkg = $procList[1]; // EKG

$req11 = (new ServerRequest(method: 'POST', uri: "/api/v1/visits/{$createdVisitId}/procedures"))
    ->withAttribute('id', $createdVisitId)
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'procedure_id' => $procEkg['id'],
        'quantity' => 1,
    ]);

$res11 = $clinicalController->addProcedure($req11);
$data11 = json_decode((string) $res11->getBody(), true);

assertTest("Status code 201 Created", $res11->getStatusCode() === 201);
assertTest("Snapshot price matches base price", (float) $data11['data']['snapshot_price'] === (float) $procEkg['base_price']);

// -----------------------------------------------------------------------------
// TEST 12: Prescription Ordering
// -----------------------------------------------------------------------------
echo "\nTest 12: Doctor Creates Prescription\n";
$medList = json_decode((string) $masterController->getMedicines()->getBody(), true)['data'];
$medAmlodipine = $medList[4]; // Amlodipine 10mg

$req12 = (new ServerRequest(method: 'POST', uri: '/api/v1/prescriptions'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'visit_id' => $createdVisitId,
        'notes' => 'Diminum 1x sehari malam hari sesudah makan',
        'items' => [
            [
                'medicine_id' => $medAmlodipine['id'],
                'dosage' => '10 mg',
                'frequency' => '1x1 Sehari malam',
                'quantity' => 30,
                'instructions' => 'Rutin setiap malam',
            ],
        ],
    ]);

$res12 = $clinicalController->createPrescription($req12);
$data12 = json_decode((string) $res12->getBody(), true);

assertTest("Status code 201 Created", $res12->getStatusCode() === 201);
assertTest("Prescription number generated", str_starts_with($data12['data']['prescription_number'], 'RX-'));
assertTest("Item count is 1", count($data12['data']['items']) === 1);

// -----------------------------------------------------------------------------
// TEST 13: Lab Order Creation
// -----------------------------------------------------------------------------
echo "\nTest 13: Doctor Creates Lab Order\n";
$labList = json_decode((string) $masterController->getLabTests()->getBody(), true)['data'];
$testGds = $labList[1]; // GDS

$req13 = (new ServerRequest(method: 'POST', uri: '/api/v1/lab-orders'))
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'visit_id' => $createdVisitId,
        'clinical_notes' => 'Skrining glukosa darah sewaktu',
        'test_ids' => [$testGds['id']],
    ]);

$res13 = $clinicalController->createLabOrder($req13);
$data13 = json_decode((string) $res13->getBody(), true);

assertTest("Status code 201 Created", $res13->getStatusCode() === 201);
assertTest("Lab Order status is ORDERED", $data13['data']['status'] === 'ORDERED');

// -----------------------------------------------------------------------------
// TEST 14: CRITICAL CASE 2 - Pharmacy Dispense with Row-Level Lock & Stock Deduct
// -----------------------------------------------------------------------------
echo "\nTest 14: CRITICAL CASE 2 - Pharmacy Dispensation & Atomic Stock Deduction\n";
$pharmacyController = new \App\Controllers\PharmacyController();
$createdRxId = $data12['data']['id'];

// Get stock before dispense
$stockBefore = (int) \App\Common\Database::fetchOne(
    "SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id",
    [':id' => $medAmlodipine['id']]
)['current_stock'];

$req14 = (new ServerRequest(method: 'POST', uri: "/api/v1/prescriptions/{$createdRxId}/dispense"))
    ->withAttribute('id', $createdRxId)
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody(['notes' => 'Edukasi obat telah diberikan']);

$res14 = $pharmacyController->dispense($req14);
$data14 = json_decode((string) $res14->getBody(), true);

assertTest("Status code 200 OK", $res14->getStatusCode() === 200);
assertTest("Prescription status is DISPENSED", $data14['data']['status'] === 'DISPENSED');

// Check stock reduced by 30
$stockAfter = (int) \App\Common\Database::fetchOne(
    "SELECT current_stock FROM medicine_stocks WHERE medicine_id = :id",
    [':id' => $medAmlodipine['id']]
)['current_stock'];
assertTest("Stock accurately reduced by 30", $stockAfter === ($stockBefore - 30));

// -----------------------------------------------------------------------------
// TEST 15: Invoice Generation & Consolidation
// -----------------------------------------------------------------------------
echo "\nTest 15: Billing Consolidation & Invoice Snapshot\n";
$billingController = new \App\Controllers\BillingController();

$req15 = (new ServerRequest(method: 'GET', uri: "/api/v1/invoices/visit/{$createdVisitId}"))
    ->withAttribute('visitId', $createdVisitId)
    ->withHeader('Authorization', 'Bearer ' . $jwtToken);

$res15 = $billingController->getInvoiceByVisit($req15);
$data15 = json_decode((string) $res15->getBody(), true);

assertTest("Status code 200 OK", $res15->getStatusCode() === 200);
assertTest("Invoice status is UNPAID", $data15['data']['status'] === 'UNPAID');
assertTest("Total amount is positive", (float)$data15['data']['total_amount'] > 0);
assertTest("Outstanding balance equals total amount", (float)$data15['data']['outstanding_balance'] === (float)$data15['data']['total_amount']);
$createdInvoiceId = $data15['data']['id'];
$totalBill = (float) $data15['data']['total_amount'];

// -----------------------------------------------------------------------------
// TEST 16: CRITICAL CASE 3 - Cashier Payment with Idempotency Key
// -----------------------------------------------------------------------------
echo "\nTest 16: CRITICAL CASE 3 - Cashier Payment (Partial)\n";
$idempotencyKey = 'idemp-test-' . time() . '-' . rand(100, 999);
$partialAmount = 100000.00;

$req16 = (new ServerRequest(method: 'POST', uri: "/api/v1/invoices/{$createdInvoiceId}/payments"))
    ->withAttribute('id', $createdInvoiceId)
    ->withHeader('X-Idempotency-Key', $idempotencyKey)
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'amount' => $partialAmount,
        'payment_method' => 'CASH',
        'reference_no' => 'CASH-001',
    ]);

$res16 = $billingController->processPayment($req16);
$data16 = json_decode((string) $res16->getBody(), true);

assertTest("Status code 201 Created", $res16->getStatusCode() === 201);
assertTest("Invoice status is PARTIALLY_PAID", $data16['data']['invoice_status'] === 'PARTIALLY_PAID');
assertTest("Outstanding balance reduced by 100k", (float)$data16['data']['outstanding_balance'] === ($totalBill - $partialAmount));

// -----------------------------------------------------------------------------
// TEST 17: CRITICAL CASE 3 - Idempotent Replay on Duplicate Submit
// -----------------------------------------------------------------------------
echo "\nTest 17: CRITICAL CASE 3 - Idempotent Replay on Double Submit\n";
// Send exact same request with SAME idempotency key
$res17 = $billingController->processPayment($req16);
$data17 = json_decode((string) $res17->getBody(), true);

assertTest("Status code 200 OK (Idempotent Hit)", $res17->getStatusCode() === 200);
assertTest("is_idempotent_replay is true", $data17['data']['is_idempotent_replay'] === true);
assertTest("Balance remains unchanged (no double charge)", (float)$data17['data']['outstanding_balance'] === ($totalBill - $partialAmount));

// -----------------------------------------------------------------------------
// TEST 18: Final Settlement & Completion
// -----------------------------------------------------------------------------
echo "\nTest 18: Final Settlement (Paid in Full)\n";
$remainingAmount = $totalBill - $partialAmount;
$finalKey = 'idemp-final-' . time() . '-' . rand(100, 999);

$req18 = (new ServerRequest(method: 'POST', uri: "/api/v1/invoices/{$createdInvoiceId}/payments"))
    ->withAttribute('id', $createdInvoiceId)
    ->withHeader('X-Idempotency-Key', $finalKey)
    ->withHeader('Authorization', 'Bearer ' . $jwtToken)
    ->withParsedBody([
        'amount' => $remainingAmount,
        'payment_method' => 'QRIS',
        'reference_no' => 'QRIS-9988',
    ]);

$res18 = $billingController->processPayment($req18);
$data18 = json_decode((string) $res18->getBody(), true);

assertTest("Status code 201 Created", $res18->getStatusCode() === 201);
assertTest("Invoice status is PAID", $data18['data']['invoice_status'] === 'PAID');
assertTest("Outstanding balance is 0", (float)$data18['data']['outstanding_balance'] === 0.0);

// Verify visit status is COMPLETED
$visitCheck = \App\Common\Database::fetchOne("SELECT status FROM visits WHERE id = :id", [':id' => $createdVisitId]);
assertTest("Visit status is COMPLETED", $visitCheck['status'] === 'COMPLETED');

// -----------------------------------------------------------------------------
// TEST 19: CRITICAL CASE 5 - Internal Lab Ingestion Security (X-Internal-Secret)
// -----------------------------------------------------------------------------
echo "\nTest 19: Internal Lab Security (Unauthorized Secret Rejection)\n";
$internalController = new \App\Controllers\InternalApiController();
$createdLabOrderId = $data13['data']['id'];

$req19 = (new ServerRequest(method: 'POST', uri: "/internal-api/v1/lab-results"))
    ->withHeader('X-Internal-Secret', 'wrong-secret-token')
    ->withParsedBody([
        'lab_order_id' => $createdLabOrderId,
        'results' => [],
    ]);

$res19 = $internalController->receiveLabResults($req19);
assertTest("Status code 401 Unauthorized", $res19->getStatusCode() === 401);

// -----------------------------------------------------------------------------
// TEST 20: CRITICAL CASE 5 - Ingest Lab Analyzer Results & Order Completion
// -----------------------------------------------------------------------------
echo "\nTest 20: CRITICAL CASE 5 - Ingest Lab Analyzer Results & Idempotency\n";
$labOrderItem = \App\Common\Database::fetchOne(
    "SELECT id FROM lab_order_items WHERE lab_order_id = :id",
    [':id' => $createdLabOrderId]
);

$req20 = (new ServerRequest(method: 'POST', uri: "/internal-api/v1/lab-results"))
    ->withHeader('X-Internal-Secret', 'simrs-service-secret-inova-2026')
    ->withHeader('X-Idempotency-Key', 'idemp-lab-res-' . time())
    ->withParsedBody([
        'lab_order_id' => $createdLabOrderId,
        'results' => [
            [
                'lab_order_item_id' => $labOrderItem['id'],
                'result_value' => '115',
                'unit' => 'mg/dL',
                'normal_range' => '70 - 140',
                'status' => 'FINAL',
                'notes' => 'Glukosa darah sewaktu normal.',
            ],
        ],
    ]);

$res20 = $internalController->receiveLabResults($req20);
$data20 = json_decode((string) $res20->getBody(), true);

assertTest("Status code 200 OK", $res20->getStatusCode() === 200);
assertTest("Lab Order completed", $data20['data']['status'] === 'COMPLETED');

$labOrderDb = \App\Common\Database::fetchOne("SELECT status FROM lab_orders WHERE id = :id", [':id' => $createdLabOrderId]);
assertTest("Lab Order status in DB is COMPLETED", $labOrderDb['status'] === 'COMPLETED');

$labResultDb = \App\Common\Database::fetchOne("SELECT result_value, status FROM lab_results WHERE lab_order_id = :id", [':id' => $createdLabOrderId]);
assertTest("Lab Result value stored accurately (115)", $labResultDb['result_value'] === '115');

// Idempotent re-submission
$res20Replay = $internalController->receiveLabResults($req20);
assertTest("Idempotent replay returns 200 OK", $res20Replay->getStatusCode() === 200);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
echo "\n=======================================================\n";
echo "VERIFICATION RESULT: {$passed} PASSED, {$failed} FAILED\n";
echo "=======================================================\n";

if ($failed > 0) {
    exit(1);
}
