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
// SUMMARY
// -----------------------------------------------------------------------------
echo "\n=======================================================\n";
echo "VERIFICATION RESULT: {$passed} PASSED, {$failed} FAILED\n";
echo "=======================================================\n";

if ($failed > 0) {
    exit(1);
}
