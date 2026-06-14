'use client';

interface Props {
  id: string;
  color: string;
  name?: string;
  size?: number;
}

// Deterministischer Hash aus der Firmen-ID
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Wappen-Symbole — aus dem Hash gewählt
const EMBLEMS = ['★', '⚜', '◆', '▲', '⬢', '✦', '⚓', '⚙', '☗', '✶', '❖', '⬟'];

function shade(hex: string, amt: number): string {
  const safe = /^#[0-9a-fA-F]{6}/.test(hex) ? hex : '#6b7280';
  const n = parseInt(safe.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Prozedurales Firmen-Wappen — ein Schild mit Farbverlauf, gewähltem Emblem
 * und Initiale, deterministisch aus der Firmen-ID. Gibt jeder Firma ein Gesicht.
 */
export default function CompanyCrest({ id, color, name, size = 28 }: Props) {
  const h = hash(id);
  const emblem = EMBLEMS[h % EMBLEMS.length];
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const gid = `crest-${id.slice(0, 8)}`;
  const dark = shade(color, -55);
  const light = shade(color, 40);
  // Zwei Wappen-Formen abwechselnd (Hash-Bit)
  const rounded = (h >> 8) % 2 === 0;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      {/* Schildform */}
      <path
        d={rounded
          ? 'M16 2 L28 6 L28 17 Q28 27 16 31 Q4 27 4 17 L4 6 Z'
          : 'M5 3 L27 3 L27 18 L16 30 L5 18 Z'}
        fill={`url(#${gid})`}
        stroke={light}
        strokeWidth="1"
      />
      {/* Querband mit Emblem */}
      <text x="16" y="14" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.85)">{emblem}</text>
      {/* Initiale */}
      <text x="16" y="25" textAnchor="middle" fontSize="11" fontWeight="900"
        fill="#fff" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.4)' }}>{initial}</text>
    </svg>
  );
}
