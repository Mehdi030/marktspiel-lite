'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Company, Building, Inventory, Sector } from '@/types/game';
import type { WarehouseStrategy } from '@/types/game';
import { SECTOR_LABELS, SECTOR_COLORS, SECTORS } from '@/types/game';

interface Props {
  myCompany: Company;
  buildings: Building[];
  inventory: Inventory[];
  onRefresh: () => void;
}

export default function LagerPanel({ myCompany, buildings, inventory, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStrategy = ((myCompany as any).warehouse_strategy ?? 'normal') as WarehouseStrategy;

  const myBuildings  = buildings.filter(b => b.company_id === myCompany.id && b.construction_ticks_remaining === 0);
  const storageBldgs = myBuildings.filter(b => b.type === 'storage');
  const capacity     = 10000 + storageBldgs.reduce((s, b) => s + 3000 * (b.level ?? 1), 0);

  const invMap: Partial<Record<Sector, number>> = {};
  for (const i of inventory) {
    if (i.company_id === myCompany.id) invMap[i.sector as Sector] = i.quantity;
  }
  const totalStock = Object.values(invMap).reduce((a, b) => a + (b ?? 0), 0);
  const fillPct    = Math.min(100, Math.round((totalStock / capacity) * 100));

  const WAREHOUSE_STRATEGIES: Record<WarehouseStrategy, { label: string; desc: string; minStockPct: number; color: string }> = {
    manual:       { label: 'Manuell',   desc: 'Nur per Aktion verkaufen',        minStockPct: 0, color: '#6b7280' },
    conservative: { label: 'Konservativ', desc: 'Erst ab 80% Lagerstand verkaufen', minStockPct: 80, color: '#f59e0b' },
    normal:       { label: 'Ausbalanciert', desc: 'Ab 50% Lagerstand verkaufen',    minStockPct: 50, color: '#6366f1' },
    aggressive:   { label: 'Aggressiv', desc: 'Sofort alles verkaufen',           minStockPct: 0, color: '#10b981' },
  };
  const strategy = WAREHOUSE_STRATEGIES[currentStrategy];

  async function setStrategy(s: WarehouseStrategy) {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabase() as any;
    await sb.from('companies').update({ warehouse_strategy: s }).eq('id', myCompany.id);
    setSaving(false);
    onRefresh();
  }

  const fillColor = fillPct > 90 ? '#f87171' : fillPct > 60 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Lager-Anzeige */}
      <div style={{
        background: '#07080d', border: '1px solid #1c1f30', borderRadius: 14, padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#eef0f6' }}>
            Gesamtlager
          </div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: fillColor, fontWeight: 700 }}>
            {totalStock.toLocaleString()} / {capacity.toLocaleString()} Einh.
          </div>
        </div>

        {/* Füllstandsbalken */}
        <div style={{ height: 8, background: '#0c0e18', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', width: `${fillPct}%`, borderRadius: 4,
            background: `linear-gradient(90deg, ${fillColor}88, ${fillColor})`,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Strategie-Hinweislinie */}
        {currentStrategy !== 'manual' && strategy.minStockPct > 0 && (
          <div style={{ fontSize: 10, color: '#4e5470' }}>
            Verkauft ab{' '}
            <span style={{ color: strategy.color, fontWeight: 700 }}>
              {strategy.minStockPct}% Lagerstand
            </span>
            {' '}— aktuell{' '}
            <span style={{ color: fillPct >= strategy.minStockPct ? '#10b981' : '#f87171', fontWeight: 700 }}>
              {fillPct >= strategy.minStockPct ? 'Verkauf aktiv' : 'Kein Verkauf'}
            </span>
          </div>
        )}

        {/* Bestand nach Sektor */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {SECTORS.filter(s => (invMap[s] ?? 0) > 0).map(s => {
            const qty = invMap[s] ?? 0;
            const pct = Math.min(100, (qty / capacity) * 100);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[s], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#4e5470', width: 80, flexShrink: 0 }}>
                  {SECTOR_LABELS[s]}
                </span>
                <div style={{ flex: 1, height: 3, background: '#0c0e18', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: SECTOR_COLORS[s], borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', width: 60, textAlign: 'right' }}>
                  {qty.toLocaleString()}
                </span>
              </div>
            );
          })}
          {Object.values(invMap).every(v => !v) && (
            <div style={{ fontSize: 11, color: '#282c44', textAlign: 'center', padding: '8px 0' }}>
              Lager leer — warte auf Produktion
            </div>
          )}
        </div>
      </div>

      {/* Strategie-Wähler */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 8, fontWeight: 700 }}>
          VERKAUFSSTRATEGIE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(Object.entries(WAREHOUSE_STRATEGIES) as [WarehouseStrategy, typeof WAREHOUSE_STRATEGIES[WarehouseStrategy]][]).map(([key, s]) => {
            const active = currentStrategy === key;
            return (
              <button key={key} onClick={() => !saving && setStrategy(key)}
                style={{
                  padding: '10px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  background: active ? `${s.color}12` : '#07080d',
                  border: `1px solid ${active ? s.color + '50' : '#1c1f30'}`,
                  boxShadow: active ? `0 0 14px ${s.color}20` : 'none',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  position: 'relative', overflow: 'hidden',
                }}>
                {active && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#eef0f6' : '#4e5470', marginBottom: 3 }}>
                  {s.label}
                  {active && (
                    <span style={{ marginLeft: 6, fontSize: 9, color: s.color, fontWeight: 800 }}>●</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#282c44', lineHeight: 1.4 }}>{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#282c44', lineHeight: 1.6, borderTop: '1px solid #1c1f30', paddingTop: 10 }}>
        <strong style={{ color: '#3a3f5c' }}>Wie das Lager funktioniert:</strong><br />
        Alles was deine Gebäude produzieren landet hier. Stadtvertrag und Spieler-Verträge
        ziehen automatisch davon ab. Die Strategie bestimmt ab wann verkauft wird —
        unter der Grenze passiert nichts.
      </div>
    </div>
  );
}
