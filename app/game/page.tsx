'use client';
import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseReady } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';
import LoginScreen from '@/components/LoginScreen';
import Logo from '@/components/Logo';

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#06070d', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
        <Logo size={64} showText textSize={20} style={{ boxShadow: '0 0 56px rgba(99,102,241,0.5)' }} />
      </div>
      <div style={{ width: 24, height: 24, border: '2px solid #1a1d2e', borderTopColor: '#6366f1',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#2d3155', fontSize: 11, letterSpacing: '0.1em' }}>{label}</div>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      `}</style>
    </div>
  );
}

export default function GamePage() {
  const [userId, setUserId]         = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(true);
  const [noSupabase, setNoSupabase] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady()) { setNoSupabase(true); setLoading(false); return; }

    async function init() {
      try {
        // Check localStorage first (avoids RLS issues with anon key)
        const storedCompany = localStorage.getItem('ms_company');
        if (storedCompany) {
          const parsed = JSON.parse(storedCompany);
          setUserId(parsed.owner_id ?? 'dev');
          setHasCompany(true);
          setLoading(false);
          return;
        }
      } catch {}

      try {
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (user) { setUserId(user.id); }
      } catch {}

      let devId = '';
      try {
        devId = localStorage.getItem('ms_dev_uid') ?? '';
        if (!devId) {
          devId = crypto.randomUUID();
          localStorage.setItem('ms_dev_uid', devId);
        }
      } catch { devId = 'dev-user-fallback'; }

      setUserId(devId);
      setHasCompany(false);
      setLoading(false);
    }

    init().catch(() => { setHasCompany(false); setLoading(false); });
  }, []);

  if (loading) return <Spinner label="Verbinde…" />;

  if (noSupabase) {
    return (
      <div style={{ minHeight: '100vh', background: '#07080f', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, color: '#e2e8f0' }}>
        <Logo size={48} showText textSize={16} />
        <div style={{ background: 'rgba(120,80,20,0.08)', border: '1px solid rgba(180,120,30,0.2)',
          borderRadius: 16, padding: '20px 24px', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 8 }}>Supabase nicht konfiguriert</div>
          <div style={{ color: '#78716c', fontSize: 13, lineHeight: 1.6 }}>
            Setze <code style={{ background: '#1a1d2e', padding: '1px 5px', borderRadius: 4 }}>NEXT_PUBLIC_SUPABASE_URL</code>{' '}
            und <code style={{ background: '#1a1d2e', padding: '1px 5px', borderRadius: 4 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            in deiner <code style={{ background: '#1a1d2e', padding: '1px 5px', borderRadius: 4 }}>.env.local</code>.
          </div>
        </div>
        <a href="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>← Zurück</a>
      </div>
    );
  }

  if (!userId) return <Spinner label="Prüfe Session…" />;

  if (hasCompany === false) {
    return <LoginScreen onCreateNew={() => window.location.reload()} onRestored={() => {}} />;
  }

  if (hasCompany === null) return <Spinner label="Lade Firmendaten…" />;

  return <Dashboard userId={userId} />;
}