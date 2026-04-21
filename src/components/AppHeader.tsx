import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Activity, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative px-3.5 py-2 text-[13px] font-medium tracking-wide transition-colors rounded-md",
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-strong">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-brand blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
          </div>
          <div className="leading-none">
            <div className="font-display font-bold text-[17px]">
              MasterLog<span className="text-gradient-cyan">Pro</span>
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Trading Cockpit</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {user && (
            <>
              <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
              <NavLink to="/trades" className={linkCls}>Mes trades</NavLink>
              {(isStudent || isAdmin) && <NavLink to="/exercises" className={linkCls}>Exercices</NavLink>}
              {(isStudent || isAdmin) && <NavLink to="/analyse" className={linkCls}>Analyse</NavLink>}
              {!isStudent && !isAdmin && <NavLink to="/subscribe" className={linkCls}>Offres</NavLink>}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      "px-3.5 py-2 text-[13px] font-medium tracking-wide rounded-md transition-colors inline-flex items-center gap-1.5",
                      isActive
                        ? "bg-accent/15 text-accent"
                        : "text-accent/80 hover:text-accent hover:bg-accent/10"
                    )
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
                  Admin
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button size="sm" asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90 border-0 font-semibold">
                <Link to="/auth?mode=signup">Créer un compte</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-secondary text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 glass-strong animate-fade-in">
          <div className="container py-3 flex flex-col gap-1">
            {user ? (
              <>
                <NavLink to="/dashboard" className={linkCls} onClick={() => setOpen(false)}>Dashboard</NavLink>
                <NavLink to="/trades" className={linkCls} onClick={() => setOpen(false)}>Mes trades</NavLink>
                {(isStudent || isAdmin) && <NavLink to="/exercises" className={linkCls} onClick={() => setOpen(false)}>Exercices</NavLink>}
                {(isStudent || isAdmin) && <NavLink to="/analyse" className={linkCls} onClick={() => setOpen(false)}>Analyse</NavLink>}
                {!isStudent && !isAdmin && <NavLink to="/subscribe" className={linkCls} onClick={() => setOpen(false)}>Offres</NavLink>}
                {isAdmin && (
                  <NavLink to="/admin" className="px-3.5 py-2 text-[13px] font-medium text-accent" onClick={() => setOpen(false)}>
                    Admin
                  </NavLink>
                )}
                <Button variant="ghost" size="sm" onClick={signOut} className="justify-start mt-1">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="px-3.5 py-2 text-[13px]" onClick={() => setOpen(false)}>Se connecter</Link>
                <Link to="/auth?mode=signup" className="px-3.5 py-2 text-[13px] font-semibold text-gradient-cyan" onClick={() => setOpen(false)}>
                  Créer un compte →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
