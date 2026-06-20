import { useEffect, useState } from "react";

/**
 * Cuenta atrás COSMÉTICA del quiz (§5.3). Recibe un `deadline` absoluto (timestamp ms) y
 * muestra los segundos enteros restantes (`ceil((deadline − now) / 1000)`, mín. 0),
 * refrescando con un intervalo local de 1s. Se detiene al llegar a 0 (no baja de 0).
 *
 * NO es la autoridad del cierre: solo pinta el restante con el reloj LOCAL del cliente.
 * El cierre real `quiz→reveal` lo dispara el host por temporizador (reusa `advance()`,
 * reparte §5.5) — un desfase de reloj entre dispositivos solo afecta este número visible.
 */
function secondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function Countdown({ deadline, className }: { deadline: number; className?: string }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadline, Date.now()));

  useEffect(() => {
    // Recalcula de inmediato al (re)montar o cambiar `deadline`, luego cada segundo.
    setRemaining(secondsLeft(deadline, Date.now()));
    const id = setInterval(() => {
      const left = secondsLeft(deadline, Date.now());
      setRemaining(left);
      if (left <= 0) clearInterval(id); // se detiene al llegar a 0.
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span
      className={className}
      role="timer"
      aria-live="off"
      aria-label={`${remaining} segundos restantes`}
    >
      {remaining}s
    </span>
  );
}
