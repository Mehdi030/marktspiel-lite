'use client';
import type { Company } from '@/types/game';

interface HistoryRow {
  company_id: string;
  tick: number;
  networth: number;
}

interface Props {
  history: HistoryRow[];
  companies: Company[];
  myCompanyId: string;
}

/** Multi-Line-Chart: Vermögens-Verlauf aller Spieler — der Wettlauf wird sichtbar */
export default function WealthChart({ history, companies, myCompanyId }: Props) {
  const players = companies.filter(c => !c.is_bot);
  const byCompany: Record<string, HistoryRow[]> = {};
  for (const row of history) {
    (byCompany[row.company_id] ??= []).push(row);
  }
  for (const rows of Object.values(byCompany)) rows.sort((a, b) => a.tick - b.tick);

  const allRows = history.filter(r => players.some(p => p.id === r.company_id));
  if (allRows.length < 4) {
    return (
      <div style={{
        padding: '28px 16px', textAlign: 'center', color: '#2d3155', fontSize: 12,
        background: 'rgba(10,12,20,0.9)', border: '1px solid #1a1d2e', borderRadius: 14,
      }}>
        📈 Noch zu wenig Daten — der Vermögens-Verlauf füllt sich alle 10 Ticks.
      </div>
    );
  }

  const W = 560, H = 220, PAD = 8;
  const minTick = Math.min(...allRows.map(r => r.tick));
  const maxTick = Math.max(...allRows.map(r => r.tick));
  const maxNW = Math.max(...allRows.map(r => Number(r.networth)), 1);
  const minNW = Math.min(...allRows.map(r => Number(r.networth)), 0);
  const spanT = Math.max(1, maxTick - minTick);
  const spanN = Math.max(1, maxNW - minNW);

  const x = (t: number) => PAD + ((t - minTick) / spanT) * (W - 2 * PAD);
  const y = (n: number) => H - PAD - ((n - minNW) / spanN) * (H - 2 * PAD);

  return (
    <div style={{
      background: 'rgba(10,12,20,0.9)', border: '1px solid #1a1d2e',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', fontWeight: 700 }}>
          📈 VERMÖGENS-WETTLAUF
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#2d3155' }}>
          Tick {minTick} – {maxTick} · max {Math.round(maxNW / 1000).toLocaleString()}k €
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Gitterlinien */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - 2 * PAD)} y2={PAD + f * (H - 2 * PAD)}
            stroke="#1a1d2e" strokeWidth="1" strokeDasharray="4 6" />
        ))}
        {players.map(p => {
          const rows = byCompany[p.id];
          if (!rows || rows.length < 2) return null;
          const isMe = p.id === myCompanyId;
          const pts = rows.map(r => `${x(r.tick).toFixed(1)},${y(Number(r.networth)).toFixed(1)}`).join(' ');
          const last = rows[rows.length - 1];
          return (
            <g key={p.id}>
              <polyline points={pts} fill="none"
                stroke={p.color} strokeWidth={isMe ? 2.6 : 1.6}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={isMe ? 1 : 0.65} />
              <circle cx={x(last.tick)} cy={y(Number(last.networth))} r={isMe ? 4 : 2.5}
                fill={p.color} opacity={isMe ? 1 : 0.8} />
            </g>
          );
        })}
      </svg>

      {/* Legende */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
        {players.map(p => {
          const rows = byCompany[p.id];
          const last = rows?.[rows.length - 1];
          return (
            <span key={p.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: p.id === myCompanyId ? '#eef0f6' : '#6b7280',
              fontWeight: p.id === myCompanyId ? 700 : 400,
            }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: p.color, display: 'inline-block' }} />
              {p.name}
              {last && <span style={{ fontFamily: 'monospace', color: '#4e5470' }}>
                {Math.round(Number(last.networth) / 1000).toLocaleString()}k</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
