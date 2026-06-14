import type { MarketEntry, Sector } from '@/types/game';

// Price adjusts based on supply/demand imbalance, ±1–10% per tick
export function calculateNewPrice(entry: MarketEntry): number {
  const { price, supply, demand, base_price } = entry;

  if (supply <= 0 && demand <= 0) return price;

  const imbalance = demand > 0 ? (demand - supply) / demand : -1;

  // Volatility: clamp to ±10%
  const maxMove = 0.10;
  const rawMove = imbalance * 0.15; // amplifier
  const move = Math.max(-maxMove, Math.min(maxMove, rawMove));

  // Feedback stabilization: gently pull toward base price
  const stabilization = (base_price - price) / base_price * 0.02;

  const newPrice = price * (1 + move + stabilization);

  // Hard floor: 20% of base price
  return Math.max(base_price * 0.2, Math.round(newPrice * 100) / 100);
}

// Compute trend from last two data points
export function computeTrend(
  current: number,
  previous: number
): { trend: 'up' | 'down' | 'stable'; change_percent: number } {
  if (previous === 0) return { trend: 'stable', change_percent: 0 };
  const change_percent = ((current - previous) / previous) * 100;
  const trend =
    change_percent > 0.5 ? 'up' : change_percent < -0.5 ? 'down' : 'stable';
  return { trend, change_percent: Math.round(change_percent * 10) / 10 };
}

// Determine crisis events from market state
export function detectCrisis(
  entry: MarketEntry,
  prev_price: number
): { type: string; title: string; description: string } | null {
  const { sector, price, supply, demand, base_price } = entry;
  const ratio = demand > 0 ? supply / demand : 10;

  if (ratio < 0.4) {
    return {
      type: 'SHORTAGE',
      title: `Engpass: ${sector}`,
      description: `Kritischer Mangel in ${sector}. Angebot bei ${Math.round(ratio * 100)}% der Nachfrage.`,
    };
  }

  if (ratio > 2.5) {
    return {
      type: 'OVERSUPPLY',
      title: `Überangebot: ${sector}`,
      description: `Massieves Überangebot in ${sector}. Angebot bei ${Math.round(ratio * 100)}% der Nachfrage.`,
    };
  }

  const priceSpike = prev_price > 0 ? (price - prev_price) / prev_price : 0;
  if (priceSpike > 0.08) {
    return {
      type: 'PRICE_SPIKE',
      title: `Preissprung: ${sector}`,
      description: `${sector} Preis stieg um ${Math.round(priceSpike * 100)}% in einem Tick.`,
    };
  }

  if (price > base_price * 2) {
    return {
      type: 'CRISIS',
      title: `Marktkrise: ${sector}`,
      description: `${sector} Preis bei ${Math.round((price / base_price) * 100)}% des Normalniveaus.`,
    };
  }

  return null;
}

// Compute sector demand influenced by district demand levels
export function computeBaseDemand(sector: Sector, districtDemandAvg: number): number {
  const base: Record<Sector, number> = {
    ENERGY:        600,
    RAW_MATERIALS: 500,
    INDUSTRY:      450,
    LOGISTICS:     400,
  };
  return base[sector] * (districtDemandAvg / 6);
}
