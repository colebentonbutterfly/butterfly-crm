/**
 * Deb's Attic locket logo — a rose-gold locket containing an attic scene
 * with candle, rose, and antique key.
 *
 * Three variants:
 *   "icon"   – locket only, no text (sidebar icon, mobile header)
 *   "header" – locket + "Deb's Attic" beside it (sidebar title)
 *   "full"   – large locket + stacked typography (login splash)
 */
export default function Logo({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "header" | "full";
  className?: string;
}) {
  if (variant === "full") return <FullLogo className={className} />;
  if (variant === "header") return <HeaderLogo className={className} />;
  return <IconLogo className={className} />;
}

/* ─── Compact locket icon ─── */
function IconLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Deb's Attic"
      role="img"
    >
      <defs>
        <linearGradient id="li-rg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a878" />
          <stop offset="100%" stopColor="#b8865c" />
        </linearGradient>
        <clipPath id="li-clip">
          <ellipse cx="24" cy="30" rx="18" ry="22" />
        </clipPath>
      </defs>
      {/* Chain bail */}
      <path d="M22,4 Q24,1 26,4" fill="none" stroke="#d4a878" strokeWidth="1" opacity="0.5" />
      <circle cx="24" cy="2" r="1.5" fill="#d4a878" opacity="0.5" />
      {/* Hinge */}
      <rect x="21" y="5" width="6" height="3" rx="1.5" fill="#d4a878" opacity="0.62" />
      {/* Frame */}
      <ellipse cx="24" cy="30" rx="20" ry="24" fill="url(#li-rg)" opacity="0.52" />
      <ellipse cx="24" cy="30" rx="18" ry="22" fill="#fdf8f2" />
      <ellipse cx="24" cy="30" rx="16" ry="20" fill="none" stroke="#d4a878" strokeWidth="0.5" opacity="0.38" />
      {/* Interior */}
      <g clipPath="url(#li-clip)">
        <rect x="6" y="8" width="36" height="44" fill="#fdf4ec" />
        {/* Gable */}
        <polygon points="6,24 24,10 42,24" fill="#ecdcc8" opacity="0.52" />
        {/* Window */}
        <polygon points="19,21 24,14 29,21 28,25 20,25" fill="#fff8e0" opacity="0.88" />
        {/* Candle */}
        <rect x="22.5" y="36" width="3" height="8" rx="1" fill="#f5eedd" />
        <ellipse cx="24" cy="34" rx="1.5" ry="3" fill="#ffe050" />
        <ellipse cx="24" cy="35" rx="0.8" ry="1.5" fill="#ff9020" opacity="0.8" />
        {/* Rose hint */}
        <circle cx="15" cy="38" r="3" fill="#d4a0b4" opacity="0.55" />
        <circle cx="15" cy="37" r="2" fill="#c07888" opacity="0.6" />
        {/* Key hint */}
        <circle cx="33" cy="38" r="2.5" fill="none" stroke="#d4a878" strokeWidth="1.2" />
        <rect x="32" y="40" width="1.8" height="6" rx="0.9" fill="#d4a878" />
      </g>
    </svg>
  );
}

/* ─── Header: icon + text side-by-side ─── */
function HeaderLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconLogo className="w-10 h-12 shrink-0" />
      <div>
        <span className="font-bold text-xl leading-tight block" style={{ fontFamily: "Georgia, 'Palatino Linotype', serif" }}>
          Deb&apos;s Attic
        </span>
        <span className="text-xs opacity-60 italic block" style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", letterSpacing: "0.5px" }}>
          Estate Inventory
        </span>
      </div>
    </div>
  );
}

/* ─── Full splash logo (login page) ─── */
function FullLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Use the detailed SVG file for the full logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-full.svg"
        alt="Deb's Attic — Estate & Personal Property Inventory"
        className="w-full max-w-xs"
        width={320}
        height={326}
      />
    </div>
  );
}

export { IconLogo, HeaderLogo, FullLogo };
