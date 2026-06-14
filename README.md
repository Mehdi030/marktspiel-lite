# Marktspiel Lite

Vereinfachte, kooperative Wirtschaftssimulation. Baue gemeinsam mit Freunden eine Stadt auf.

## Konzept

- **Kooperativ**: Kein Schaden untereinander — Welpenschutz in der Stadt
- **Stadt-Wachstum**: Gemeinsame Produktion lässt die Stadt wachsen
- **Boni**: Größere Stadt = bessere Preise, mehr Produktion, niedrigere Kosten
- **Expansion**: Später kann in die weite Welt expandiert werden

## Setup

1. `npm install`
2. Supabase Projekt erstellen (https://supabase.com)
3. `.env.local` anpassen mit Supabase Credentials
4. `supabase/schema.sql` im Supabase SQL Editor ausführen
5. `npm run dev`

## Sektoren

| Sektor | Produziert | Braucht |
|--------|-----------|---------|
| Energie | Strom | Rohstoffe |
| Rohstoffe | Material | Energie, Logistik |
| Fertigung | Güter | Rohstoffe, Energie |
| Logistik | Transport | Güter, Energie |

## Technik

Next.js 16 + React 19 · Supabase · Tailwind CSS v4 · Recharts