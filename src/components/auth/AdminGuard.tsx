import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import { AdminShellSkeleton } from '../../pages/admin/components/AdminSkeletons';

type AdminGuardProps = {
    children: ReactNode;
    allowedRoles?: UserRole[];
    fallbackPath?: string;
    allowGuest?: boolean;
};

export default function AdminGuard({
    children,
    allowedRoles = ['admin'],
    fallbackPath = '/',
    allowGuest = false,
}: AdminGuardProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <AdminShellSkeleton />;
    }

    if (!user && allowGuest) {
        return <>{children}</>;
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to={fallbackPath} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
