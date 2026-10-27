export default function Logo({ size = 30, text = true }: { size?: number; text?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="orbis-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="12" fill="none" stroke="url(#orbis-logo-g)" strokeWidth="4" />
        <ellipse
          cx="24"
          cy="24"
          rx="21"
          ry="7.5"
          transform="rotate(-28 24 24)"
          fill="none"
          stroke="url(#orbis-logo-g)"
          strokeWidth="2.4"
          opacity="0.8"
        />
        <circle cx="38" cy="13" r="3.6" fill="#fbbf24" />
      </svg>
      {text && (
        <span className="text-xl font-extrabold tracking-tight">
          <span className="grad-text">Orbis</span> Bet
        </span>
      )}
    </span>
  );
}
