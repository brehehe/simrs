<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\MasterDataController;
use App\Controllers\VisitController;
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
        ),
];
