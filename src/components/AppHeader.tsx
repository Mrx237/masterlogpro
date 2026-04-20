import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 text-sm font-medium rounded-md transition-colors",
      isActive ? "text-primary bg-secondary" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-hero text-primary-foreground">
            <LineChart className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">MasterLog<span className="text-accent">Pro</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {user && (
            <>
              <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
              <NavLink to="/trades/new" className={linkCls}>Nouveau trade</NavLink>
              <NavLink to="/subscribe" className={linkCls}>S'abonner</NavLink>
              {isAdmin && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/auth">Se connecter</Link></Button>
              <Button size="sm" asChild><Link to="/auth?mode=signup">Créer un compte</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-2 flex flex-col gap-1">
            {user ? (
              <>
                <NavLink to="/dashboard" className={linkCls} onClick={() => setOpen(false)}>Dashboard</NavLink>
                <NavLink to="/trades/new" className={linkCls} onClick={() => setOpen(false)}>Nouveau trade</NavLink>
                <NavLink to="/subscribe" className={linkCls} onClick={() => setOpen(false)}>S'abonner</NavLink>
                {isAdmin && <NavLink to="/admin" className={linkCls} onClick={() => setOpen(false)}>Admin</NavLink>}
                <Button variant="ghost" size="sm" onClick={signOut} className="justify-start"><LogOut className="h-4 w-4" /> Déconnexion</Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="px-3 py-2 text-sm" onClick={() => setOpen(false)}>Se connecter</Link>
                <Link to="/auth?mode=signup" className="px-3 py-2 text-sm font-semibold text-accent" onClick={() => setOpen(false)}>Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
