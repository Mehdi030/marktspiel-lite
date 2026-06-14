'use client';
import type { Company, Building, MarketEntry, Sector } from '@/types/game';
import { SECTOR_LABELS, SECTOR_COLORS, SECTORS } from '@/types/game';

interface Props {
  companies: Company[];
  buildings: Building[];
  market: MarketEntry[];
  myCompanyId: string;
}

const BTYPE_OUTPUT: Record<string, number> = { production: 80, storage: 0, logistics_hub: 20, retail: 30 };

function hex(h: string | null | undefined) {
  const safe = h && /^#[0-9a-fA-F]{6}/.test(h) ? h : '#6b7280';
  return [parseInt(safe.slice(1,3),16),parseInt(safe.slice(3,5),16),parseInt(safe.slice(5,7),16)];
}
function rgba(h: string | null | undefined, a: number) { const [r,g,b] = hex(h); return `rgba(${r},${g},${b},${a})`; }

// §11.2 range-based production estimate
function estimateProduction(company: Company, buildings: Building[]): { low: number; high: number } | null {
  const base = buildings
    .filter(b => b.company_id === company.id && b.construction_ticks_remaining === 0)
    .reduce((sum, b) => sum + (BTYPE_OUTPUT[b.type] ?? 0) * (b.level ?? 1), 0);
  if (base === 0) return null;
  return { low: Math.round(base * 0.65), high: Math.round(base * 1.35) };
}

// §11.3 capital is hidden — show qualitative tier only
function capitalTier(cash: number): { label: string; color: string } {
  if (cash < 0)       return { label: 'Defizit',   color: '#f87171' };
  if (cash < 25000)   return { label: 'Knapp',     color: '#f59e0b' };
  if (cash < 100000)  return { label: 'Solide',    color: '#a3e635' };
  if (cash < 300000)  return { label: 'Stark',     color: '#10b981' };
  return                     { label: 'Dominant',  color: '#6366f1' };
}

// §11.2 approximate market share based on building power
function estimateMarketShare(company: Company, allPlayers: Company[], buildings: Building[], sector: Sector): number {
  const power = (id: string) => buildings
    .filter(b => b.company_id === id && b.sector === sector && b.construction_ticks_remaining === 0)
    .reduce((s, b) => s + b.level, 0);
  const total = allPlayers.reduce((s, c) => s + power(c.id), 0);
  return total > 0 ? Math.round((power(company.id) / total) * 100) : 0;
}

function CompetitorCard({ company, buildings, myCompanyId }: {
  company: Company; buildings: Building[]; myCompanyId: string;
}) {
  const isMe = company.id === myCompanyId;
  const color = company.color;
  const myBlds = buildings.filter(b => b.company_id === company.id && b.construction_ticks_remaining === 0);
  const prod = estimateProduction(company, buildings);
  const tier = isMe ? null : capitalTier(company.cash);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: isMe ? rgba(color, 0.07) : '#0a0b14',
      border: `1px solid ${isMe ? rgba(color, 0.35) : '#1a1d2e'}`,
      borderRadius: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: color, boxShadow: isMe ? `0 0 8px ${color}` : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 13,
          color: isMe ? '#e2e8f0' : '#9ca3af',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {company.name}{isMe && <span style={{ color, fontSize: 10, marginLeft: 6 }}>(Du)</span>}
        </div>
        <div style={{ fontSize: 10, color: '#3a3f5c', marginTop: 1 }}>
          {SECTOR_LABELS[company.primary_sector as Sector]}
        </div>
      </div>

      {/* Production estimate (range) */}
      {prod ? (
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#2d3155', marginBottom: 2 }}>OUTPUT/TICK</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
            ~{prod.low}–{prod.high}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: '#1e2138', flexShrink: 0 }}>Keine Gebäude</div>
      )}

      {/* Building count */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#2d3155', marginBottom: 2 }}>GEBÄUDE</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>
          {myBlds.length}
        </div>
      </div>

      {/* Capital tier (not exact — §11.3) */}
      {!isMe && tier && (
        <div style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 20, background: rgba(tier.color, 0.12),
          color: tier.color, flexShrink: 0, letterSpacing: '0.04em',
          border: `1px solid ${rgba(tier.color, 0.2)}`,
        }}>
          {tier.label}
        </div>
      )}
      {isMe && (
        <div style={{
          fontFamily: 'monospace', fontSize: 13, fontWeight: 700, flexShrink: 0,
          color: company.cash < 0 ? '#f87171' : '#10b981',
        }}>
          {company.cash.toLocaleString()} €
        </div>
      )}
      {company.insolvency_stage > 0 && (
        <div style={{ fontSize: 10, color: '#f87171', flexShrink: 0 }}>⚠ {company.insolvency_stage}</div>
      )}
    </div>
  );
}

function SectorShareBar({ sector, companies, buildings, myCompanyId }: {
  sector: Sector; companies: Company[]; buildings: Building[]; myCompanyId: string;
}) {
  const shares = companies
    .map(c => ({ c, share: estimateMarketShare(c, companies, buildings, sector) }))
    .filter(x => x.share > 0)
    .sort((a, b) => b.share - a.share);

  if (shares.length === 0) return null;
  const color = SECTOR_COLORS[sector];

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 10, color: '#4e5470', fontWeight: 700, letterSpacing: '0.06em' }}>
          {SECTOR_LABELS[sector].toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12 }}>
        {shares.map(({ c, share }) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 90, fontSize: 11, flexShrink: 0,
              color: c.id === myCompanyId ? '#e2e8f0' : '#6b7280',
              fontWeight: c.id === myCompanyId ? 700 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {c.id === myCompanyId && '▶ '}{c.name}
            </div>
            <div style={{ flex: 1, height: 4, background: '#0a0b14', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${share}%`,
                background: c.color,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ fontSize: 10, color: '#3a3f5c', width: 32, textAlign: 'right', fontFamily: 'monospace' }}>
              ~{share}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketSharePanel({ companies, buildings, market, myCompanyId }: Props) {
  const players = [...companies].filter(c => !c.is_bot).sort((a, b) => b.cash - a.cash);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Competitor overview */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 10 }}>
          FIRMEN
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {players.length === 0
            ? <div style={{ color: '#1e2138', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Noch keine Mitspieler</div>
            : players.map(c => (
              <CompetitorCard key={c.id} company={c} buildings={buildings} myCompanyId={myCompanyId} />
            ))}
        </div>
        <div style={{ fontSize: 9, color: '#1e2138', marginTop: 8 }}>
          Output-Schätzung ±35% · Kapitaltier = qualitativ · §11.2/11.3
        </div>
      </div>

      {/* Market share by sector */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 10 }}>
          MARKTANTEILE (geschätzt)
        </div>
        <div style={{
          background: '#07080d', border: '1px solid #1a1d2e', borderRadius: 14, padding: '14px 16px',
        }}>
          {SECTORS.map(s => (
            <SectorShareBar key={s} sector={s} companies={players} buildings={buildings} myCompanyId={myCompanyId} />
          ))}
          {players.length === 0 && (
            <div style={{ color: '#1e2138', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
              Kein Vergleich möglich
            </div>
          )}
        </div>
      </div>

      {/* Market prices */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 10 }}>
          AKTUELLE MARKTPREISE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {market.map(m => {
            const pct = m.base_price > 0 ? Math.round((m.price / m.base_price - 1) * 100) : 0;
            const c = SECTOR_COLORS[m.sector];
            return (
              <div key={m.sector} style={{
                background: rgba(c, 0.05), border: `1px solid ${rgba(c, 0.15)}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 10, color: '#4e5470' }}>{SECTOR_LABELS[m.sector]}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#e2e8f0' }}>
                  {m.price.toFixed(1)} €
                </div>
                <div style={{
                  fontSize: 10, fontFamily: 'monospace', marginTop: 2,
                  color: pct > 0 ? '#10b981' : pct < 0 ? '#f87171' : '#3a3f5c',
                }}>
                  {pct > 0 ? '+' : ''}{pct}% vs. Basis
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
