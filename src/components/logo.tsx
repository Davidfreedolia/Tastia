export function LogoIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Handle */}
      <path
        d="M8 14C8 11.7909 9.79086 10 12 10H36C38.2091 10 40 11.7909 40 14V16C40 18.2091 38.2091 20 36 20H12C9.79086 20 8 18.2091 8 16V14Z"
        fill="currentColor"
      />
      {/* Shaft */}
      <rect x="22" y="20" width="4" height="6" rx="1" fill="currentColor" />
      {/* Spiral / worm */}
      <path
        d="M24 26C24 26 20 27 20 30C20 33 24 34 24 34C24 34 28 35 28 38C28 41 24 42 24 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#top" className={`flex items-center gap-2.5 min-w-0 group ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-105">
        <LogoIcon className="h-6 w-6" />
      </span>
      <span className="serif text-2xl font-bold tracking-tight truncate">Tastia</span>
    </a>
  );
}
