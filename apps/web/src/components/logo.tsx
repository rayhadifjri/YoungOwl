export function OwlLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="owl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M6 6l5 3h10l5-3v13a10 10 0 01-20 0z"
        fill="none"
        stroke="url(#owl-g)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="16" r="3" fill="none" stroke="url(#owl-g)" strokeWidth="2" />
      <circle cx="20" cy="16" r="3" fill="none" stroke="url(#owl-g)" strokeWidth="2" />
      <circle cx="12" cy="16" r="1" fill="#22d3ee" />
      <circle cx="20" cy="16" r="1" fill="#22d3ee" />
      <path
        d="M15 21l1 1.5 1-1.5"
        fill="none"
        stroke="url(#owl-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
