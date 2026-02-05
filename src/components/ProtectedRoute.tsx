import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { guestModeEnabled, loading: adminLoading } = useAdmin();

  const loading = authLoading || adminLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // If guest mode is enabled, allow access without login
  if (guestModeEnabled) {
    return <>{children}</>;
  }

  // Otherwise, require authentication
  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
}
