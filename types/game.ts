export type Sector = 'ENERGY' | 'RAW_MATERIALS' | 'INDUSTRY' | 'LOGISTICS';
export type DistrictId = 'center' | 'industrial' | 'outskirts' | 'trade' | 'energy';
export type BuildingType = 'production' | 'storage' | 'logistics_hub' | 'retail';
export type ActionType = 'BUY' | 'SELL' | 'BUILD';
export type WorldPhase = 'cooperative' | 'expansion';
export type InsolvencyStage = 0 | 1 | 2 | 3 | 4;
export type WarehouseStrategy = 'manual' | 'conservative' | 'normal' | 'aggressive';

export const SECTORS: Sector[] = ['ENERGY', 'RAW_MATERIALS', 'INDUSTRY', 'LOGISTICS'];

export const SECTOR_LABELS: Record<Sector, string> = {
  ENERGY:        'Energie',
  RAW_MATERIALS: 'Rohstoffe',
  INDUSTRY:      'Fertigung',
  LOGISTICS:     'Logistik',
};

export const SECTOR_COLORS: Record<Sector, string> = {
  ENERGY:        '#f59e0b',
  RAW_MATERIALS: '#84cc16',
  INDUSTRY:      '#6366f1',
  LOGISTICS:     '#06b6d4',
};

export const SECTOR_ICONS: Record<Sector, string> = {
  ENERGY:        '⚡',
  RAW_MATERIALS: '⛏',
  INDUSTRY:      '🏭',
  LOGISTICS:     '🚚',
};

export interface World {
  id: 1;
  tick_number: number;
  last_tick_at: string | null;
  phase: WorldPhase;
  tick_interval_seconds: number;
  city_level: number;
  city_growth_points: number;
  city_growth_target: number;
  npc_count: number;
}

export interface District {
  id: DistrictId;
  name: string;
  rent_cost: number;
  demand_level: number;
  infrastructure_level: number;
  logistics_cost: number;
  available_slots: number;
}

export interface Company {
  id: string;
  owner_id: string | null;
  name: string;
  color: string;
  logo: string;
  primary_sector: string;
  home_district: string | null;
  cash: number;
  production_priority: { cost: number; quality: number; growth: number };
  warehouse_strategy: WarehouseStrategy;
  is_bot: boolean;
  insolvency_stage: InsolvencyStage;
  created_at: string;
}

export interface Building {
  id: string;
  company_id: string;
  district_id: string;
  type: string;
  sector: string;
  level: number;
  capacity: number;
  construction_ticks_remaining: number;
  created_at: string;
}

export interface MarketEntry {
  sector: Sector;
  price: number;
  supply: number;
  demand: number;
  base_price: number;
  updated_at: string;
}

export interface PriceHistory {
  id: number;
  sector: string;
  price: number;
  supply: number;
  demand: number;
  tick_number: number;
  recorded_at: string;
}

export interface GameEvent {
  id: number;
  type: string;
  title: string;
  description: string;
  company_id: string | null;
  sector: string | null;
  tick_number: number;
  data: Record<string, unknown>;
  created_at: string;
}

export interface Inventory {
  company_id: string;
  sector: Sector;
  quantity: number;
}

export interface TickResult {
  tick_number: number;
  market_updates: MarketEntry[];
  events: GameEvent[];
  actions_executed: number;
  actions_failed: number;
}

export interface TradePayload {
  sector: Sector;
  quantity: number;
}

export interface BuildPayload {
  district_id: string;
  type: string;
  sector: Sector;
}

export interface ProductionPriority {
  cost: number;
  quality: number;
  growth: number;
}
