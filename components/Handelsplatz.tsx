'use client';
import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Company, Sector } from '@/types/game';
import { SECTOR_LABELS, SECTOR_COLORS, SECTORS } from '@/types/game';

interface Listing {
  id: string;
  seller_id: string;
  sector: Sector;
  quantity: number;
  price_per_unit: number;
  min_order: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
}

interface Props {
  myCompany: Company;
  allCompanies: Company[];
  onToast: (msg: string) => void;
}

export default function Handelsplatz({ myCompany, allCompanies, onToast }: Props) {
  const [listings, setListings]           = useState<Listing[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [sectorFilter, setSectorFilter]   = useState<Sector | 'all'>('all');
  const [buyQty, setBuyQty]               = useState<Record<string, number>>({});

  // Create form state
  const [form, setForm] = useState({
    sector: 'ENERGY' as Sector,
    quantity: 100,
    price_per_unit: 100,
    min_order: 10,
    notes: '',
    hours: 24,
  });
  const [creating, setCreating] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from('market_listings')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .gt('quantity', 0)
      .order('created_at', { ascending: false });
    setListings(data ?? []);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Realtime: neue Angebote sofort anzeigen
  useEffect(() => {
    const ch = sb.channel('market-listings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings' }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const companyMap = Object.fromEntries(allCompanies.map(c => [c.id, c]));

  async function buy(listing: Listing, qty: number) {
    if (qty < listing.min_order) {
      onToast(`Mindestbestellmenge: ${listing.min_order} Einh.`);
      return;
    }
    if (qty > listing.quantity) {
      onToast(`Nur ${listing.quantity} Einheiten verfügbar`);
      return;
    }
    const total = qty * listing.price_per_unit;
    if (myCompany.cash < total) {
      onToast(`Nicht genug Kapital — benötigt ${total.toLocaleString()} €`);
      return;
    }
    const { error } = await sb.rpc('buy_market_listing', {
      p_listing_id:  listing.id,
      p_buyer_id:    myCompany.id,
      p_quantity:    qty,
    });
    if (error) {
      onToast('Fehler beim Kauf: ' + error.message);
    } else {
      onToast(`✓ ${qty} × ${SECTOR_LABELS[listing.sector]} gekauft — ${total.toLocaleString()} €`);
      load();
    }
  }

  async function createListing() {
    setCreating(true);
    const expires = new Date(Date.now() + form.hours * 3_600_000).toISOString();
    const { error } = await sb.from('market_listings').insert({
      seller_id:      myCompany.id,
      sector:         form.sector,
      quantity:       form.quantity,
      price_per_unit: form.price_per_unit,
      min_order:      form.min_order,
      notes:          form.notes || null,
      expires_at:     expires,
    });
    setCreating(false);
    if (error) {
      onToast('Fehler: ' + error.message);
    } else {
      onToast('✓ Angebot eingestellt');
      setShowCreate(false);
      load();
    }
  }

  async function deleteListing(id: string) {
    await sb.from('market_listings').delete().eq('id', id);
    onToast('Angebot entfernt');
    load();
  }

  const visible = sectorFilter === 'all'
    ? listings
    : listings.filter(l => l.sector === sectorFilter);

  const myListings  = visible.filter(l => l.seller_id === myCompany.id);
  const otherListings = visible.filter(l => l.seller_id !== myCompany.id);

  const inp: React.CSSProperties = {
    width: '100%', background: '#07080d', border: '1px solid #1c1f30',
    borderRadius: 10, padding: '8px 12px', color: '#eef0f6', fontSize: 12,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  function timeLeft(expires: string) {
    const diff = new Date(expires).getTime() - Date.now();
    if (diff <= 0) return 'Abgelaufen';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#818cf8', letterSpacing: '0.08em',
        }}>
          👥 SPIELER-MARKTPLATZ
        </div>
        <div style={{ fontSize: 11, color: '#4e5470' }}>
          Öffentliche Angebote — sofort kaufen ohne Gespräch
        </div>
        <button onClick={() => setShowCreate(s => !s)} style={{
          marginLeft: 'auto', padding: '6px 14px', borderRadius: 10,
          background: showCreate ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {showCreate ? '✕ Schließen' : '+ Angebot erstellen'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          background: '#08090f', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: 18,
          display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.2s ease',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#eef0f6' }}>Neues Angebot</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>SEKTOR</div>
              <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value as Sector }))} style={{ ...inp, cursor: 'pointer' }}>
                {SECTORS.map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>MENGE (EINH.)</div>
              <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>PREIS / EINHEIT (€)</div>
              <input type="number" min={1} value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: +e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>MINDESTBESTELLUNG</div>
              <input type="number" min={1} value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: +e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>LÄUFT AB NACH (STD)</div>
              <input type="number" min={1} max={168} value={form.hours} onChange={e => setForm(f => ({ ...f, hours: +e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#3a3f5c', marginBottom: 4, letterSpacing: '0.08em' }}>NOTIZ (OPTIONAL)</div>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. Tausch möglich" style={inp} />
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', gap: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid #1c1f30', fontSize: 11 }}>
            <div>
              <div style={{ color: '#282c44', marginBottom: 2 }}>GESAMTWERT</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                {(form.quantity * form.price_per_unit).toLocaleString()} €
              </div>
            </div>
            <div>
              <div style={{ color: '#282c44', marginBottom: 2 }}>SEKTOR</div>
              <div style={{ fontWeight: 700, color: SECTOR_COLORS[form.sector] }}>{SECTOR_LABELS[form.sector]}</div>
            </div>
            <div>
              <div style={{ color: '#282c44', marginBottom: 2 }}>LÄUFT AB</div>
              <div style={{ color: '#6b7280' }}>in {form.hours}h</div>
            </div>
          </div>

          <button onClick={createListing} disabled={creating} style={{
            padding: '11px 0', borderRadius: 12, border: '1px solid rgba(99,102,241,0.4)',
            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
            fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {creating ? 'Wird eingestellt…' : '📋 Angebot öffentlich einstellen'}
          </button>
        </div>
      )}

      {/* Sektor-Filter */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button onClick={() => setSectorFilter('all')} style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
          border: `1px solid ${sectorFilter === 'all' ? 'rgba(99,102,241,0.5)' : '#1c1f30'}`,
          background: sectorFilter === 'all' ? 'rgba(99,102,241,0.12)' : 'transparent',
          color: sectorFilter === 'all' ? '#eef0f6' : '#4e5470',
          fontFamily: 'inherit',
        }}>ALLE</button>
        {SECTORS.map(s => {
          const on = sectorFilter === s;
          const sc = SECTOR_COLORS[s];
          return (
            <button key={s} onClick={() => setSectorFilter(on ? 'all' : s)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${on ? sc + '60' : '#1c1f30'}`,
              background: on ? sc + '18' : 'transparent',
              color: on ? sc : '#4e5470', fontFamily: 'inherit',
            }}>{SECTOR_LABELS[s]}</button>
          );
        })}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#282c44', fontSize: 13 }}>
          Lade Angebote…
        </div>
      )}

      {/* Meine Angebote */}
      {myListings.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 8, fontWeight: 700 }}>
            MEINE ANGEBOTE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myListings.map(l => (
              <ListingCard key={l.id} listing={l} isOwn
                seller={myCompany}
                timeLeft={timeLeft(l.expires_at)}
                onDelete={() => deleteListing(l.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Angebote anderer Spieler */}
      {!loading && otherListings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#282c44' }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📋</div>
          <div style={{ fontSize: 13 }}>Keine Spieler-Angebote</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Erstelle ein Angebot oder warte auf andere Spieler
          </div>
        </div>
      )}

      {otherListings.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#3a3f5c', marginBottom: 8, fontWeight: 700 }}>
            ANGEBOTE VON SPIELERN ({otherListings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherListings.map(l => {
              const seller = companyMap[l.seller_id];
              const qtyKey = l.id;
              const qty    = buyQty[qtyKey] ?? l.min_order;
              return (
                <ListingCard key={l.id} listing={l} isOwn={false}
                  seller={seller}
                  timeLeft={timeLeft(l.expires_at)}
                  buyQty={qty}
                  onBuyQtyChange={(q) => setBuyQty(prev => ({ ...prev, [qtyKey]: q }))}
                  onBuy={() => buy(l, qty)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({ listing, isOwn, seller, timeLeft, onDelete, buyQty, onBuyQtyChange, onBuy }: {
  listing: Listing;
  isOwn: boolean;
  seller: Company | undefined;
  timeLeft: string;
  onDelete?: () => void;
  buyQty?: number;
  onBuyQtyChange?: (q: number) => void;
  onBuy?: () => void;
}) {
  const sc    = SECTOR_COLORS[listing.sector];
  const total = (buyQty ?? listing.min_order) * listing.price_per_unit;

  return (
    <div style={{
      background: '#08090f', border: `1px solid ${sc}20`, borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${sc}80, transparent)` }} />
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Sektor-Dot + Firma */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 6px ${sc}` }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: sc }}>{SECTOR_LABELS[listing.sector]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {seller && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: seller.color }} />
              )}
              <span style={{ fontSize: 10, color: '#4e5470' }}>{seller?.name ?? 'Unbekannt'}</span>
              {isOwn && (
                <span style={{ fontSize: 9, color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: 6, fontWeight: 700 }}>
                  DU
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mengen & Preis */}
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>
          <div>
            <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', marginBottom: 2 }}>VERFÜGBAR</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: '#eef0f6' }}>
              {listing.quantity.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', marginBottom: 2 }}>PREIS / EINH.</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>
              {listing.price_per_unit} €
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', marginBottom: 2 }}>MINDEST</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>
              {listing.min_order} Einh.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#282c44', letterSpacing: '0.08em', marginBottom: 2 }}>LÄUFT AB</div>
            <div style={{ fontSize: 11, color: '#4e5470' }}>{timeLeft}</div>
          </div>
        </div>

        {listing.notes && (
          <div style={{ width: '100%', fontSize: 10, color: '#4e5470', fontStyle: 'italic', paddingTop: 4 }}>
            💬 {listing.notes}
          </div>
        )}

        {/* Kauf-Controls */}
        {!isOwn && onBuy && onBuyQtyChange && buyQty !== undefined && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <input
              type="number" min={listing.min_order} max={listing.quantity}
              value={buyQty}
              onChange={e => onBuyQtyChange(Math.max(listing.min_order, Math.min(listing.quantity, +e.target.value)))}
              style={{
                width: 70, background: '#07080d', border: '1px solid #1c1f30',
                borderRadius: 8, padding: '6px 8px', color: '#eef0f6', fontSize: 12,
                textAlign: 'center', fontFamily: 'monospace', outline: 'none',
              }}
            />
            <button onClick={onBuy} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
              color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}>
              Kaufen · {total.toLocaleString()} €
            </button>
          </div>
        )}

        {/* Eigenes Angebot löschen */}
        {isOwn && onDelete && (
          <button onClick={onDelete} style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #1c1f30',
            background: 'transparent', color: '#3a3f5c', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ✕ Zurückziehen
          </button>
        )}
      </div>
    </div>
  );
}
