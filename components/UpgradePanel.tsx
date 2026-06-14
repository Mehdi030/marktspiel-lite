'use client';
import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getUpgradesForSector, getUpgradeById, computeEffects, type OwnedUpgrade, type Upgrade } from '@/lib/upgrades';
import type { Company, Building, Sector } from '@/types/game';

interface Props {
  myCompany: Company;
  buildings: Building[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const WHEN_COLOR: Record<string, string> = {
  early: '#10b981',
  mid:   '#f59e0b',
  late:  '#f87171',
};
const WHEN_LABEL: Record<string, string> = {
  early: 'Früh',
  mid:   'Mid-Game',
  late:  'Late-Game',
};

export default function UpgradePanel({ myCompany, buildings, onRefresh, onToast }: Props) {
  const [owned, setOwned]           = useState<OwnedUpgrade[]>([]);
  const [buying, setBuying]         = useState<string | null>(null);
  const [confirm, setConfirm]       = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'owned' | 'available'>('all');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const loadOwned = useCallback(async () => {
    const { data } = await sb
      .from('company_upgrades')
      .select('upgrade_id, level')
      .eq('company_id', myCompany.id);
    setOwned(data ?? []);
  }, [myCompany.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadOwned(); }, [loadOwned]);

  const myBuildings   = buildings.filter(b => b.company_id === myCompany.id && b.construction_ticks_remaining === 0);
  const upgrades      = getUpgradesForSector(myCompany.primary_sector as Sector);
  const ownedMap      = Object.fromEntries(owned.map(o => [o.upgrade_id, o.level]));
  const effects       = computeEffects(owned);

  function isPrereqMet(upg: Upgrade): boolean {
    if (upg.requiresUpgrade && !ownedMap[upg.requiresUpgrade]) return false;
    if (upg.requiresBuildingType) {
      const bld = myBuildings.find(b => b.type === upg.requiresBuildingType);
      if (!bld) return false;
      if (upg.requiresBuildingLevel && (bld.level ?? 1) < upg.requiresBuildingLevel) return false;
    }
    return true;
  }

  function getUpgradeCost(upg: Upgrade, currentLevel: number): number {
    return upg.baseCost + upg.costPerLevel * currentLevel;
  }

  async function purchase(upg: Upgrade) {
    const currentLevel = ownedMap[upg.id] ?? 0;
    if (currentLevel >= upg.maxLevel) return;
    const cost = getUpgradeCost(upg, currentLevel);
    if (myCompany.cash < cost) {
      onToast(`Nicht genug Kapital — benötigt ${cost.toLocaleString()} €`);
      setConfirm(null);
      return;
    }
    setBuying(upg.id);
    // Deduct cash
    await sb.from('companies').update({ cash: myCompany.cash - cost }).eq('id', myCompany.id);
    // Upsert upgrade
    if (currentLevel === 0) {
      await sb.from('company_upgrades').insert({ company_id: myCompany.id, upgrade_id: upg.id, level: 1 });
    } else {
      await sb.from('company_upgrades').update({ level: currentLevel + 1 })
        .eq('company_id', myCompany.id).eq('upgrade_id', upg.id);
    }
    setBuying(null);
    setConfirm(null);
    onToast(`✓ ${upg.label} ${currentLevel === 0 ? 'gekauft' : `auf Level ${currentLevel + 1} gebracht`} — ${cost.toLocaleString()} €`);
    loadOwned();
    onRefresh();
  }

  // Filtered list
  const visible = upgrades.filter(u => {
    if (filter === 'owned')     return (ownedMap[u.id] ?? 0) > 0;
    if (filter === 'available') return (ownedMap[u.id] ?? 0) === 0 && isPrereqMet(u);
    return true;
  });

  const totalOwned   = upgrades.filter(u => (ownedMap[u.id] ?? 0) > 0).length;
  const totalBoosts  = [
    effects.outputMultiplier > 1     && `+${Math.round((effects.outputMultiplier - 1) * 100)}% Output`,
    effects.priceBonus > 0           && `+${Math.round(effects.priceBonus * 100)}% Preis`,
    effects.costReduction > 0        && `-${Math.round(effects.costReduction * 100)}% Kosten`,
    effects.inputReduction > 0       && `-${Math.round(effects.inputReduction * 100)}% Inputs`,
    effects.storageBonus > 0         && `+${effects.storageBonus.toLocaleString()} Lager`,
    effects.passiveIncomePerMin > 0  && `+${effects.passiveIncomePerMin.toLocaleString()} €/Min passiv`,
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Aktive Effekte — Zusammenfassung */}
      {totalBoosts.length > 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#6366f1', marginBottom: 8 }}>
            ✦ AKTIVE BONI ({totalOwned}/{upgrades.length} Upgrades)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {totalBoosts.map((b, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                color: '#10b981',
              }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filter-Pills */}
      <div style={{ display: 'flex', gap: 5 }}>
        {(['all', 'available', 'owned'] as const).map(f => {
          const labels = { all: 'Alle', available: 'Verfügbar', owned: 'Gekauft' };
          const on = filter === f;
          const ac = '#6366f1';
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: on ? 700 : 500,
              border: `1px solid ${on ? ac + '55' : '#1c1f30'}`,
              background: on ? `${ac}14` : 'transparent',
              color: on ? '#eef0f6' : '#4e5470',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{labels[f]}</button>
          );
        })}
      </div>

      {/* Upgrade-Karten */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#282c44', fontSize: 13 }}>
            {filter === 'owned' ? 'Noch keine Upgrades gekauft' : 'Keine Upgrades verfügbar'}
          </div>
        )}
        {visible.map(upg => {
          const currentLevel  = ownedMap[upg.id] ?? 0;
          const isOwned       = currentLevel > 0;
          const isMaxed       = currentLevel >= upg.maxLevel;
          const prereqMet     = isPrereqMet(upg);
          const cost          = getUpgradeCost(upg, currentLevel);
          const canAfford     = myCompany.cash >= cost;
          const canBuy        = prereqMet && !isMaxed && canAfford;
          const isConfirming  = confirm === upg.id;
          const isBuying      = buying === upg.id;
          const wc            = WHEN_COLOR[upg.when];
          const prereqUpg     = upg.requiresUpgrade ? getUpgradeById(upg.requiresUpgrade) : null;

          return (
            <div key={upg.id} style={{
              background: '#08090f',
              border: `1px solid ${isOwned ? 'rgba(99,102,241,0.3)' : prereqMet ? '#1c1f30' : '#0e0f18'}`,
              borderRadius: 16, overflow: 'hidden',
              opacity: !prereqMet ? 0.55 : 1,
              transition: 'all 0.2s',
            }}>
              {/* Top accent */}
              <div style={{ height: 2, background: isOwned
                ? 'linear-gradient(90deg, #6366f1, #818cf8, transparent)'
                : `linear-gradient(90deg, ${wc}60, transparent)` }} />

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isOwned ? 'rgba(99,102,241,0.15)' : '#0c0e18',
                    border: `1.5px solid ${isOwned ? 'rgba(99,102,241,0.4)' : '#1c1f30'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {prereqMet ? upg.icon : '🔒'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isOwned ? '#eef0f6' : '#9ca3af' }}>
                        {upg.label}
                      </span>
                      {/* Level dots */}
                      {upg.maxLevel > 1 && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: upg.maxLevel }).map((_, i) => (
                            <div key={i} style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: i < currentLevel ? '#6366f1' : '#1c1f30',
                              transition: 'background 0.2s',
                            }} />
                          ))}
                        </div>
                      )}
                      {isMaxed && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981',
                          background: 'rgba(16,185,129,0.15)', padding: '2px 7px', borderRadius: 10 }}>
                          MAX ✓
                        </span>
                      )}
                      <span style={{ fontSize: 9, fontWeight: 700, color: wc,
                        background: wc + '14', padding: '2px 7px', borderRadius: 10 }}>
                        {WHEN_LABEL[upg.when]}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#4e5470', lineHeight: 1.55, marginBottom: 8 }}>
                      {upg.desc}
                    </div>

                    {/* Effekt */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 8,
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                      marginBottom: 8,
                    }}>
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>
                        {upg.effect.label}
                        {upg.maxLevel > 1 && currentLevel > 0 && ` (Lv ${currentLevel})`}
                      </span>
                    </div>

                    {/* Voraussetzungen */}
                    {!prereqMet && (
                      <div style={{ fontSize: 10, color: '#f59e0b', marginBottom: 8 }}>
                        🔒 Voraussetzung:{' '}
                        {prereqUpg
                          ? `"${prereqUpg.label}" kaufen`
                          : upg.requiresBuildingType
                            ? `${upg.requiresBuildingType} Level ${upg.requiresBuildingLevel ?? 1} benötigt`
                            : 'Nicht erfüllt'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Kauf-Bereich */}
                {!isMaxed && prereqMet && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1c1f30',
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', marginBottom: 2 }}>
                        {currentLevel === 0 ? 'KOSTEN' : `LEVEL ${currentLevel + 1} KOSTEN`}
                      </div>
                      <div style={{
                        fontSize: 16, fontFamily: 'monospace', fontWeight: 900,
                        color: canAfford ? '#10b981' : '#f87171',
                      }}>
                        {cost.toLocaleString()} €
                      </div>
                    </div>
                    <div style={{ flex: 1 }} />

                    {!isConfirming ? (
                      <button
                        onClick={() => setConfirm(upg.id)}
                        disabled={!canBuy || isBuying}
                        style={{
                          padding: '9px 20px', borderRadius: 10, fontFamily: 'inherit',
                          fontSize: 12, fontWeight: 700, cursor: canBuy ? 'pointer' : 'not-allowed',
                          background: canBuy
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))'
                            : '#0c0e18',
                          border: `1px solid ${canBuy ? 'rgba(99,102,241,0.45)' : '#1c1f30'}`,
                          color: canBuy ? '#818cf8' : '#3a3f5c',
                          boxShadow: canBuy ? '0 0 14px rgba(99,102,241,0.2)' : 'none',
                          transition: 'all 0.15s',
                        }}>
                        {currentLevel === 0
                          ? `${upg.icon} Kaufen`
                          : `${upg.icon} Upgrade`}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setConfirm(null)} style={{
                          padding: '9px 14px', borderRadius: 10, fontFamily: 'inherit',
                          fontSize: 12, cursor: 'pointer', border: '1px solid #1c1f30',
                          background: 'transparent', color: '#4e5470',
                        }}>Abbrechen</button>
                        <button
                          onClick={() => purchase(upg)}
                          disabled={isBuying}
                          style={{
                            padding: '9px 18px', borderRadius: 10, fontFamily: 'inherit',
                            fontSize: 12, fontWeight: 800, cursor: isBuying ? 'not-allowed' : 'pointer',
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))',
                            border: '1px solid rgba(16,185,129,0.4)',
                            color: '#10b981',
                          }}>
                          {isBuying ? '…' : `✓ Bestätigen · ${cost.toLocaleString()} €`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isMaxed && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1c1f30',
                    fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                    ✓ Vollständig freigeschaltet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
