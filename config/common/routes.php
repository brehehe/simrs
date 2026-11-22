<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\MasterDataController;
use App\Controllers\VisitController;
use App\Controllers\ClinicalController;
use App\Controllers\PharmacyController;
use App\Controllers\BillingController;
use App\Controllers\InternalApiController;
use App\Controllers\SatuSehatController;
use App\Controllers\BpjsController;
use App\Controllers\ReportController;
use App\Controllers\CorsController;
use App\Web;
use Yiisoft\Router\Group;
use Yiisoft\Router\Route;

return [
    Group::create()
        ->routes(
            // Web Home
            Route::get('/')
                ->action(Web\HomePage\Action::class)
                ->name('home'),

            // CORS Preflight Options for API
            Route::options('/api/v1/{path:.+}')
                ->action([CorsController::class, 'handle'])
                ->name('api.cors'),

            // 1. Authentication Endpoints
            Route::post('/api/v1/auth/login')
                ->action([AuthController::class, 'login'])
                ->name('api.auth.login'),
            Route::get('/api/v1/auth/me')
                ->action([AuthController::class, 'me'])
                ->name('api.auth.me'),
            Route::post('/api/v1/auth/logout')
                ->action([AuthController::class, 'logout'])
                ->name('api.auth.logout'),

            // 2. Master Data Endpoints
            Route::get('/api/v1/patients')
                ->action([MasterDataController::class, 'getPatients'])
                ->name('api.patients.list'),
            Route::post('/api/v1/patients')
                ->action([MasterDataController::class, 'createPatient'])
                ->name('api.patients.create'),
            Route::get('/api/v1/patients/{id}')
                ->action([MasterDataController::class, 'getPatientById'])
                ->name('api.patients.detail'),
            Route::get('/api/v1/polyclinics')
                ->action([MasterDataController::class, 'getPolyclinics'])
                ->name('api.polyclinics.list'),
            Route::get('/api/v1/medical-staff')
                ->action([MasterDataController::class, 'getMedicalStaff'])
                ->name('api.medical_staff.list'),
            Route::get('/api/v1/doctor-schedules')
                ->action([MasterDataController::class, 'getDoctorSchedules'])
                ->name('api.doctor_schedules.list'),
            Route::get('/api/v1/medical-procedures')
                ->action([MasterDataController::class, 'getProcedures'])
                ->name('api.procedures.list'),
            Route::get('/api/v1/medicines')
                ->action([MasterDataController::class, 'getMedicines'])
                ->name('api.medicines.list'),
            Route::get('/api/v1/lab-tests')
                ->action([MasterDataController::class, 'getLabTests'])
                ->name('api.lab_tests.list'),
            Route::get('/api/v1/diagnoses')
                ->action([MasterDataController::class, 'getDiagnoses'])
                ->name('api.diagnoses.list'),

            // 3. Visits & Queue Management Endpoints
            Route::post('/api/v1/visits')
                ->action([VisitController::class, 'create'])
                ->name('api.visits.create'),
            Route::get('/api/v1/visits')
                ->action([VisitController::class, 'list'])
                ->name('api.visits.list'),
            Route::get('/api/v1/visits/{id}')
                ->action([VisitController::class, 'detail'])
                ->name('api.visits.detail'),
            Route::patch('/api/v1/visits/{id}/status')
                ->action([VisitController::class, 'updateStatus'])
                ->name('api.visits.update_status'),
            Route::get('/api/v1/queues/today')
                ->action([VisitController::class, 'todayQueues'])
                ->name('api.queues.today'),

            // 4. Clinical & EMR Endpoints
            Route::post('/api/v1/medical-records')
                ->action([ClinicalController::class, 'saveMedicalRecord'])
                ->name('api.emr.save'),
            Route::get('/api/v1/medical-records/visit/{visitId}')
                ->action([ClinicalController::class, 'getMedicalRecordByVisit'])
                ->name('api.emr.detail'),
            Route::get('/api/v1/patients/{patientId}/history')
                ->action([ClinicalController::class, 'getPatientHistory'])
                ->name('api.patients.history'),
            Route::post('/api/v1/visits/{id}/procedures')
                ->action([ClinicalController::class, 'addProcedure'])
                ->name('api.visits.procedures.add'),
            Route::get('/api/v1/visits/{id}/procedures')
                ->action([ClinicalController::class, 'getProcedures'])
                ->name('api.visits.procedures.list'),
            Route::post('/api/v1/prescriptions')
                ->action([ClinicalController::class, 'createPrescription'])
                ->name('api.prescriptions.create'),
            Route::get('/api/v1/visits/{id}/prescriptions')
                ->action([ClinicalController::class, 'getPrescriptions'])
                ->name('api.visits.prescriptions.list'),
            Route::post('/api/v1/lab-orders')
                ->action([ClinicalController::class, 'createLabOrder'])
                ->name('api.lab_orders.create'),
            Route::get('/api/v1/visits/{id}/lab-orders')
                ->action([ClinicalController::class, 'getLabOrders'])
                ->name('api.visits.lab_orders.list'),

            // 5. Pharmacy Endpoints
            Route::get('/api/v1/prescriptions')
                ->action([PharmacyController::class, 'list'])
                ->name('api.prescriptions.list'),
            Route::post('/api/v1/prescriptions/{id}/dispense')
                ->action([PharmacyController::class, 'dispense'])
                ->name('api.prescriptions.dispense'),
            Route::get('/api/v1/medicines/{id}/stock-movements')
                ->action([PharmacyController::class, 'getStockMovements'])
                ->name('api.medicines.stock_movements'),

            // 6. Billing & Payment Endpoints
            Route::get('/api/v1/invoices/visit/{visitId}')
                ->action([BillingController::class, 'getInvoiceByVisit'])
                ->name('api.invoices.detail_by_visit'),
            Route::post('/api/v1/invoices/{id}/payments')
                ->action([BillingController::class, 'processPayment'])
                ->name('api.invoices.payments'),
            Route::get('/api/v1/payments/{id}/receipt')
                ->action([BillingController::class, 'getReceipt'])
                ->name('api.payments.receipt'),

            // 7. Internal Gateway Endpoints (Node.js <-> Yii Core)
            Route::post('/internal-api/v1/lab-results')
                ->action([InternalApiController::class, 'receiveLabResults'])
                ->name('api.internal.lab_results'),

            // 8. SATUSEHAT (FHIR R4) & Resume Medis Endpoints (Kemenkes RI Permenkes 24/2022)
            Route::get('/api/v1/visits/{id}/fhir-bundle')
                ->action([SatuSehatController::class, 'getFhirBundle'])
                ->name('api.satusehat.fhir_bundle'),
            Route::post('/api/v1/visits/{id}/satusehat-sync')
                ->action([SatuSehatController::class, 'sync'])
                ->name('api.satusehat.sync'),
            Route::get('/api/v1/visits/{id}/satusehat-logs')
                ->action([SatuSehatController::class, 'getLogs'])
                ->name('api.satusehat.logs'),
            Route::get('/api/v1/visits/{id}/resume-medis')
                ->action([SatuSehatController::class, 'getResumeMedis'])
                ->name('api.visits.resume_medis'),

            // 9. BPJS VClaim 2.0 Web Service Endpoints
            Route::get('/api/v1/bpjs/peserta/{identifier}')
                ->action([BpjsController::class, 'checkPeserta'])
                ->name('api.bpjs.peserta'),
            Route::post('/api/v1/bpjs/sep')
                ->action([BpjsController::class, 'generateSep'])
                ->name('api.bpjs.sep'),

            // 10. Clinical & Financial Reporting Endpoints (Kemenkes RL 5.3 & Rekonsiliasi)
            Route::get('/api/v1/reports/top-diagnoses')
                ->action([ReportController::class, 'getTopDiagnoses'])
                ->name('api.reports.top_diagnoses'),
            Route::get('/api/v1/reports/financial-reconciliation')
                ->action([ReportController::class, 'getFinancialReconciliation'])
                ->name('api.reports.financial_reconciliation'),
            Route::get('/api/v1/reports/visit-summary')
                ->action([ReportController::class, 'getVisitSummary'])
                ->name('api.reports.visit_summary'),
            Route::get('/api/v1/reports/medicine-usage')
                ->action([ReportController::class, 'getMedicineUsage'])
                ->name('api.reports.medicine_usage'),
        ),
];
