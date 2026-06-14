# Marktspiel Lite — Agent Instructions

## Cooperative City-Building Wirtschaftssimulation

Marktspiel Lite ist eine vereinfachte, kooperative Version von Marktspiel.

### Konzept
- Spieler bauen **gemeinsam** eine Stadt auf
- Jeder Spieler wählt einen Sektor (ENERGY, RAW_MATERIALS, INDUSTRY, LOGISTICS)
- **Kein Friendly Fire** — keine Kriege, keine Marktmanipulation, keine feindlichen Übernahmen
- Die Stadt wächst durch die gemeinsame Produktion aller Spieler
- Höheres Stadt-Level = bessere Boni für alle (Preise, Produktion, günstigere Baukosten)

### Architektur
- Next.js 16 App Router
- Supabase (PostgreSQL)
- Tick-basierte Spiel-Engine (alle 30s)
- Recharts für Charts

### Kern-Mechaniken
1. **Produktion**: Gebäude produzieren Waren ihres Sektors
2. **Input-Abhängigkeiten**: Jeder Sektor braucht Input von anderen Sektoren
3. **Markt**: Dynamische Preisbildung durch Angebot/Nachfrage
4. **Stadt-Wachstum**: Gesamtproduktion aller Spieler treibt Stadt-Level
5. **Gebäude bauen**: In verschiedenen Bezirken mit Slot-Limits
6. **Upgrades**: Sektor-spezifische Verbesserungen

### Wichtige Regeln
- KEINE bösartigen imports aus dem Hauptprojekt verwenden
- Das Spiel bleibt kooperativ — keine PvP-Mechaniken
- Bei Fragen die Dokumentation in node_modules/next/dist/docs/ lesen