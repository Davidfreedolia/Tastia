import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getSupabase } from "./supabase";

/**
 * Gate de cliente para zonas de equipo (p. ej. `/admin`): si no hay sesión de
 * Supabase, redirige a `/login`. (La landing es pública desde que se retiró el
 * gate "en construcción"; `/` ya no es la puerta de acceso.) La comprobación es
 * solo en cliente (useEffect) para evitar rebotes en cargas SSR/hard-load.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setOk(true); // sin Supabase configurado (dev) no bloqueamos
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setOk(true);
      else navigate({ to: "/login" });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ok) return null;
  return <>{children}</>;
}
