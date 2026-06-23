import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
function ensureRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 768;
}

type SceneFn = (ctx: { scope: HTMLElement; reduced: boolean; desktop: boolean }) => void;

export function useGsapScene<T extends HTMLElement = HTMLElement>(
  setup: SceneFn,
  deps: unknown[] = [],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    ensureRegistered();
    const scope = ref.current;
    if (!scope) return;

    const reduced = prefersReducedMotion();
    const desktop = isDesktopViewport();

    const ctx = gsap.context(() => {
      setup({ scope, reduced, desktop });
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export { gsap, ScrollTrigger };
