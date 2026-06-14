'use client';
import { useState } from 'react';
import Logo from './Logo';
import { SECTORS, SECTOR_LABELS, SECTOR_COLORS } from '@/types/game';

interface Props {
  onCreateNew: () => void;
  onRestored: (ownerId: string) => void;
}

export default function LoginScreen({ onCreateNew, onRestored }: Props) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState<string>('ENERGY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Bitte Firmennamen eingeben'); return; }
    setBusy(true); setError('');
    const ownerId = localStorage.getItem('ms_dev_uid') ?? 'dev';
    try {
      const r = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), primary_sector: sector, owner_id: ownerId }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Fehler'); setBusy(false); return; }
      onCreateNew();
    } catch { setError('Verbindungsfehler'); setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06070d', color: '#eef0f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={56} showText textSize={18} style={{ justifyContent: 'center' }} />
        </div>
        <div style={{ background: '#0d0f1a', borderRadius: 20, padding: 32,
          border: '1px solid #1a1d2e' }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Firma gründen</div>
          <div style={{ fontSize: 13, color: '#4e5470', marginBottom: 24 }}>
            Wähle einen Namen und deine Branche.
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>
              Firmenname
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="z.B. 'Muster GmbH'"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #1f2338',
                background: '#0a0b14', color: '#eef0f6', fontSize: 15, outline: 'none',
                boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>
              Branche
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SECTORS.map(s => (
                <button key={s} onClick={() => setSector(s)}
                  style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${sector === s ? SECTOR_COLORS[s] : '#1f2338'}`,
                    background: sector === s ? `${SECTOR_COLORS[s]}14` : '#0a0b14',
                    color: sector === s ? SECTOR_COLORS[s] : '#6b7280',
                    textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{s === 'ENERGY' ? '⚡' : s === 'RAW_MATERIALS' ? '⛏' : s === 'INDUSTRY' ? '🏭' : '🚚'}</span>
                  {SECTOR_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleCreate} disabled={busy}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Wird erstellt…' : 'Firma gründen →'}
          </button>
        </div>
      </div>
    </div>
  );
}