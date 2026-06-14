'use client';

interface Props {
  size?: number;
  showText?: boolean;
  textSize?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Variant: 'default' (Premium, mit Krone), 'minimal' (nur Säulen) */
  variant?: 'default' | 'minimal';
}

/**
 * MarktFlow — Premium-Logo
 * Konzept: Aufstrebende Wirtschafts-Säulen, die in eine Krone münden.
 * Symbolisiert die V2-Mechanik: Aufbau → Marktdominanz → Hegemon.
 */
export default function Logo({
  size = 40, showText = false, textSize, className, style, variant = 'default',
}: Props) {
  const r = Math.round(size * 0.225);
  const ts = textSize ?? Math.round(size * 0.42);
  const id = `lf${size}${variant}`;
  const isMinimal = variant === 'minimal';

  const Icon = (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block', borderRadius: r, overflow: 'hidden' }}>
      <defs>
        {/* Tiefer Royal-Gradient: Marineblau → Indigo → Purple → Gold */}
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0c1230" />
          <stop offset="35%"  stopColor="#2e1b6b" />
          <stop offset="70%"  stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        {/* Glass-Highlight oben */}
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Säulen-Gradient: Weiß → Gold-Tint */}
        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        {/* Krone-Gold-Gradient */}
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="50%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        {/* Subtiles Glow */}
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="60%"  stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        {/* Boden-Reflexion */}
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background mit gerundeten Ecken (clip-path via SVG) */}
      <rect width="64" height="64" rx={Math.round(size * 0.225 * 64 / size)} fill={`url(#${id}-bg)`} />

      {/* Subtiles Gold-Glow im Hintergrund */}
      <rect width="64" height="64" fill={`url(#${id}-glow)`} />

      {/* 4 aufsteigende Säulen mit Gold-Tint */}
      <rect x="10" y="40" width="9"  height="14" rx="2" fill={`url(#${id}-bar)`} opacity="0.55" />
      <rect x="22" y="32" width="9"  height="22" rx="2" fill={`url(#${id}-bar)`} opacity="0.75" />
      <rect x="34" y="22" width="9"  height="32" rx="2" fill={`url(#${id}-bar)`} opacity="0.9"  />
      <rect x="46" y="14" width="9"  height="40" rx="2" fill={`url(#${id}-bar)`} />

      {/* Krone-Zacken auf der höchsten Säule (rechts oben) */}
      {!isMinimal && (
        <g transform="translate(46, 8)">
          {/* 3 Zacken */}
          <path
            d="M0 8 L0 4 L2 2 L2.5 5 L4.5 1 L5 5 L7 2 L9 4 L9 8 Z"
            fill={`url(#${id}-gold)`}
            stroke="#92400e" strokeWidth="0.3" strokeLinejoin="round"
          />
          {/* Mini-Diamant in der Mitte */}
          <circle cx="4.5" cy="5.5" r="0.9" fill="#fef3c7" />
        </g>
      )}

      {/* Trendlinie durch die Säulen-Spitzen */}
      <polyline
        points="14.5,40 26.5,32 38.5,22 50.5,14"
        stroke="#fbbf24"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />

      {/* Glass-Highlight oben (über allem) */}
      <rect width="64" height="32" fill={`url(#${id}-glass)`} pointerEvents="none" />

      {/* Boden-Reflexion unten */}
      <rect x="0" y="54" width="64" height="6" fill={`url(#${id}-floor)`} pointerEvents="none" />

      {/* Innere Border für Premium-Feel */}
      <rect
        x="0.5" y="0.5" width="63" height="63"
        rx={Math.round(size * 0.215 * 64 / size)}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        pointerEvents="none"
      />
    </svg>
  );

  if (!showText) return <div className={className} style={style}>{Icon}</div>;

  return (
    <div className={className}
      style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.30), ...style }}>
      {Icon}
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontWeight: 900, fontSize: ts, letterSpacing: '-0.018em', lineHeight: 1,
          background: 'linear-gradient(125deg, #ffffff 0%, #e0e7ff 40%, #fef3c7 75%, #fbbf24 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          textShadow: '0 1px 0 rgba(0,0,0,0.2)',
        }}>
          Marktspiel
        </div>
        <div style={{
          fontSize: Math.max(7, Math.round(ts * 0.40)),
          color: '#6b7280', letterSpacing: '0.24em',
          fontWeight: 700, marginTop: 4, textTransform: 'uppercase',
        }}>
          Wirtschafts-Simulation
        </div>
      </div>
    </div>
  );
}
