import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SplashPage } from '../pages/SplashPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { PatientListPage } from '../pages/PatientListPage';
import { QueueListPage } from '../pages/QueueListPage';
import { DoctorExaminationPage } from '../pages/DoctorExaminationPage';
import { PharmacyPage } from '../pages/PharmacyPage';
import { CashierBillingPage } from '../pages/CashierBillingPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Protected Route Guard with RBAC check
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <SplashPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  // Initial Entry / Splash
  {
    path: '/',
    element: <Navigate to="/splash" replace />,
  },
  {
    path: '/splash',
    element: <SplashPage />,
  },

  // Auth Routes (Public)
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },

  // Protected App Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          // 1. Patient & Registration
          { path: '/patients', element: <PatientListPage /> },
          { path: '/registration', element: <RegistrationPage /> },

          // 2. Queue & Antrean
          { path: '/queue', element: <QueueListPage /> },
          { path: '/doctor/queue', element: <QueueListPage /> },

          // 3. Clinical Examination (EMR)
          { path: '/doctor/examination', element: <DoctorExaminationPage /> },
          { path: '/doctor/prescriptions', element: <PharmacyPage /> },
          { path: '/doctor/lab-orders', element: <DoctorExaminationPage /> },
          { path: '/lab/orders', element: <DoctorExaminationPage /> },

          // 4. Pharmacy & Dispensing
          { path: '/pharmacy/prescriptions', element: <PharmacyPage /> },
          { path: '/pharmacy/dispensations', element: <PharmacyPage /> },
          { path: '/pharmacy/stocks', element: <PharmacyPage /> },

          // 5. Cashier & Invoicing
          { path: '/cashier/invoices', element: <CashierBillingPage /> },
          { path: '/cashier/payments', element: <CashierBillingPage /> },
          { path: '/cashier/history', element: <CashierBillingPage /> },

          // Master Data fallbacks
          { path: '/staff', element: <DashboardPage /> },
          { path: '/polyclinics', element: <RegistrationPage /> },
          { path: '/schedules', element: <RegistrationPage /> },
          { path: '/procedures', element: <DoctorExaminationPage /> },
          { path: '/medicines', element: <PharmacyPage /> },
          { path: '/users', element: <DashboardPage /> },
          { path: '/audit-logs', element: <DashboardPage /> },

          {
            path: '/forbidden',
            element: <ForbiddenPage />,
          },
        ],
      },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
