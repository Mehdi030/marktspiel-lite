'use client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { GameEvent, Sector } from '@/types/game';
import { SECTOR_LABELS, SECTOR_COLORS } from '@/types/game';

interface ReportData {
  cash:            number;
  cash_delta:      number;
  net_worth?:      number;
  net_worth_delta?: number;
  buildings_count:  number;
  active_contracts: number;
  sector_rank:     number;
  total_rank:      number;
  reputation_avg:  number;
  insolvency_stage: number;
}

interface Props {
  reports: GameEvent[];
  companyName: string;
  primarySector: Sector;
}

function delta(v: number, mono = true): { text: string; color: string } {
  const text  = v >= 0 ? `+${v.toLocaleString()} €` : `${v.toLocaleString()} €`;
  const color = v > 0 ? '#10b981' : v < 0 ? '#f87171' : '#4e5470';
  void mono;
  return { text, color };
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#0a0b14', border: '1px solid #1a1d2e', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.1em', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: color ?? '#e2e8f0' }}>{value}</div>
    </div>
  );
}

function ReportCard({ event }: { event: GameEvent }) {
  const d   = event.data as unknown as ReportData;
  const nwd = d.net_worth_delta ?? d.cash_delta ?? 0;
  const nd  = delta(nwd);
  const cd  = delta(d.cash_delta ?? 0);

  return (
    <div style={{
      background: '#08090f', border: '1px solid #1a1d2e',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${nd.color}80, transparent)` }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: '#4e5470', fontFamily: 'monospace' }}>Tick {event.tick_number}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 9, color: '#282c44' }}>RANG</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace' }}>
              #{d.total_rank}
            </div>
            {d.sector_rank && (
              <div style={{ fontSize: 9, color: '#3a3f5c', fontFamily: 'monospace' }}>
                Sektor #{d.sector_rank}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Kpi label="Net Worth" value={`${(d.net_worth ?? d.cash)?.toLocaleString()} €`} />
          <Kpi label="Vermög. Δ" value={nd.text} color={nd.color} />
          <Kpi label="Kasse Δ"   value={cd.text} color={cd.color} />
          <Kpi label="Gebäude"   value={String(d.buildings_count ?? 0)} />
          <Kpi label="Verträge"  value={String(d.active_contracts ?? 0)} />
          <Kpi label="Reputation" value={String(d.reputation_avg ?? 50)} />
        </div>

        {/* Reputation bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', flexShrink: 0 }}>REP</div>
          <div style={{ flex: 1, height: 4, background: '#0c0e18', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${d.reputation_avg ?? 50}%`,
              background: `linear-gradient(90deg, #6366f1, #a78bfa)`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#4e5470', fontFamily: 'monospace', width: 24, textAlign: 'right' }}>
            {d.reputation_avg ?? 50}
          </div>
        </div>

        {d.insolvency_stage > 0 && (
          <div style={{ fontSize: 10, color: '#f87171', background: '#f8717114', padding: '4px 8px', borderRadius: 6 }}>
            ⚠ Insolvenz Stufe {d.insolvency_stage}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#3a3f5c', borderTop: '1px solid #1a1d2e', paddingTop: 8, lineHeight: 1.5 }}>
          {event.description}
        </div>
      </div>
    </div>
  );
}

function NWTooltip({ active, payload, label }: { active?: boolean; payload?: {value:number;dataKey:string}[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0c0e18', border: '1px solid #1c1f30', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: '#4e5470', marginBottom: 4 }}>Tick {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%',
            background: p.dataKey === 'nw' ? '#6366f1' : '#f59e0b' }} />
          <span style={{ color: '#9ca3af' }}>{p.dataKey === 'nw' ? 'Gesamtvermögen' : 'Cash'}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', marginLeft: 'auto' }}>
            {p.value.toLocaleString()} €
          </span>
        </div>
      ))}
    </div>
  );
}

function NetWorthChart({ reports }: { reports: GameEvent[] }) {
  const data = [...reports].reverse().map(r => {
    const d = r.data as unknown as ReportData;
    return { tick: r.tick_number, nw: d.net_worth ?? d.cash ?? 0, cash: d.cash ?? 0 };
  });
  if (data.length < 2) return null;

  const values = data.flatMap(d => [d.nw, d.cash]);
  const minV   = Math.min(...values) * 0.9;
  const maxV   = Math.max(...values) * 1.1;
  const zero   = minV < 0 ? 0 : undefined;

  return (
    <div style={{ background: '#07080d', border: '1px solid #1a1d2e', borderRadius: 14, padding: '16px 0 8px' }}>
      <div style={{ fontSize: 10, color: '#3a3f5c', letterSpacing: '0.1em', padding: '0 16px', marginBottom: 12 }}>
        NET WORTH VERLAUF
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1d2e" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: '#2d3155', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis domain={[minV, maxV]} tick={{ fill: '#2d3155', fontSize: 9 }} tickLine={false}
            axisLine={false} width={52} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<NWTooltip />} />
          {zero !== undefined && <ReferenceLine y={zero} stroke="#282c44" strokeDasharray="4 2" />}
          <Area type="monotone" dataKey="cash" stroke="#f59e0b" strokeWidth={1.5}
            fill="url(#cashGrad)" dot={false} activeDot={{ r: 3, fill: '#f59e0b' }} />
          <Area type="monotone" dataKey="nw" stroke="#6366f1" strokeWidth={2}
            fill="url(#nwGrad)" dot={false} activeDot={{ r: 3, fill: '#6366f1' }} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, padding: '8px 16px 0', justifyContent: 'flex-end' }}>
        {[{c:'#6366f1',l:'Net Worth'},{c:'#f59e0b',l:'Cash'}].map(e=>(
          <div key={e.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:2, background:e.c, borderRadius:1 }} />
            <span style={{ fontSize:9, color:'#3a3f5c' }}>{e.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPanel({ reports, companyName, primarySector }: Props) {
  const color = SECTOR_COLORS[primarySector];

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 32, color: '#1e2138', marginBottom: 8 }}>▤</div>
        <div style={{ color: '#3a3f5c', fontSize: 13 }}>Noch kein Monatsbericht</div>
        <div style={{ color: '#282c44', fontSize: 11, marginTop: 4 }}>Alle 20 Ticks (~60 Min)</div>
      </div>
    );
  }

  const latest   = reports[0].data as unknown as ReportData;
  const latestNW = delta(latest?.net_worth_delta ?? latest?.cash_delta ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${color}30`,
        boxShadow: `0 0 40px ${color}08`,
      }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        <div style={{ background: `linear-gradient(135deg, ${color}0a, transparent)`, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>{companyName}</span>
            <span style={{ fontSize: 11, color: '#3a3f5c' }}>· {SECTOR_LABELS[primarySector]}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Rang gesamt', value: `#${latest?.total_rank ?? '–'}` },
              { label: 'Vermög. Δ',   value: latestNW.text, color: latestNW.color },
              { label: 'Sektorrang',  value: `#${latest?.sector_rank ?? '–'}` },
            ].map(kpi => (
              <div key={kpi.label}>
                <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {kpi.label.toUpperCase()}
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, fontFamily: 'monospace', color: kpi.color ?? '#e2e8f0' }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NetWorthChart reports={reports} />

      <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c' }}>BERICHTE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map(r => <ReportCard key={r.id} event={r} />)}
      </div>
    </div>
  );
}
