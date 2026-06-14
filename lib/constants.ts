/**
 * Gemeinsame Spielkonstanten — einzige Quelle der Wahrheit.
 * Vorher 4 Kopien in Dashboard, game-engine, reports, takeover.
 */

export const BUILDING_BASE_COST: Record<string, number> = {
  production:    15000,
  storage:       8000,
  logistics_hub: 12000,
  retail:        10000,
};

export const DISTRICT_MULTIPLIER: Record<string, number> = {
  center:     1.0,
  industrial: 1.1,
  outskirts:  0.7,
  trade:      1.4,
  energy:     1.3,
};

/**
 * Slot-Konfiguration pro Bezirk: wie viele Gebäude welchen Typs erlaubt sind.
 * Quelle der Wahrheit für Map-Visualisierung UND Backend-Validierung.
 *
 *  center     = Hafenviertel     · Logistik   (5× Logistik, 3× Lager)
 *  outskirts  = Minenviertel     · Rohstoffe  (5× Produktion, 3× Lager)
 *  industrial = Fabrikviertel    · Fertigung  (5× Produktion, 3× Lager)
 *  energy     = Kraftwerksviertel · Energie    (5× Produktion, 3× Lager)
 *  trade      = Marktplatz       · neutral    (4× Handel, 2× Lager, 2× Produktion)
 */
// Bauplätze je Viertel (rein optisch — gebaut wird immer das Sektor-Gebäude).
// Jedes Sektor-Viertel führt mit dem passenden Bautyp, Marktplatz ist gemischt.
export const DISTRICT_SLOT_CONFIG: Record<string, Partial<Record<string, number>>> = {
  center:     { logistics_hub: 5, storage: 3 },  // Hafenviertel · Logistik
  outskirts:  { production: 5, storage: 3 },     // Minenviertel · Rohstoffe
  industrial: { production: 5, storage: 3 },     // Fabrikviertel · Fertigung
  energy:     { production: 5, storage: 3 },     // Kraftwerksviertel · Energie
  trade:      { retail: 4, storage: 2, production: 2 }, // Marktplatz · neutral
};

/** Maximale Gebäude einer Firma pro Viertel (Anti-Monopol) */
export const MAX_BUILDINGS_PER_COMPANY_PER_DISTRICT = 2;

/** Maximale Gebäude einer Firma gesamt (Balance für 10 Spieler) */
export const MAX_BUILDINGS_PER_COMPANY_TOTAL = 4;

/** Nettowert einer Firma = Cash + 70% Buchwert aller Gebäude */
export function calcNetWorth(
  cash: number,
  buildings: { type: string; level?: number }[],
): number {
  const buildingValue = buildings.reduce(
    (sum, b) => sum + (BUILDING_BASE_COST[b.type] ?? 10000) * (b.level ?? 1) * 0.7,
    0,
  );
  return Math.round(cash + buildingValue);
}
