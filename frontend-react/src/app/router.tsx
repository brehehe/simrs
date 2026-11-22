import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SplashPage } from '../pages/SplashPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
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
          // Route stubs that render DashboardPage for now until respective modules are implemented
          { path: '/patients', element: <DashboardPage /> },
          { path: '/registration', element: <DashboardPage /> },
          { path: '/queue', element: <DashboardPage /> },
          { path: '/doctor/queue', element: <DashboardPage /> },
          { path: '/doctor/examination', element: <DashboardPage /> },
          { path: '/pharmacy/prescriptions', element: <DashboardPage /> },
          { path: '/lab/orders', element: <DashboardPage /> },
          { path: '/cashier/invoices', element: <DashboardPage /> },
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
