/**
 * Upgrade-System — alle Sektoren
 * Jedes Upgrade hat eine ID, Sektor, Kosten, Effekt und Voraussetzungen.
 * Effekte werden in getCompanyEffects() berechnet und in der UI angewandt.
 */

import type { Sector } from '@/types/game';

export type EffectType =
  | 'output_multiplier'    // Produktions-Output erhöhen
  | 'cost_reduction'       // Betriebskosten senken
  | 'storage_bonus'        // Lagerkapazität erhöhen
  | 'price_bonus'          // Verkaufspreis erhöhen
  | 'passive_income'       // Passives Einkommen pro Runde
  | 'unlock'               // Schaltet Feature frei
  | 'input_reduction';     // Weniger Inputmaterial nötig

export interface Upgrade {
  id: string;
  sector: Sector;
  label: string;
  desc: string;
  icon: string;
  baseCost: number;
  costPerLevel: number;     // zusätzliche Kosten pro Level (0 = kein Level-System)
  maxLevel: number;
  when: 'early' | 'mid' | 'late';
  requiresUpgrade?: string; // ID eines anderen Upgrades als Voraussetzung
  requiresBuildingType?: string;
  requiresBuildingLevel?: number;
  effect: {
    type: EffectType;
    valuePerLevel: number;  // Effekt-Stärke pro Level (z.B. 0.2 = 20%)
    label: string;          // z.B. "+20% Output"
  };
}

// ── ⚡ ENERGIE ────────────────────────────────────────────────────────────────

const ENERGY_UPGRADES: Upgrade[] = [
  {
    id: 'energy_efficiency',
    sector: 'ENERGY',
    label: 'Effizienz-Turbine',
    desc: 'Modernisiert den Betrieb — gleicher Strom-Output, aber 20% niedrigere Betriebskosten.',
    icon: '⚙',
    baseCost: 25000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'production',
    requiresBuildingLevel: 3,
    effect: { type: 'cost_reduction', valuePerLevel: 0.2, label: '-20% Betriebskosten' },
  },
  {
    id: 'smart_grid',
    sector: 'ENERGY',
    label: 'Smart Grid',
    desc: 'Intelligentes Stromnetz: verkauft automatisch teuer wenn Nachfrage hoch ist, wartet wenn sie niedrig ist.',
    icon: '🧠',
    baseCost: 40000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresUpgrade: 'energy_efficiency',
    effect: { type: 'price_bonus', valuePerLevel: 0.15, label: '+15% Erlös bei hoher Nachfrage' },
  },
  {
    id: 'grid_expansion',
    sector: 'ENERGY',
    label: 'Netz-Ausbau',
    desc: 'Erweitert dein Stromnetz auf einen zweiten Bezirk — du kannst dort Firmen direkt beliefern.',
    icon: '🔌',
    baseCost: 55000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresUpgrade: 'smart_grid',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Lieferung in 2. Bezirk möglich' },
  },
  {
    id: 'dual_contract',
    sector: 'ENERGY',
    label: 'Doppelvertrag',
    desc: 'Bediene zwei verschiedene Stadtverträge gleichzeitig statt nur einen.',
    icon: '📜',
    baseCost: 35000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresBuildingType: 'production',
    requiresBuildingLevel: 4,
    effect: { type: 'unlock', valuePerLevel: 1, label: '2 Stadtverträge gleichzeitig' },
  },
  {
    id: 'battery_upgrade',
    sector: 'ENERGY',
    label: 'Stromspeicher-Ausbau',
    desc: 'Größerer Puffer — weniger Preisverfall wenn Überproduktion entsteht.',
    icon: '🔋',
    baseCost: 12000,
    costPerLevel: 8000,
    maxLevel: 4,
    when: 'early',
    requiresBuildingType: 'storage',
    effect: { type: 'storage_bonus', valuePerLevel: 2000, label: '+2.000 Kapazität pro Level' },
  },
];

// ── ⬡ ROHSTOFFE ───────────────────────────────────────────────────────────────

const RAW_MATERIAL_UPGRADES: Upgrade[] = [
  {
    id: 'deep_drilling',
    sector: 'RAW_MATERIALS',
    label: 'Tiefenbohrung',
    desc: 'Schaltet Tiefenbohrung frei — 200 Einh./Min statt 80. Braucht Bergwerk Level 3.',
    icon: '⛏',
    baseCost: 50000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'production',
    requiresBuildingLevel: 3,
    effect: { type: 'output_multiplier', valuePerLevel: 1.5, label: '+150% Output (Tiefenbohrung)' },
  },
  {
    id: 'refinery_upgrade',
    sector: 'RAW_MATERIALS',
    label: 'Veredelungsprozess',
    desc: 'Upgrade für die Verarbeitungsanlage: Rohstoffwert +70% statt +40%.',
    icon: '✨',
    baseCost: 30000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'logistics_hub',
    effect: { type: 'price_bonus', valuePerLevel: 0.3, label: '+30% Veredelungsbonus (70% total)' },
  },
  {
    id: 'mining_efficiency',
    sector: 'RAW_MATERIALS',
    label: 'Förderoptimierung',
    desc: 'Bergwerke verbrauchen 30% weniger Strom — senkt die Betriebskosten merklich.',
    icon: '💡',
    baseCost: 20000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'early',
    requiresBuildingType: 'production',
    requiresBuildingLevel: 2,
    effect: { type: 'input_reduction', valuePerLevel: 0.3, label: '-30% Stromverbrauch' },
  },
  {
    id: 'auto_reorder',
    sector: 'RAW_MATERIALS',
    label: 'Auto-Nachbestellung',
    desc: 'Lager bestellt automatisch Strom nach wenn der Vorrat unter 30% fällt — zu deinem Maximalpreis.',
    icon: '🔄',
    baseCost: 35000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Auto-Einkauf bei niedrigem Lagerstand' },
  },
  {
    id: 'exclusive_license',
    sector: 'RAW_MATERIALS',
    label: 'Exklusiv-Lizenz',
    desc: 'Sperrt einen zweiten Förderplatz in einem anderen Bezirk — nur du darfst dort bauen.',
    icon: '🔑',
    baseCost: 60000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresUpgrade: 'deep_drilling',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Exklusiver Förderplatz in 2. Bezirk' },
  },
  {
    id: 'storage_expansion',
    sector: 'RAW_MATERIALS',
    label: 'Lager-Erweiterung',
    desc: 'Größeres Rohstofflager — kannst mehr auf Vorrat halten und günstiger in Mengen kaufen.',
    icon: '📦',
    baseCost: 10000,
    costPerLevel: 6000,
    maxLevel: 4,
    when: 'early',
    requiresBuildingType: 'storage',
    effect: { type: 'storage_bonus', valuePerLevel: 3000, label: '+3.000 Kapazität pro Level' },
  },
];

// ── ◈ INDUSTRIE ───────────────────────────────────────────────────────────────

const INDUSTRY_UPGRADES: Upgrade[] = [
  {
    id: 'automation',
    sector: 'INDUSTRY',
    label: 'Automatisierung',
    desc: 'Alle Qualitätsstufen brauchen 15% weniger Eingangsmaterial — spart bei teuren Rohstoffen.',
    icon: '🤖',
    baseCost: 45000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'logistics_hub',
    effect: { type: 'input_reduction', valuePerLevel: 0.15, label: '-15% Inputbedarf' },
  },
  {
    id: 'fast_production',
    sector: 'INDUSTRY',
    label: 'Schnellproduktion',
    desc: '+30% Produktionsrate, aber fällt automatisch eine Qualitätsstufe zurück. Gut für Menge statt Marge.',
    icon: '⚡',
    baseCost: 20000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'early',
    requiresBuildingType: 'production',
    requiresBuildingLevel: 2,
    effect: { type: 'output_multiplier', valuePerLevel: 0.3, label: '+30% Output (-1 Qualitätsstufe)' },
  },
  {
    id: 'supply_chain_integration',
    sector: 'INDUSTRY',
    label: 'Lieferketten-Integration',
    desc: 'Kauft Rohstoffe automatisch vom Handelsplatz wenn Lager unter 30% — zu deinem konfigurierten Maximalpreis.',
    icon: '🔗',
    baseCost: 40000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Auto-Einkauf bei niedrigem Input-Lager' },
  },
  {
    id: 'buffer_expansion',
    sector: 'INDUSTRY',
    label: 'Materialpuffer-Ausbau',
    desc: 'Größeres Eingangslager — überbrückt Lieferausfälle von Rohstoff-Firmen länger.',
    icon: '🗄',
    baseCost: 8000,
    costPerLevel: 6000,
    maxLevel: 4,
    when: 'early',
    requiresBuildingType: 'storage',
    effect: { type: 'storage_bonus', valuePerLevel: 2500, label: '+2.500 Input-Kapazität pro Level' },
  },
  {
    id: 'quality_boost',
    sector: 'INDUSTRY',
    label: 'Qualitäts-Optimierung',
    desc: 'Stufe 2 und 3 Waren sind 10% mehr wert — bei hohem Verkaufsvolumen sehr lukrativ.',
    icon: '⭐',
    baseCost: 35000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'retail',
    effect: { type: 'price_bonus', valuePerLevel: 0.1, label: '+10% Preis auf Stufe 2/3 Waren' },
  },
];

// ── ⇌ LOGISTIK ────────────────────────────────────────────────────────────────

const LOGISTICS_UPGRADES: Upgrade[] = [
  {
    id: 'route_optimization',
    sector: 'LOGISTICS',
    label: 'Routenoptimierung',
    desc: 'Transaktionen zwischen Spielern in deinem Bezirk laufen 20% schneller ab — mehr Durchsatz, mehr Einnahmen.',
    icon: '🗺',
    baseCost: 30000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'logistics_hub',
    requiresBuildingLevel: 2,
    effect: { type: 'output_multiplier', valuePerLevel: 0.2, label: '+20% Transaktionsdurchsatz' },
  },
  {
    id: 'express_service',
    sector: 'LOGISTICS',
    label: 'Expressdienst',
    desc: 'Spieler können gegen Aufpreis garantierte sofortige Lieferung buchen — Premiumservice.',
    icon: '🚀',
    baseCost: 50000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresUpgrade: 'route_optimization',
    effect: { type: 'passive_income', valuePerLevel: 200, label: '+200 €/Min durch Express-Aufträge' },
  },
  {
    id: 'hub_network',
    sector: 'LOGISTICS',
    label: 'Hub-Netzwerk',
    desc: 'Verbindet zwei Verteilzentren in verschiedenen Bezirken — passives Einkommen aus beiden gleichzeitig.',
    icon: '🏗',
    baseCost: 65000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresUpgrade: 'express_service',
    effect: { type: 'passive_income', valuePerLevel: 500, label: '+500 €/Min aus Netzwerk-Effekt' },
  },
  {
    id: 'cold_chain',
    sector: 'LOGISTICS',
    label: 'Kühlkette',
    desc: 'Ermöglicht Lagerung und Transport von verderblichen Waren — erschließt neuen Produkttyp.',
    icon: '❄',
    baseCost: 35000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'storage',
    requiresBuildingLevel: 2,
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Verderbliche Waren handelbar' },
  },
  {
    id: 'storage_rental',
    sector: 'LOGISTICS',
    label: 'Lagerhaus-Ausbau',
    desc: 'Mehr Lagerkapazität die du an andere Firmen vermieten kannst — passives Einkommen.',
    icon: '🏪',
    baseCost: 10000,
    costPerLevel: 8000,
    maxLevel: 4,
    when: 'early',
    requiresBuildingType: 'storage',
    effect: { type: 'passive_income', valuePerLevel: 150, label: '+150 €/Min Mieteinnahmen pro Level' },
  },
  {
    id: 'city_exclusive',
    sector: 'LOGISTICS',
    label: 'City-Exklusivvertrag',
    desc: 'Alle städtischen Transporte laufen über dich — fixes Stadtentgelt unabhängig vom Spielermarkt.',
    icon: '📮',
    baseCost: 80000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresUpgrade: 'hub_network',
    effect: { type: 'passive_income', valuePerLevel: 1000, label: '+1.000 €/Min Stadtentgelt' },
  },
];

// ── ◎ HANDEL ──────────────────────────────────────────────────────────────────

const TRADE_UPGRADES: Upgrade[] = [
  {
    id: 'premium_range',
    sector: 'INDUSTRY',
    label: 'Premium-Sortiment',
    desc: 'Erlaubt Verkauf von Industrie Stufe 3 Waren an die Stadt — Stadtpreis fast verdoppelt.',
    icon: '💎',
    baseCost: 45000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresBuildingType: 'retail',
    requiresBuildingLevel: 3,
    effect: { type: 'price_bonus', valuePerLevel: 0.8, label: '+80% Preis für Stufe 3 Waren' },
  },
  {
    id: 'loyalty_program',
    sector: 'INDUSTRY',
    label: 'Kundenbindung',
    desc: 'Jede Runde voller Belieferung gibt +1% Dauerbonus auf Stadtpreise (max. +30%).',
    icon: '❤',
    baseCost: 25000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'early',
    requiresBuildingType: 'retail',
    effect: { type: 'price_bonus', valuePerLevel: 0.3, label: 'Bis +30% Stadtpreis durch Treue' },
  },
  {
    id: 'online_shop',
    sector: 'INDUSTRY',
    label: 'Online-Shop',
    desc: 'Dein Einzelhandel verkauft in allen Bezirken gleichzeitig — kein physischer Standort nötig.',
    icon: '💻',
    baseCost: 55000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    requiresUpgrade: 'loyalty_program',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Stadtweiter Verkauf aus einem Standort' },
  },
  {
    id: 'franchise',
    sector: 'INDUSTRY',
    label: 'Franchise',
    desc: 'Kleiner Zweigbetrieb in einem fremden Bezirk — Einkommen ohne Hauptgebäude dort.',
    icon: '🏬',
    baseCost: 70000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'late',
    requiresUpgrade: 'online_shop',
    effect: { type: 'passive_income', valuePerLevel: 800, label: '+800 €/Min aus Franchise-Betrieb' },
  },
  {
    id: 'warehouse_upgrade',
    sector: 'INDUSTRY',
    label: 'Warenlager-Ausbau',
    desc: 'Mehr Puffer — kaufe günstiger in großen Mengen und verkaufe zu Spitzenzeiten teurer.',
    icon: '📦',
    baseCost: 8000,
    costPerLevel: 5000,
    maxLevel: 4,
    when: 'early',
    requiresBuildingType: 'storage',
    effect: { type: 'storage_bonus', valuePerLevel: 2000, label: '+2.000 Waren-Kapazität pro Level' },
  },
  {
    id: 'buying_pool',
    sector: 'INDUSTRY',
    label: 'Einkaufsverbund',
    desc: 'Schließe dich mit anderen Handelsfirmen zusammen — alle bekommen -15% auf Wareneinkauf.',
    icon: '🤝',
    baseCost: 40000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    effect: { type: 'input_reduction', valuePerLevel: 0.15, label: '-15% Einkaufskosten für Waren' },
  },
  {
    id: 'marketplace_priority',
    sector: 'INDUSTRY',
    label: 'Marktplatz-Priorität',
    desc: 'Deine öffentlichen Angebote erscheinen immer oben im Handelsplatz — mehr Sichtbarkeit, mehr Käufer.',
    icon: '📌',
    baseCost: 20000,
    costPerLevel: 0,
    maxLevel: 1,
    when: 'mid',
    effect: { type: 'unlock', valuePerLevel: 1, label: 'Angebote immer ganz oben sichtbar' },
  },
];

// ── Export ─────────────────────────────────────────────────────────────────────

export const ALL_UPGRADES: Upgrade[] = [
  ...ENERGY_UPGRADES,
  ...RAW_MATERIAL_UPGRADES,
  ...INDUSTRY_UPGRADES,
  ...LOGISTICS_UPGRADES,
  ...TRADE_UPGRADES,
];

export function getUpgradesForSector(sector: Sector): Upgrade[] {
  return ALL_UPGRADES.filter(u => u.sector === sector);
}

export function getUpgradeById(id: string): Upgrade | undefined {
  return ALL_UPGRADES.find(u => u.id === id);
}

// ── Effekt-Berechnung ─────────────────────────────────────────────────────────

export interface CompanyEffects {
  outputMultiplier: number;      // 1.0 = kein Bonus
  costReduction: number;         // 0.0 = keine Reduktion
  storageBonus: number;          // absolute Einheiten
  priceBonus: number;            // 0.0 = kein Bonus
  passiveIncomePerMin: number;   // € pro Minute
  unlockedFeatures: string[];    // IDs freigeschalteter Features
  inputReduction: number;        // 0.0 = keine Reduktion
}

export interface OwnedUpgrade {
  upgrade_id: string;
  level: number;
}

export function computeEffects(ownedUpgrades: OwnedUpgrade[]): CompanyEffects {
  const effects: CompanyEffects = {
    outputMultiplier: 1.0,
    costReduction: 0,
    storageBonus: 0,
    priceBonus: 0,
    passiveIncomePerMin: 0,
    unlockedFeatures: [],
    inputReduction: 0,
  };

  for (const owned of ownedUpgrades) {
    const upg = getUpgradeById(owned.upgrade_id);
    if (!upg) continue;
    const val = upg.effect.valuePerLevel * owned.level;

    switch (upg.effect.type) {
      case 'output_multiplier': effects.outputMultiplier += val; break;
      case 'cost_reduction':    effects.costReduction    += val; break;
      case 'storage_bonus':     effects.storageBonus     += val; break;
      case 'price_bonus':       effects.priceBonus       += val; break;
      case 'passive_income':    effects.passiveIncomePerMin += val; break;
      case 'input_reduction':   effects.inputReduction   += val; break;
      case 'unlock':            effects.unlockedFeatures.push(owned.upgrade_id); break;
    }
  }

  return effects;
}
