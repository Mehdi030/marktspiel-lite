'use client';
import type { Building, Company, MarketEntry, Inventory, Sector } from '@/types/game';
import { SECTOR_LABELS, SECTOR_COLORS, SECTOR_ICONS } from '@/types/game';
const SECTOR_BUILDINGS: Record<string, Array<{ type: string; label: string; icon: string; desc: string }>> = {
  ENERGY:        [{ type: 'production', label: 'Kraftwerk', icon: '⚡', desc: 'Produziert Energie' }],
  RAW_MATERIALS: [{ type: 'production', label: 'Bergwerk', icon: '⛏', desc: 'Fördert Rohstoffe' }],
  INDUSTRY:      [{ type: 'production', label: 'Fabrik', icon: '🏭', desc: 'Produziert Güter' }],
  LOGISTICS:     [{ type: 'logistics_hub', label: 'Verteilzentrum', icon: '🚚', desc: 'Logistik-Knoten' }],
};

const INPUT_REQS: Partial<Record<Sector, Partial<Record<Sector, number>>>> = {
  ENERGY:        { RAW_MATERIALS: 0.15 },
  RAW_MATERIALS: { ENERGY: 0.12, LOGISTICS: 0.06 },
  INDUSTRY:      { RAW_MATERIALS: 0.30, ENERGY: 0.12 },
  LOGISTICS:     { INDUSTRY: 0.08, ENERGY: 0.08 },
};

const BASE_OUTPUT: Record<string, number> = {
  production: 80, storage: 0, logistics_hub: 20, retail: 30,
};

interface Props {
  myCompany: Company;
  buildings: Building[];
  market: MarketEntry[];
  inventory: Inventory[];
}

type Status = 'ready' | 'partial' | 'blocked' | 'building';

interface BuildingStatus {
  building: Building;
  status: Status;
  outputPerTick: number;
  issues: string[];
  sectorIcon: string;
  sectorLabel: string;
  buildingLabel: string;
  buildingIcon: string;
  progressPct?: number;
}

// Berechnet Qualitätsstufe + Spezialgebäude-Bonus für Anzeige
function getQualityTier(sector: Sector, myBuildings: { type: string }[]): { label: string; color: string; priceMult: number } | null {
  if (sector === 'RAW_MATERIALS') {
    if (myBuildings.some(b => b.type === 'logistics_hub')) return { label: 'Veredelt +40%', color: '#f59e0b', priceMult: 1.4 };
  }
  if (sector === 'INDUSTRY') {
    const hasHub    = myBuildings.some(b => b.type === 'logistics_hub');
    const hasRetail = myBuildings.some(b => b.type === 'retail');
    if (hasHub && hasRetail) return { label: 'Qualität Q3 ×2.2', color: '#10b981', priceMult: 2.2 };
    if (hasHub)              return { label: 'Qualität Q2 ×1.7', color: '#6366f1', priceMult: 1.7 };
    return { label: 'Qualität Q1', color: '#4e5470', priceMult: 1.0 };
  }
  if (sector === 'LOGISTICS' && myBuildings.some(b => b.type === 'logistics_hub')) {
    return { label: '% auf Bezirkstransporte', color: '#a78bfa', priceMult: 1.0 };
  }
  return null;
}

export default function ProductionStatus({ myCompany, buildings, market, inventory }: Props) {
  const myBlds = buildings.filter(b => b.company_id === myCompany.id);
  const mktMap = Object.fromEntries(market.map(m => [m.sector, m]));
  const invMap: Partial<Record<Sector, number>> = {};
  for (const i of inventory) {
    if (i.company_id === myCompany.id) invMap[i.sector as Sector] = i.quantity;
  }

  const qualityTier = getQualityTier(myCompany.primary_sector as Sector, myBlds);
  const hasForederplatzBonus = myCompany.primary_sector === 'RAW_MATERIALS' &&
    myBlds.some(b => b.type === 'production' && b.district_id === 'outskirts' && b.construction_ticks_remaining === 0);

  const statuses: BuildingStatus[] = myBlds.map(b => {
    const sector      = b.sector as Sector;
    const sectorBldg  = SECTOR_BUILDINGS[myCompany.primary_sector as Sector]?.find(sb => sb.type === b.type);
    const baseOut     = BASE_OUTPUT[b.type] ?? 0;
    const output      = Math.round(baseOut * (b.level ?? 1));
    const inputReqs   = INPUT_REQS[sector] ?? {};
    const issues: string[] = [];

    // Under construction
    if (b.construction_ticks_remaining > 0) {
      const endsAt = (b as unknown as Record<string, unknown>).construction_ends_at as string | undefined;
      let progressPct = 0;
      if (endsAt) {
        const totalMs = 90_000;
        const remaining = new Date(endsAt).getTime() - Date.now();
        progressPct = Math.min(100, Math.max(0, ((totalMs - Math.max(0, remaining)) / totalMs) * 100));
      }
      return {
        building: b, status: 'building' as Status,
        outputPerTick: 0, issues: ['Im Bau…'],
        sectorIcon: SECTOR_ICONS[sector] ?? '▣',
        sectorLabel: SECTOR_LABELS[sector],
        buildingLabel: sectorBldg?.label ?? b.type,
        buildingIcon: sectorBldg?.icon ?? '🏗',
        progressPct,
      };
    }

    if (output === 0) {
      return {
        building: b, status: 'ready' as Status, outputPerTick: 0, issues: [],
        sectorIcon: SECTOR_ICONS[sector] ?? '▣', sectorLabel: SECTOR_LABELS[sector],
        buildingLabel: sectorBldg?.label ?? b.type, buildingIcon: sectorBldg?.icon ?? '📦',
      };
    }

    // Check inputs
    let efficiency = 1.0;
    for (const [inputSector, ratio] of Object.entries(inputReqs) as [Sector, number][]) {
      const needed  = Math.round(output * ratio);
      const inStock = invMap[inputSector] ?? 0;
      const mktPrice = mktMap[inputSector]?.price ?? 0;
      if (inStock < needed) {
        const canAfford = mktPrice > 0 && myCompany.cash >= needed * mktPrice;
        if (!canAfford) {
          if (inStock === 0) {
            issues.push(`Kein ${SECTOR_LABELS[inputSector]} ${SECTOR_ICONS[inputSector] ?? ''}`);
            efficiency = 0;
          } else {
            issues.push(`Wenig ${SECTOR_LABELS[inputSector]} (${inStock}/${needed})`);
            efficiency = Math.min(efficiency, inStock / needed);
          }
        }
      }
    }

    const actualOut = Math.round(output * efficiency);
    const status: Status = efficiency >= 0.95 ? 'ready' : efficiency > 0.3 ? 'partial' : 'blocked';

    return {
      building: b, status, outputPerTick: actualOut, issues,
      sectorIcon: SECTOR_ICONS[sector] ?? '▣', sectorLabel: SECTOR_LABELS[sector],
      buildingLabel: sectorBldg?.label ?? b.type, buildingIcon: sectorBldg?.icon ?? '🏭',
    };
  });

  if (statuses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#282c44', fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🏗</div>
        Noch keine Gebäude — geh zur Karte und baue dein erstes!
      </div>
    );
  }

  const readyCount   = statuses.filter(s => s.status === 'ready').length;
  const blockedCount = statuses.filter(s => s.status === 'blocked').length;

  const STATUS_META: Record<Status, { color: string; label: string; icon: string }> = {
    ready:    { color: '#10b981', label: 'Produziert',   icon: '✓' },
    partial:  { color: '#f59e0b', label: 'Eingeschränkt', icon: '⚠' },
    blocked:  { color: '#f87171', label: 'Blockiert',    icon: '✕' },
    building: { color: '#6366f1', label: 'Im Bau',       icon: '🏗' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          color: '#10b981', fontWeight: 700 }}>
          {readyCount} produzierend
        </div>
        {blockedCount > 0 && (
          <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171', fontWeight: 700 }}>
            {blockedCount} blockiert
          </div>
        )}
        {qualityTier && (
          <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8,
            background: qualityTier.color + '15', border: `1px solid ${qualityTier.color}30`,
            color: qualityTier.color, fontWeight: 700 }}>
            ✦ {qualityTier.label}
          </div>
        )}
        {hasForederplatzBonus && (
          <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8,
            background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.2)',
            color: '#84cc16', fontWeight: 700 }}>
            ⛏ Förderplatz-Bonus +32%
          </div>
        )}
      </div>

      {statuses.map(s => {
        const meta = STATUS_META[s.status];
        const col  = SECTOR_COLORS[s.building.sector as Sector] ?? '#4e5470';

        return (
          <div key={s.building.id} style={{
            background: '#08090f',
            border: `1px solid ${meta.color}25`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ height: 2, background: `linear-gradient(90deg, ${meta.color}80, transparent)` }} />
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.status === 'building' ? 10 : 0 }}>
                <span style={{ fontSize: 20 }}>{s.buildingIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#eef0f6' }}>{s.buildingLabel}</span>
                    <span style={{ fontSize: 8, fontWeight: 800, color: col, background: col + '18',
                      padding: '1px 5px', borderRadius: 5 }}>Lv.{s.building.level}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, background: meta.color + '15',
                      padding: '1px 7px', borderRadius: 10 }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#4e5470' }}>
                    {s.sectorIcon} {s.sectorLabel}
                    {s.outputPerTick > 0 && (
                      <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 8 }}>
                        +{s.outputPerTick} Einh./Runde
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bau-Fortschritt */}
              {s.status === 'building' && s.progressPct !== undefined && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#f59e0b' }}>Baufortschritt</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>
                      {Math.round(s.progressPct)}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#1c1f30', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${s.progressPct}%`, borderRadius: 2,
                      background: 'linear-gradient(90deg, #f59e0b80, #f59e0b)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Probleme */}
              {s.issues.length > 0 && s.status !== 'building' && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.issues.map((issue, i) => (
                    <div key={i} style={{
                      fontSize: 10, fontWeight: 600, color: '#f87171',
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                      padding: '3px 8px', borderRadius: 8,
                    }}>⚠ {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
