import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireJournal = false,
}: { children: React.ReactNode; requireAdmin?: boolean; requireJournal?: boolean }) {
  const { user, loading, isAdmin, hasJournalAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (requireJournal && !hasJournalAccess && !isAdmin)
    return <Navigate to="/subscribe" replace />;

  return <>{children}</>;
}
