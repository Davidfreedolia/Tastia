import { createFileRoute, redirect } from "@tanstack/react-router";

// La raíz va directa a la landing pública: la web ya no está tras el gate "en construcción".
// El acceso del equipo sigue disponible en /login (para entrar a /admin, que sí queda protegido).
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/landing" });
  },
});
