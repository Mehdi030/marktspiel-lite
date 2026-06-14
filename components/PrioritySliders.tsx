'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Company, ProductionPriority } from '@/types/game';

const DEFAULT: ProductionPriority = { cost: 33, quality: 34, growth: 33 };

function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

const SLIDERS: { key: keyof ProductionPriority; label: string; desc: string; color: string }[] = [
  { key: 'cost',    label: 'Kostenoptimierung', desc: 'Reduziert Inputkosten, senkt Effizienz leicht',        color: '#f59e0b' },
  { key: 'quality', label: 'Qualität / Output',  desc: 'Maximiert Produktionsmenge und Qualität',             color: '#6366f1' },
  { key: 'growth',  label: 'Wachstum',           desc: 'Beschleunigt Bau, erhöht Expansionsrendite',          color: '#84cc16' },
];

export default function PrioritySliders({ company }: { company: Company }) {
  const [priority, setPriority] = useState<ProductionPriority>(company.production_priority ?? DEFAULT);
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);

  function adjust(key: keyof ProductionPriority, value: number) {
    const delta  = value - priority[key];
    const others = (['cost','quality','growth'] as (keyof ProductionPriority)[]).filter(k => k !== key);
    const newVals = { ...priority, [key]: clamp(value) };
    const sumOthers = others.reduce((s, k) => s + priority[k], 0);
    for (const k of others) {
      const share = sumOthers > 0 ? priority[k] / sumOthers : 0.5;
      newVals[k] = clamp(priority[k] - delta * share);
    }
    const total = newVals.cost + newVals.quality + newVals.growth;
    if (total !== 100) newVals[others[1]] = clamp(newVals[others[1]] + 100 - total);
    setSaved(false);
    setPriority(newVals);
  }

  async function save() {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getSupabase() as any).from('companies').update({ production_priority: priority }).eq('id', company.id);
    setSaving(false); setSaved(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, color: '#4e5470', lineHeight: 1.5 }}>
        Steuert wie deine Betriebe automatisch optimiert werden. Summe = 100%.
      </div>

      {SLIDERS.map(({ key, label, desc, color }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{label}</span>
              <span style={{ color: '#3a3f5c', fontSize: 10, marginLeft: 8 }}>{desc}</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color }}>{priority[key]}%</span>
          </div>
          <div style={{ position: 'relative', height: 8 }}>
            {/* Track bg */}
            <div style={{ position: 'absolute', inset: 0, background: '#0c0e18', borderRadius: 4 }} />
            {/* Fill */}
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${priority[key]}%`, background: color, borderRadius: 4,
              transition: 'width 0.15s', boxShadow: `0 0 6px ${color}60`,
            }} />
            {/* Range input (invisible, on top) */}
            <input type="range" min={0} max={100} value={priority[key]}
              onChange={e => adjust(key, +e.target.value)}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', margin: 0,
              }}
            />
          </div>
        </div>
      ))}

      {/* Stacked bar */}
      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {SLIDERS.map(({ key, color }) => (
          <div key={key} style={{ height: '100%', width: `${priority[key]}%`, background: color, transition: 'width 0.15s' }} />
        ))}
      </div>

      <button onClick={save} disabled={saving} style={{
        width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
        fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
        background: saved ? 'rgba(16,185,129,0.12)' : saving ? '#1c1f30' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        color: saved ? '#10b981' : saving ? '#3a3f5c' : '#fff',
        outline: saved ? '1px solid rgba(16,185,129,0.3)' : 'none',
        boxShadow: saved || saving ? 'none' : '0 0 20px rgba(99,102,241,0.3)',
        transition: 'all 0.2s',
      } as React.CSSProperties}>
        {saving ? 'Speichert…' : saved ? '✓ Gespeichert' : 'Prioritäten speichern'}
      </button>
    </div>
  );
}
