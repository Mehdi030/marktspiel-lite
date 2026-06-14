'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSupabase, isSupabaseReady } from '@/lib/supabase';
import type { Company, Building, MarketEntry, Inventory, PriceHistory, GameEvent, Sector, World } from '@/types/game';
import { SECTORS, SECTOR_LABELS, SECTOR_COLORS, SECTOR_ICONS } from '@/types/game';
import Logo from '@/components/Logo';
import CompanyCrest from '@/components/CompanyCrest';
import ProductionStatus from '@/components/ProductionStatus';
import Handelsplatz from '@/components/Handelsplatz';
import LagerPanel from '@/components/LagerPanel';
import UpgradePanel from '@/components/UpgradePanel';
import MarketChart from '@/components/MarketChart';
import PrioritySliders from '@/components/PrioritySliders';

const C1 = '#6366f1';

interface CityBonus {
  label: string;
  priceMult: number;
  outputMult: number;
  costReduce: number;
}

const CITY_BONUSES: Record<number, CityBonus> = {
  1: { label: 'Dorf', priceMult: 1.0, outputMult: 1.0, costReduce: 0 },
  2: { label: 'Kleinstadt', priceMult: 1.05, outputMult: 1.05, costReduce: 0.05 },
  3: { label: 'Stadt', priceMult: 1.10, outputMult: 1.10, costReduce: 0.10 },
  4: { label: 'Großstadt', priceMult: 1.15, outputMult: 1.15, costReduce: 0.15 },
  5: { label: 'Metropole', priceMult: 1.20, outputMult: 1.20, costReduce: 0.20 },
  6: { label: 'Mega-City', priceMult: 1.30, outputMult: 1.25, costReduce: 0.25 },
};

function formatCash(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mio';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + '.' + (Math.abs(n) % 1000).toString().padStart(3, '0').slice(0, 1) + 'k';
  return n.toLocaleString();
}

function CityBar({ current, target, level }: { current: number; target: number; level: number }) {
  const pct = Math.min(100, (current / target) * 100);
  const bonus = CITY_BONUSES[level];
  const nextBonus = CITY_BONUSES[level + 1];
  return (
    <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 800 }}>🏙 {bonus?.label ?? 'Stadt'}</span>
          <span style={{ fontSize: 12, color: '#4e5470', marginLeft: 8 }}>Level {level}</span>
        </div>
        {nextBonus && <span style={{ fontSize: 12, color: '#fbbf24' }}>→ {nextBonus.label}</span>}
      </div>
      <div style={{ height: 8, background: '#1a1d2e', borderRadius: 4, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #fbbf24)', borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4e5470' }}>
        <span>{current.toLocaleString()} / {target.toLocaleString()} Wachstumspunkte</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {bonus && (
          <>
            <span style={{ fontSize: 11, padding: '3px 8px', background: '#6366f114', borderRadius: 6, color: '#818cf8' }}>+{Math.round((bonus.priceMult - 1) * 100)}% Verkaufspreis</span>
            <span style={{ fontSize: 11, padding: '3px 8px', background: '#06b6d414', borderRadius: 6, color: '#22d3ee' }}>+{Math.round((bonus.outputMult - 1) * 100)}% Produktion</span>
            <span style={{ fontSize: 11, padding: '3px 8px', background: '#84cc1614', borderRadius: 6, color: '#a3e635' }}>-{Math.round(bonus.costReduce * 100)}% Baukosten</span>
          </>
        )}
      </div>
    </div>
  );
}

function EventLog({ events, companyId }: { events: GameEvent[]; companyId: string }) {
  const myEvents = events.filter(e => e.company_id === companyId || !e.company_id).slice(-10).reverse();
  if (myEvents.length === 0) return <div style={{ color: '#4e5470', fontSize: 12, padding: 12 }}>Keine Ereignisse</div>;
  return (
    <div style={{ maxHeight: 200, overflow: 'auto' }}>
      {myEvents.map(e => (
        <div key={e.id} style={{ padding: '6px 12', fontSize: 12, borderBottom: '1px solid #0d0f1a', color: '#9ca3af' }}>
          <span style={{ color: '#6b7280', marginRight: 6 }}>#{e.tick_number}</span>
          {e.title}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ userId }: { userId: string }) {
  const sb = getSupabase();

  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [market, setMarket] = useState<MarketEntry[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [world, setWorld] = useState<World | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'buildings' | 'upgrades'>('overview');
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState('');
  const [newSector, setNewSector] = useState<string>('ENERGY');
  const [creating, setCreating] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [{ data: comps }, { data: mkt }, { data: inv }, { data: ph }, { data: ev }, { data: w }] = await Promise.all([
        sb.from('companies').select('*').eq('owner_id', userId),
        sb.from('market').select('*'),
        sb.from('inventory').select('*'),
        sb.from('price_history').select('*').order('tick_number', { ascending: false }).limit(50),
        sb.from('events').select('*').order('tick_number', { ascending: false }).limit(50),
        sb.from('world').select('*'),
      ]);
      if (comps && comps.length > 0) setMyCompany(comps[0]);
      if (mkt) setMarket(mkt);
      if (inv) setInventory(inv);
      if (ph) setPriceHistory(ph.reverse());
      if (ev) setEvents(ev);
      if (w && w.length > 0) setWorld(w[0]);
      if (comps && comps.length > 0) {
        const { data: blds } = await sb.from('buildings').select('*').eq('company_id', comps[0].id);
        if (blds) setBuildings(blds);
      }
      const { data: allComp } = await sb.from('companies').select('*');
      if (allComp) setAllCompanies(allComp);
    } catch (e) { console.error('loadData', e); }
  }, [sb, userId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!myCompany) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData, myCompany]);

  async function createCompany() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), primary_sector: newSector, owner_id: userId }),
      });
      const data = await r.json();
      if (data.company) {
        try { localStorage.setItem('ms_company', JSON.stringify({ id: data.company.id, owner_id: userId })); } catch {}
        setMyCompany(data.company);
      }
    } catch {}
    setCreating(false);
  }

  if (!myCompany) {
    return (
      <div style={{ minHeight: '100vh', background: '#06070d', color: '#eef0f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🏙 Marktspiel Lite</div>
            <div style={{ fontSize: 13, color: '#4e5470' }}>Gründe deine Firma und baue gemeinsam mit anderen die Stadt auf</div>
          </div>
          <div style={{ background: '#0d0f1a', borderRadius: 20, padding: 32, border: '1px solid #1a1d2e' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Firma gründen</div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Muster GmbH"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #1f2338', background: '#0a0b14', color: '#eef0f6', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>Branche</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['ENERGY', 'RAW_MATERIALS', 'INDUSTRY', 'LOGISTICS'] as const).map(s => (
                  <button key={s} onClick={() => setNewSector(s)}
                    style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${newSector === s ? ['#f59e0b','#84cc16','#6366f1','#06b6d4'][['ENERGY','RAW_MATERIALS','INDUSTRY','LOGISTICS'].indexOf(s)] : '#1f2338'}`, background: newSector === s ? '#ffffff08' : '#0a0b14', color: '#eef0f6', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{['⚡','⛏','🏭','🚚'][['ENERGY','RAW_MATERIALS','INDUSTRY','LOGISTICS'].indexOf(s)]}</span>
                    {['Energie','Rohstoffe','Fertigung','Logistik'][['ENERGY','RAW_MATERIALS','INDUSTRY','LOGISTICS'].indexOf(s)]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={createCompany} disabled={creating}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Wird erstellt…' : 'Firma gründen →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!world) return <div style={{ minHeight: '100vh', background: '#06070d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4e5470' }}>Lade Welt…</div>;

  const myInventory = inventory.filter(i => i.company_id === myCompany.id);
  const sector = myCompany.primary_sector as Sector;
  const cityBonus = CITY_BONUSES[world.city_level ?? 1] ?? CITY_BONUSES[1];

  return (
    <div style={{ minHeight: '100vh', background: '#06070d', color: '#eef0f6' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0d0f1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={32} showText textSize={14} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: '#fbbf24', background: '#fbbf2414', padding: '2px 8px', borderRadius: 6 }}>
            {cityBonus.label} · Level {world.city_level}
          </div>
          <div style={{ fontSize: 11, color: '#06b6d4', background: '#06b6d414', padding: '2px 8px', borderRadius: 6 }}>
            Tick #{world.tick_number}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CompanyCrest id={myCompany.id} color={myCompany.color} name={myCompany.name} size={28} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{myCompany.name}</div>
            <div style={{ fontSize: 11, color: SECTOR_COLORS[sector] }}>{SECTOR_LABELS[sector]} · {formatCash(myCompany.cash)} €</div>
          </div>
        </div>
      </header>

      {/* ── City Bar ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px' }}>
        <CityBar current={world.city_growth_points ?? 0} target={world.city_growth_target ?? 5000} level={world.city_level ?? 1} />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '0 20px', marginBottom: 12 }}>
        {([
          ['overview', 'Übersicht'],
          ['market', 'Markt'],
          ['buildings', 'Gebäude'],
          ['upgrades', 'Upgrades'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none',
              background: activeTab === key ? '#6366f1' : '#0d0f1a',
              color: activeTab === key ? '#fff' : '#6b7280',
              fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 40px', maxWidth: 1200 }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            {/* Company Stats */}
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#818cf8' }}>Deine Firma</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>Bargeld</span>
                  <span style={{ fontWeight: 600, color: myCompany.cash >= 0 ? '#a3e635' : '#ef4444' }}>{formatCash(myCompany.cash)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>Gebäude</span>
                  <span>{buildings.filter(b => b.company_id === myCompany.id).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>Sektor</span>
                  <span style={{ color: SECTOR_COLORS[sector] }}>{SECTOR_LABELS[sector]} {SECTOR_ICONS[sector]}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>Lagerbestand</span>
                  <span>{myInventory.reduce((s, i) => s + i.quantity, 0).toLocaleString()} Einh.</span>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <PrioritySliders company={myCompany} />
              </div>
            </div>

            {/* Production Status */}
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#06b6d4' }}>Produktion</div>
              <ProductionStatus myCompany={myCompany} buildings={buildings.filter(b => b.company_id === myCompany.id)} market={market} inventory={myInventory} />
            </div>

            {/* Market Prices */}
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#fbbf24' }}>Marktpreise</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {market.map(m => (
                  <div key={m.sector} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12', borderRadius: 8, background: '#0a0b14' }}>
                    <div>
                      <span style={{ fontSize: 14, marginRight: 6 }}>{SECTOR_ICONS[m.sector as Sector]}</span>
                      <span style={{ fontSize: 13, color: SECTOR_COLORS[m.sector as Sector] }}>{SECTOR_LABELS[m.sector as Sector]}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{m.price.toFixed(2)} €</div>
                      <div style={{ fontSize: 10, color: '#4e5470' }}>A:{m.supply.toLocaleString()} N:{m.demand.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#a78bfa' }}>Ereignisse</div>
              <EventLog events={events} companyId={myCompany.id} />
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#fbbf24' }}>Handelsplatz</div>
              <Handelsplatz myCompany={myCompany} allCompanies={allCompanies} onToast={showToast} />
            </div>
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#06b6d4' }}>Preischarts</div>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {market.map(m => (
                  <div key={m.sector}>
                    <div style={{ fontSize: 12, color: SECTOR_COLORS[m.sector as Sector], marginBottom: 8, fontWeight: 600 }}>
                      {SECTOR_ICONS[m.sector as Sector]} {SECTOR_LABELS[m.sector as Sector]}
                    </div>
                    <MarketChart sector={m.sector as Sector} history={priceHistory.filter(p => p.sector === m.sector)} basePrice={m.base_price} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#84cc16' }}>Lager</div>
              <LagerPanel myCompany={myCompany} buildings={buildings.filter(b => b.company_id === myCompany.id)} inventory={myInventory} onRefresh={loadData} />
            </div>
          </div>
        )}

        {activeTab === 'buildings' && (
          <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#f59e0b' }}>Gebäude bauen</div>
            <div style={{ fontSize: 13, color: '#4e5470', marginBottom: 16 }}>
              Wähle einen Bezirk und Gebäudetyp. Stadt-Level senkt Baukosten um {Math.round(cityBonus.costReduce * 100)}%.
            </div>
            <BuildPanel myCompany={myCompany} buildings={buildings.filter(b => b.company_id === myCompany.id)} onRefresh={loadData} onToast={showToast} />
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div style={{ background: '#0d0f1a', borderRadius: 16, padding: 20, border: '1px solid #1a1d2e' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#a78bfa' }}>Upgrades</div>
            <UpgradePanel myCompany={myCompany} buildings={buildings.filter(b => b.company_id === myCompany.id)} onRefresh={loadData} onToast={showToast} />
          </div>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1d2e', border: '1px solid #6366f1', borderRadius: 12,
          padding: '10px 24px', fontSize: 13, color: '#eef0f6', zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Simple Build Panel (inline since it's small) ──────────────────────────

function BuildPanel({ myCompany, buildings, onRefresh, onToast }: {
  myCompany: Company; buildings: Building[]; onRefresh: () => void; onToast: (msg: string) => void;
}) {
  const [selectedDistrict, setSelectedDistrict] = useState('industrial');
  const [selectedType, setSelectedType] = useState('production');
  const [selectedSector, setSelectedSector] = useState(myCompany.primary_sector);
  const [busy, setBusy] = useState(false);

  const DISTRICTS = [
    { id: 'center', name: 'Hafenviertel', desc: 'Logistik +25%' },
    { id: 'industrial', name: 'Fabrikviertel', desc: 'Produktion +20%' },
    { id: 'outskirts', name: 'Minenviertel', desc: 'Rohstoffe +10%' },
    { id: 'energy', name: 'Kraftwerksviertel', desc: 'Energie +10%' },
    { id: 'trade', name: 'Marktplatz', desc: 'Alle +15%' },
  ];

  const BUILD_TYPES = [
    { id: 'production', label: 'Produktion', cost: 15000 },
    { id: 'storage', label: 'Lager', cost: 8000 },
    { id: 'logistics_hub', label: 'Logistik', cost: 12000 },
    { id: 'retail', label: 'Handel', cost: 10000 },
  ];

  async function handleBuild() {
    setBusy(true);
    try {
      const r = await fetch('/api/tick-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUILD',
          company_id: myCompany.id,
          payload: { district_id: selectedDistrict, type: selectedType, sector: selectedSector },
        }),
      });
      const data = await r.json();
      if (data.success) { onToast('Baumaßnahme gestartet!'); onRefresh(); }
      else onToast(data.error ?? 'Fehler');
    } catch { onToast('Verbindungsfehler'); }
    setBusy(false);
  }

  const mySector = myCompany.primary_sector;
  const canBuild = buildings.length < 4;
  const districtBuildings = buildings.filter(b => b.district_id === selectedDistrict);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Bezirk wählen</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DISTRICTS.map(d => (
            <button key={d.id} onClick={() => setSelectedDistrict(d.id)}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${selectedDistrict === d.id ? '#6366f1' : '#1f2338'}`,
                background: selectedDistrict === d.id ? '#6366f114' : '#0a0b14', color: selectedDistrict === d.id ? '#818cf8' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {d.name}
              <div style={{ fontSize: 10, color: '#4e5470', marginTop: 2 }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Gebäudetyp</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BUILD_TYPES.map(t => (
            <button key={t.id} onClick={() => setSelectedType(t.id)}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${selectedType === t.id ? '#6366f1' : '#1f2338'}`,
                background: selectedType === t.id ? '#6366f114' : '#0a0b14', color: selectedType === t.id ? '#818cf8' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t.label} <span style={{ color: '#4e5470' }}>{t.cost.toLocaleString()} €</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#4e5470', marginBottom: 12 }}>
        Gebaut: {buildings.length}/4 · In diesem Bezirk: {districtBuildings.length}/2
      </div>

      <button onClick={handleBuild} disabled={busy || !canBuild}
        style={{ padding: '10px 24px', borderRadius: 10, border: 'none',
          background: canBuild ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : '#1a1d2e',
          color: canBuild ? '#fff' : '#4e5470', fontSize: 14, fontWeight: 700,
          cursor: canBuild && !busy ? 'pointer' : 'not-allowed', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Wird gebaut…' : 'Bauen'}
      </button>
    </div>
  );
}