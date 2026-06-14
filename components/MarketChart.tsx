'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import type { PriceHistory, Sector } from '@/types/game';
import { SECTOR_COLORS, SECTOR_LABELS } from '@/types/game';

interface Props {
  sector: Sector;
  history: PriceHistory[];
  basePrice: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0c0e18', border: '1px solid #1c1f30', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: '#4e5470' }}>Tick {label}</div>
      <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 800 }}>{payload[0].value.toFixed(2)} €</div>
    </div>
  );
}

export default function MarketChart({ sector, history, basePrice }: Props) {
  const color = SECTOR_COLORS[sector];

  const data = history.map(h => ({
    tick: h.tick_number,
    price: Math.round(h.price * 100) / 100,
    supply: Math.round(h.supply),
    demand: Math.round(h.demand),
  }));

  if (data.length < 2) {
    return (
      <div style={{ height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#282c44', fontSize: 13 }}>
        Noch zu wenig Daten
      </div>
    );
  }

  const prices = data.map(d => d.price);
  const min = Math.min(...prices, basePrice) * 0.9;
  const max = Math.max(...prices, basePrice) * 1.1;

  return (
    <div>
      <div style={{ fontSize: 10, color: '#4e5470', marginBottom: 4, letterSpacing: '0.04em' }}>
        {SECTOR_LABELS[sector].toUpperCase()} — PREISVERLAUF
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: '#4b5563', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[min, max]}
            tick={{ fill: '#4b5563', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={v => v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={basePrice} stroke="#374151" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
