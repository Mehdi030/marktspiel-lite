'use client';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const C1 = '#6366f1';
const C2 = '#f59e0b';

const PILLARS = [
  {
    icon: '⛓',
    label: 'Lieferkette',
    text: 'Energie → Rohstoffe → Industrie → Logistik',
    detail: 'Jeder Sektor braucht den anderen. Baue eine Produktionskette auf und beherrsche den Markt.',
    color: '#06b6d4',
  },
  {
    icon: '🏭',
    label: 'Produktion & Gebäude',
    text: 'Baue Fabriken, Lager und Logistikzentren',
    detail: 'Errichte Gebäude in verschiedenen Bezirken, produziere Waren und optimiere deine Abläufe.',
    color: '#fbbf24',
  },
  {
    icon: '📈',
    label: 'Dynamischer Markt',
    text: 'Angebot und Nachfrage bestimmen die Preise',
    detail: 'Die Marktpreise reagieren auf Produktion und Verbrauch. Verkaufe teuer, kaufe günstig.',
    color: '#a78bfa',
  },
  {
    icon: '💰',
    label: 'Wachstum & Upgrades',
    text: 'Investiere Gewinne in Upgrades',
    detail: 'Verbessere deine Produktion, senke Kosten und werde zum Marktführer in deiner Branche.',
    color: '#f87171',
  },
];

export default function Landing() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh', background: '#06070d', color: '#eef0f6',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
    }}>

      {/* ── Atmosphäre ──────────────────────────────────────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '65%', height: '70%',
          background: `radial-gradient(ellipse, ${C1}18 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', bottom: '-25%', right: '-10%', width: '60%', height: '65%',
          background: `radial-gradient(ellipse, ${C2}12 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: '40%', height: '40%',
          background: `radial-gradient(ellipse, #7c3aed0a 0%, transparent 60%)` }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', zIndex: 1, padding: '28px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={44} showText textSize={18} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          
          <button onClick={() => router.push('/game')} style={{
            padding: '10px 28px', borderRadius: 12, border: `1px solid ${C1}55`,
            background: `${C1}14`, color: '#818cf8',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C1}28`; e.currentTarget.style.borderColor = `${C1}99`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${C1}14`; e.currentTarget.style.borderColor = `${C1}55`; }}>
            Spielen →
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px 60px', textAlign: 'center' }}>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(52px, 7vw, 96px)', fontWeight: 900,
          lineHeight: 0.90, letterSpacing: '-0.04em', margin: '0 0 28px',
          maxWidth: 900 }}>
          <span style={{
            background: 'linear-gradient(130deg, #ffffff 20%, #c4c6de 60%, #9a9dc8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            display: 'block', marginBottom: 8,
          }}>
            Baue eine Firma.
          </span>
          <span style={{
            background: `linear-gradient(130deg, ${C1} 0%, #818cf8 40%, ${C2} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            display: 'block',
          }}>
            Beherrsche den Markt.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: '#4e5470',
          lineHeight: 1.65, maxWidth: 600, margin: '0 0 56px' }}>
          Einfache Wirtschaftssimulation: produziere Waren, handle am Markt,
          baue deine Firma auf — allein oder gegen andere.
        </p>

        {/* CTA */}
        <button onClick={() => router.push('/game')} style={{
          padding: '18px 56px', borderRadius: 16, border: 'none',
          background: `linear-gradient(135deg, ${C1} 0%, #7c3aed 50%, ${C2} 100%)`,
          color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '0.02em',
          cursor: 'pointer',
          boxShadow: `0 0 48px ${C1}55, 0 8px 32px rgba(0,0,0,0.5)`,
          transition: 'all 0.25s', marginBottom: 72,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 64px ${C1}70, 0 12px 40px rgba(0,0,0,0.6)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 48px ${C1}55, 0 8px 32px rgba(0,0,0,0.5)`; }}>
          Jetzt spielen →
        </button>

        {/* Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 18, width: '100%', maxWidth: 1180,
        }}>
          {PILLARS.map(p => (
            <div key={p.label} style={{
              background: `linear-gradient(135deg, #0a0b14 0%, ${p.color}08 100%)`,
              border: `1px solid ${p.color}22`,
              borderRadius: 20, padding: '28px 28px',
              textAlign: 'left',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.color}50`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.color}22`; e.currentTarget.style.transform = 'none'; }}>

              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0, marginBottom: 18,
                background: `${p.color}14`, border: `1px solid ${p.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {p.icon}
              </div>

              <div style={{ fontSize: 17, fontWeight: 800, color: '#eef0f6', marginBottom: 6,
                letterSpacing: '-0.01em' }}>
                {p.label}
              </div>
              <div style={{ fontSize: 13, color: p.color, fontWeight: 600, marginBottom: 10 }}>
                {p.text}
              </div>
              <div style={{ fontSize: 13, color: '#3a3f5c', lineHeight: 1.6 }}>
                {p.detail}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ position: 'relative', zIndex: 1, textAlign: 'center',
        padding: '20px', borderTop: '1px solid #0d0f1a' }}>
        <span style={{ fontSize: 10, color: '#1e2138', letterSpacing: '0.12em' }}>
          MARKTSPIEL LITE · WIRTSCHAFTSSIMULATION
        </span>
      </footer>

      <style>{`
        @media (max-width: 600px) {
          h1 { font-size: clamp(40px, 10vw, 52px) !important; }
        }
      `}</style>
    </div>
  );
}
