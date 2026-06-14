type SB = any;
import type { Sector } from '@/types/game';
import { SECTORS } from '@/types/game';
import { BUILDING_BASE_COST, DISTRICT_SLOT_CONFIG, MAX_BUILDINGS_PER_COMPANY_PER_DISTRICT, MAX_BUILDINGS_PER_COMPANY_TOTAL } from './constants';

const CONSTRUCTION_TICKS: Record<string, number> = {
  production: 6, storage: 4, logistics_hub: 8, retail: 4,
};

const BOT_NAMES: Record<Sector, string> = {
  ENERGY: 'Stadtwerke Energie',
  RAW_MATERIALS: 'Rohstoff GmbH',
  INDUSTRY: 'Industrie AG',
  LOGISTICS: 'Logistik KG',
};

const BOT_COLORS: Record<Sector, string> = {
  ENERGY: '#f59e0b',
  RAW_MATERIALS: '#84cc16',
  INDUSTRY: '#6366f1',
  LOGISTICS: '#06b6d4',
};

const SECTOR_DISTRICT: Record<Sector, string> = {
  ENERGY: 'energy',
  RAW_MATERIALS: 'outskirts',
  INDUSTRY: 'industrial',
  LOGISTICS: 'center',
};

export async function ensureBotCompanies(supabase: SB): Promise<void> {
  const { data: companies } = await supabase.from('companies').select('primary_sector');
  if (!companies) return;

  const existingSectors = new Set(companies.map((c: any) => c.primary_sector));

  for (const sector of SECTORS) {
    if (existingSectors.has(sector)) continue;

    const district = SECTOR_DISTRICT[sector];
    const { data: newCo } = await supabase.from('companies').insert({
      name: BOT_NAMES[sector],
      color: BOT_COLORS[sector],
      primary_sector: sector,
      cash: 100000,
      is_bot: true,
    }).select().single();

    if (newCo) {
      await supabase.from('buildings').insert({
        company_id: newCo.id,
        district_id: district,
        type: 'production',
        sector: sector,
        level: 1,
        construction_ticks_remaining: 0,
      });

      await supabase.from('inventory').insert([
        { company_id: newCo.id, sector: 'ENERGY', quantity: 200 },
        { company_id: newCo.id, sector: 'RAW_MATERIALS', quantity: 200 },
        { company_id: newCo.id, sector: 'INDUSTRY', quantity: 200 },
        { company_id: newCo.id, sector: 'LOGISTICS', quantity: 200 },
      ]);
    }
  }
}

export async function runBotActions(
  supabase: SB,
  tickNumber: number,
  cityCostReduce: number
): Promise<void> {
  const { data: bots } = await supabase.from('companies').select('*').eq('is_bot', true);
  if (!bots || bots.length === 0) return;

  for (const bot of bots) {
    const sector = bot.primary_sector as Sector;
    const district = SECTOR_DISTRICT[sector];

    const { data: buildings } = await supabase
      .from('buildings')
      .select('*')
      .eq('company_id', bot.id);

    const totalBuildings = buildings?.length ?? 0;
    if (totalBuildings >= MAX_BUILDINGS_PER_COMPANY_TOTAL) continue;

    const districtCount = buildings?.filter((b: any) => b.district_id === district).length ?? 0;
    if (districtCount >= MAX_BUILDINGS_PER_COMPANY_PER_DISTRICT) continue;

    const slotConfig = DISTRICT_SLOT_CONFIG[district] ?? {};
    const typeCount = buildings?.filter((b: any) => b.type === 'production').length ?? 0;
    const maxSlots = slotConfig['production'] ?? 0;
    if (typeCount >= maxSlots) continue;

    const cost = Math.round((BUILDING_BASE_COST['production'] ?? 15000) * (1 - cityCostReduce));
    if (bot.cash < cost) continue;

    await supabase.from('actions_queue').insert({
      company_id: bot.id,
      type: 'BUILD',
      payload: { district_id: district, type: 'production', sector },
      tick_number: tickNumber,
    });
  }
}
