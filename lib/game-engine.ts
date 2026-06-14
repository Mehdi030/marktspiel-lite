type SB = any;
import { calculateNewPrice, computeBaseDemand } from './market';
import type { MarketEntry, Sector, TickResult, Company, TradePayload, BuildPayload, ProductionPriority } from '@/types/game';
import { SECTORS } from '@/types/game';
import { DISTRICT_SLOT_CONFIG, MAX_BUILDINGS_PER_COMPANY_PER_DISTRICT, MAX_BUILDINGS_PER_COMPANY_TOTAL, BUILDING_BASE_COST } from './constants';
import { ensureBotCompanies, runBotActions } from './bots';

const CITY_LEVEL_THRESHOLDS = [0, 5000, 25000, 75000, 200000, 500000, 1000000];
const CITY_BONUSES: Record<number, { label: string; priceMult: number; outputMult: number; costReduce: number }> = {
  1: { label: 'Dorf',            priceMult: 1.0,  outputMult: 1.0,  costReduce: 0 },
  2: { label: 'Kleinstadt',      priceMult: 1.05, outputMult: 1.05, costReduce: 0.05 },
  3: { label: 'Stadt',           priceMult: 1.10, outputMult: 1.10, costReduce: 0.10 },
  4: { label: 'Großstadt',       priceMult: 1.15, outputMult: 1.15, costReduce: 0.15 },
  5: { label: 'Metropole',       priceMult: 1.20, outputMult: 1.20, costReduce: 0.20 },
  6: { label: 'Mega-City',       priceMult: 1.30, outputMult: 1.25, costReduce: 0.25 },
};

const BUILDING_PRODUCTION: Record<string, number> = {
  production:    80,
  storage:       0,
  logistics_hub: 20,
  retail:        30,
};

const STORAGE_EXTRA_PER_LEVEL = 3000;

const INPUT_REQUIREMENTS: Partial<Record<Sector, Partial<Record<Sector, number>>>> = {
  ENERGY:        { RAW_MATERIALS: 0.15 },
  RAW_MATERIALS: { ENERGY: 0.12, LOGISTICS: 0.06 },
  INDUSTRY:      { RAW_MATERIALS: 0.30, ENERGY: 0.12 },
  LOGISTICS:     { INDUSTRY: 0.08, ENERGY: 0.08 },
};

const DISTRICT_MULTIPLIER: Record<string, number> = {
  center:     1.0, outskirts: 0.7, industrial: 1.1, energy: 1.0, trade: 1.4,
};

const DISTRICT_PRODUCTION_BONUS: Record<string, Partial<Record<string, number>>> = {
  center:     { logistics_hub: 1.25 },
  outskirts:  { production: 1.10 },
  industrial: { production: 1.20 },
  energy:     { production: 1.10 },
  trade:      { all: 1.15 },
};

const CONSTRUCTION_TICKS: Record<string, number> = {
  production:    6,
  storage:       4,
  logistics_hub: 8,
  retail:        4,
};

interface TickEffects {
  outputMult: number; inputReduce: number; costReduce: number;
  priceBonus: number; passivePerTick: number; storageBonus: number;
}

const UPGRADE_EFFECT_MAP: Record<string, { type: string; perLevel: number }> = {
  energy_efficiency:  { type: 'cost',    perLevel: 0.20 },
  smart_grid:         { type: 'price',   perLevel: 0.15 },
  battery_upgrade:    { type: 'storage', perLevel: 2000 },
  deep_drilling:      { type: 'output',  perLevel: 1.50 },
  refinery_upgrade:   { type: 'price',   perLevel: 0.30 },
  mining_efficiency:  { type: 'input',   perLevel: 0.30 },
  automation:         { type: 'input',   perLevel: 0.15 },
  fast_production:    { type: 'output',  perLevel: 0.30 },
  quality_boost:      { type: 'price',   perLevel: 0.10 },
  route_optimization: { type: 'output',  perLevel: 0.20 },
  express_service:    { type: 'passive', perLevel: 100 },
  storage_rental:     { type: 'passive', perLevel: 75 },
  loyalty_program:    { type: 'price',   perLevel: 0.15 },
  buying_pool:        { type: 'input',   perLevel: 0.15 },
};

function computeTickEffects(upgrades: Array<{ upgrade_id: string; level: number }>): TickEffects {
  const e: TickEffects = { outputMult: 1, inputReduce: 0, costReduce: 0, priceBonus: 0, passivePerTick: 0, storageBonus: 0 };
  for (const upg of upgrades) {
    const cfg = UPGRADE_EFFECT_MAP[upg.upgrade_id];
    if (!cfg) continue;
    const val = cfg.perLevel * upg.level;
    switch (cfg.type) {
      case 'output':  e.outputMult += val; break;
      case 'input':   e.inputReduce = Math.min(0.6, e.inputReduce + val); break;
      case 'cost':    e.costReduce = Math.min(0.5, e.costReduce + val); break;
      case 'price':   e.priceBonus += val; break;
      case 'passive': e.passivePerTick += val; break;
      case 'storage': e.storageBonus += val; break;
    }
  }
  return e;
}

export async function runTick(supabase: SB): Promise<TickResult> {
  // Ensure bot companies exist for all sectors BEFORE loading data
  await ensureBotCompanies(supabase);

  const [
    { data: worldData },
    { data: marketData },
    { data: companiesData },
    { data: buildingsData },
    { data: actionsData },
    { data: districtsData },
  ] = await Promise.all([
    supabase.from('world').select('*').single(),
    supabase.from('market').select('*'),
    supabase.from('companies').select('*'),
    supabase.from('buildings').select('*').eq('construction_ticks_remaining', 0),
    supabase.from('actions_queue').select('*').eq('status', 'pending'),
    supabase.from('districts').select('*'),
  ]);

  if (!worldData || !marketData || !companiesData) {
    throw new Error('Failed to load world state');
  }

  const tick_number = worldData.tick_number + 1;
  const market = marketData as MarketEntry[];
  const companies = companiesData as Company[];
  const buildings = buildingsData ?? [];
  const actions = actionsData ?? [];
  const districts = districtsData ?? [];

  const events: Array<{ type: string; title: string; description: string; sector: string; tick_number: number; data: object; company_id?: string | null }> = [];

  const { data: upgradeRows } = await supabase.from('company_upgrades').select('company_id, upgrade_id, level');
  const upgradesPerCompany: Record<string, Array<{ upgrade_id: string; level: number }>> = {};
  for (const u of (upgradeRows ?? [])) {
    (upgradesPerCompany[u.company_id] ??= []).push({ upgrade_id: u.upgrade_id, level: u.level });
  }

  let timeReadyBuildings: Array<{id:string;company_id:string;type:string;sector:string}> | null = null;
  {
    const { data, error } = await supabase.from('buildings')
      .select('id, company_id, type, sector')
      .not('construction_ends_at', 'is', null)
      .lt('construction_ends_at', new Date().toISOString())
      .gt('construction_ticks_remaining', 0);
    if (!error) timeReadyBuildings = data;
  }
  if (timeReadyBuildings && timeReadyBuildings.length > 0) {
    for (const b of timeReadyBuildings) {
      await supabase.from('buildings').update({ construction_ticks_remaining: 0 }).eq('id', b.id);
      const comp = companies.find(c => c.id === b.company_id);
      if (comp) events.push({ type: 'COMPANY_EVENT', title: `${comp.name}: Gebäude fertig`, description: `${b.type} im ${b.sector}-Sektor ist einsatzbereit.`, sector: b.sector, tick_number, company_id: b.company_id, data: { building_id: b.id } });
    }
    const { data: refreshedBuildings } = await supabase.from('buildings').select('*').eq('construction_ticks_remaining', 0);
    if (refreshedBuildings) buildings.splice(0, buildings.length, ...refreshedBuildings);
  }

  const playerCompanies = companies.filter(c => !c.is_bot);
  const marketMap = Object.fromEntries(market.map(m => [m.sector, { ...m }])) as Record<Sector, MarketEntry>;

  const totalSupply: Record<Sector, number> = Object.fromEntries(SECTORS.map(s => [s, 0])) as Record<Sector, number>;
  const totalDemand: Record<Sector, number> = Object.fromEntries(SECTORS.map(s => [s, 0])) as Record<Sector, number>;

  const avgDemand = districts.length > 0 ? districts.reduce((s: number, d: { demand_level: number }) => s + d.demand_level, 0) / districts.length : 6;
  for (const sector of SECTORS) totalDemand[sector] += computeBaseDemand(sector, avgDemand);

  const { data: allInventoryData } = await supabase.from('inventory').select('*');
  const inventoryMap: Record<string, Record<Sector, number>> = {};
  for (const inv of (allInventoryData ?? [])) {
    (inventoryMap[inv.company_id] ??= {} as Record<Sector, number>)[inv.sector as Sector] = inv.quantity;
  }

  const storageCap: Record<string, number> = {};
  for (const b of buildings) {
    if (b.type === 'storage') storageCap[b.company_id] = (storageCap[b.company_id] ?? 10000) + STORAGE_EXTRA_PER_LEVEL * (b.level ?? 1);
  }
  for (const [companyId, upgList] of Object.entries(upgradesPerCompany)) {
    const fx = computeTickEffects(upgList);
    if (fx.storageBonus > 0) storageCap[companyId] = (storageCap[companyId] ?? 10000) + fx.storageBonus;
  }

  const companyPriorities: Record<string, ProductionPriority> = {};
  for (const c of playerCompanies) companyPriorities[c.id] = c.production_priority ?? { cost: 33, quality: 34, growth: 33 };

  const productionByCompany: Record<string, Record<Sector, number>> = {};
  const autoPurchaseCost: Record<string, number> = {};
  const inputConsumed: Record<string, Partial<Record<Sector, number>>> = {};
  let totalOutputThisTick = 0;

  const cityLevel = worldData.city_level ?? 1;
  const cityBonus = CITY_BONUSES[cityLevel] ?? CITY_BONUSES[1];

  for (const building of buildings) {
    if (building.construction_ticks_remaining > 0) continue;
    const prod = BUILDING_PRODUCTION[building.type] ?? 0;
    if (prod <= 0) continue;
    const sector = building.sector as Sector;
    const company = companies.find(c => c.id === building.company_id);
    const priority: ProductionPriority = companyPriorities[building.company_id] ?? { cost: 33, quality: 34, growth: 33 };
    const qualityMult = 1 + (priority.quality / 100) * 0.3;
    const insolvencyMult = (company?.insolvency_stage ?? 0) >= 1 ? 0.7 : 1;
    const districtBonuses = DISTRICT_PRODUCTION_BONUS[building.district_id] ?? {};
    const districtMult = districtBonuses[building.type] ?? districtBonuses['all'] ?? 1.0;
    const foerderplatzMult = (building.district_id === 'outskirts' && building.type === 'production' && company?.primary_sector === 'RAW_MATERIALS') ? 1.20 : 1.0;

    const compEffects = computeTickEffects(upgradesPerCompany[building.company_id] ?? []);
    const plannedOutput = Math.round(prod * (building.level ?? 1) * qualityMult * insolvencyMult * districtMult * foerderplatzMult * compEffects.outputMult * cityBonus.outputMult);
    const inputReqs: Partial<Record<Sector, number>> = {};
    for (const [s, ratio] of Object.entries(INPUT_REQUIREMENTS[sector] ?? {}) as [Sector, number][]) {
      inputReqs[s] = ratio * (1 - compEffects.inputReduce);
    }
    let efficiency = 1.0;

    for (const [inputSector, ratio] of Object.entries(inputReqs as Record<string, number>) as [Sector, number][]) {
      const needed = Math.round(plannedOutput * ratio);
      if (needed <= 0) continue;
      const ownStock = inventoryMap[building.company_id]?.[inputSector] ?? 0;
      const fromOwn = Math.min(ownStock, needed);
      const toPurchase = needed - fromOwn;

      if (fromOwn > 0) {
        (inputConsumed[building.company_id] ??= {})[inputSector] = (inputConsumed[building.company_id]?.[inputSector] ?? 0) + fromOwn;
        inventoryMap[building.company_id][inputSector] = Math.max(0, (inventoryMap[building.company_id][inputSector] ?? 0) - fromOwn);
      }

      if (toPurchase > 0 && company) {
        const rawPrice = marketMap[inputSector]?.price ?? 0;
        const cost = toPurchase * rawPrice;
        const spentSoFar = autoPurchaseCost[company.id] ?? 0;
        const available = company.cash - spentSoFar;
        if (available >= cost && rawPrice > 0) {
          autoPurchaseCost[company.id] = spentSoFar + cost;
          totalDemand[inputSector] += toPurchase;
        } else if (rawPrice > 0) {
          const canAffordUnits = Math.floor(available / rawPrice);
          const actualFromMarket = Math.max(0, canAffordUnits);
          if (actualFromMarket > 0) {
            autoPurchaseCost[company.id] = spentSoFar + actualFromMarket * rawPrice;
            totalDemand[inputSector] += actualFromMarket;
          }
          efficiency = Math.min(efficiency, needed > 0 ? (fromOwn + actualFromMarket) / needed : 1);
        } else {
          efficiency = Math.min(efficiency, needed > 0 ? fromOwn / needed : 1);
        }
      }
    }

    const output = Math.round(plannedOutput * efficiency);
    if (output > 0) {
      totalSupply[sector] += output;
      totalOutputThisTick += output;
      (productionByCompany[building.company_id] ??= {} as Record<Sector, number>)[sector] = (productionByCompany[building.company_id]?.[sector] ?? 0) + output;
    }
  }

  for (const [companyId, cost] of Object.entries(autoPurchaseCost)) {
    if (cost <= 0) continue;
    const company = companies.find(c => c.id === companyId);
    if (!company) continue;
    company.cash -= cost;
    await supabase.from('companies').update({ cash: company.cash }).eq('id', companyId);
  }

  for (const [companyId, consumption] of Object.entries(inputConsumed)) {
    for (const [sector, qty] of Object.entries(consumption) as [Sector, number][]) {
      if (qty <= 0) continue;
      await supabase.from('inventory').upsert(
        { company_id: companyId, sector, quantity: Math.max(0, inventoryMap[companyId]?.[sector] ?? 0) },
        { onConflict: 'company_id,sector' }
      );
    }
  }

  for (const [companyId, sectorProd] of Object.entries(productionByCompany)) {
    const cap = storageCap[companyId] ?? 10000;
    for (const [sector, qty] of Object.entries(sectorProd)) {
      if (qty <= 0) continue;
      const current = inventoryMap[companyId]?.[sector as Sector] ?? 0;
      const capped = Math.min(current + qty, cap);
      (inventoryMap[companyId] ??= {} as Record<Sector, number>)[sector as Sector] = capped;
      await supabase.from('inventory').upsert(
        { company_id: companyId, sector, quantity: capped },
        { onConflict: 'company_id,sector' }
      );
    }
  }

  // ── City Growth ───────────────────────────────────────────────────────────
  const newGrowthPoints = (worldData.city_growth_points ?? 0) + totalOutputThisTick;
  const newCityLevel = CITY_LEVEL_THRESHOLDS.findLastIndex(t => newGrowthPoints >= t);
  const effectiveCityLevel = Math.max(1, newCityLevel + 1);
  let nextTarget = CITY_LEVEL_THRESHOLDS.find(t => t > newGrowthPoints) ?? CITY_LEVEL_THRESHOLDS[CITY_LEVEL_THRESHOLDS.length - 1];

  if (effectiveCityLevel > cityLevel) {
    const bonus = CITY_BONUSES[effectiveCityLevel] ?? CITY_BONUSES[cityLevel];
    events.push({
      type: 'CITY_EVENT', title: `🏙 Stadt gewachsen: ${bonus.label}!`,
      description: `Level ${effectiveCityLevel}: ${bonus.label}. Alle erhalten +${Math.round((bonus.priceMult - 1) * 100)}% Verkaufspreise, +${Math.round((bonus.outputMult - 1) * 100)}% Produktion, ${Math.round(bonus.costReduce * 100)}% weniger Miete.`,
      sector: 'ENERGY', tick_number, data: { city_level: effectiveCityLevel, growth_points: newGrowthPoints },
    });
  }

  await supabase.from('world').update({
    city_level: effectiveCityLevel,
    city_growth_points: newGrowthPoints,
    city_growth_target: nextTarget,
  }).eq('id', 1);

  // ── Cooperative auto-buy from market ─────────────────────────────────────
  // In the cooperative phase, players automatically buy needed inputs

  let actions_executed = 0;
  let actions_failed = 0;
  const actionResults: Array<{ id: string; status: 'executed' | 'failed' }> = [];

  for (const action of actions) {
    const company = companies.find(c => c.id === action.company_id);
    if (!company) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }

    if (action.type === 'BUY') {
      const p = action.payload as TradePayload;
      const mEntry = marketMap[p.sector];
      if (!mEntry) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const cost = Math.round(mEntry.price * p.quantity);
      if (company.cash < cost) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      await supabase.from('companies').update({ cash: company.cash - cost }).eq('id', company.id);
      company.cash -= cost;
      const { data: existingInv } = await supabase.from('inventory').select('quantity').eq('company_id', company.id).eq('sector', p.sector).single();
      await supabase.from('inventory').upsert({ company_id: company.id, sector: p.sector, quantity: (existingInv?.quantity ?? 0) + p.quantity }, { onConflict: 'company_id,sector' });
      totalDemand[p.sector] += p.quantity;
      actionResults.push({ id: action.id, status: 'executed' }); actions_executed++;
    }

    else if (action.type === 'SELL') {
      const p = action.payload as TradePayload;
      const mEntry = marketMap[p.sector];
      if (!mEntry) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('company_id', company.id).eq('sector', p.sector).single();
      if (!inv || inv.quantity < p.quantity) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const revenue = Math.round(mEntry.price * p.quantity * cityBonus.priceMult);
      await Promise.all([
        supabase.from('companies').update({ cash: company.cash + revenue }).eq('id', company.id),
        supabase.from('inventory').update({ quantity: inv.quantity - p.quantity }).eq('company_id', company.id).eq('sector', p.sector),
      ]);
      company.cash += revenue;
      totalSupply[p.sector] += p.quantity;
      actionResults.push({ id: action.id, status: 'executed' }); actions_executed++;
    }

    else if (action.type === 'BUILD') {
      const p = action.payload as BuildPayload;
      const maxOfType = (DISTRICT_SLOT_CONFIG[p.district_id] ?? {})[p.type] ?? 0;
      if (maxOfType === 0) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const { count: typeCount } = await supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('district_id', p.district_id).eq('type', p.type);
      if ((typeCount ?? 0) >= maxOfType) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const { count: globalCount } = await supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('company_id', company.id);
      if ((globalCount ?? 0) >= MAX_BUILDINGS_PER_COMPANY_TOTAL) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const { count: compCount } = await supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('district_id', p.district_id);
      if ((compCount ?? 0) >= MAX_BUILDINGS_PER_COMPANY_PER_DISTRICT) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      const cost = Math.round((BUILDING_BASE_COST[p.type] ?? 10000) * (DISTRICT_MULTIPLIER[p.district_id] ?? 1) * (1 - cityBonus.costReduce));
      if (company.cash < cost) { actionResults.push({ id: action.id, status: 'failed' }); actions_failed++; continue; }
      await Promise.all([
        supabase.from('companies').update({ cash: company.cash - cost }).eq('id', company.id),
        supabase.from('buildings').insert({ company_id: company.id, district_id: p.district_id, type: p.type, sector: p.sector, capacity: 100, construction_ticks_remaining: CONSTRUCTION_TICKS[p.type] ?? 2 }),
      ]);
      actionResults.push({ id: action.id, status: 'executed' }); actions_executed++;
    }
  }

  if (actionResults.length > 0) {
    for (const r of actionResults) await supabase.from('actions_queue').update({ status: r.status, tick_number }).eq('id', r.id);
  }

  const updatedMarket: MarketEntry[] = [];
  for (const sector of SECTORS) {
    const current = marketMap[sector];
    const newEntry: MarketEntry = { ...current, supply: totalSupply[sector], demand: totalDemand[sector], updated_at: new Date().toISOString() };
    newEntry.price = calculateNewPrice(newEntry);
    updatedMarket.push(newEntry);
  }

  await supabase.rpc('decrement_construction', {}).then(() => {}).catch(() => {});
  const { data: underConstruction } = await supabase.from('buildings').select('id, construction_ticks_remaining').gt('construction_ticks_remaining', 0);
  if (underConstruction && underConstruction.length > 0) {
    for (const b of underConstruction) await supabase.from('buildings').update({ construction_ticks_remaining: b.construction_ticks_remaining - 1 }).eq('id', b.id);
  }

  // ── Bot actions before processing player actions ─────────────────────────
  await runBotActions(supabase, tick_number, cityBonus.costReduce);
  // Re-fetch actions after bots added theirs
  {
    const { data: updatedActions } = await supabase.from('actions_queue').select('*').eq('status', 'pending');
    if (updatedActions) {
      actions.splice(0, actions.length, ...updatedActions);
    }
  }

  // ── Rent ─────────────────────────────────────────────────────────────────
  const districtMap = Object.fromEntries(districts.map((d: { id: string; rent_cost: number }) => [d.id, d]));
  const rentByCompany: Record<string, number> = {};
  for (const building of buildings) {
    if (!building.company_id || building.construction_ticks_remaining > 0) continue;
    const district = districtMap[building.district_id];
    if (!district) continue;
    const rent = Math.round(district.rent_cost);
    rentByCompany[building.company_id] = (rentByCompany[building.company_id] ?? 0) + rent;
  }
  for (const [companyId, totalRent] of Object.entries(rentByCompany)) {
    const company = companies.find(c => c.id === companyId);
    if (!company) continue;
    const compEffects = computeTickEffects(upgradesPerCompany[companyId] ?? []);
    const discountedRent = Math.round(totalRent * (1 - compEffects.costReduce) * (1 - cityBonus.costReduce));
    const newCash = company.cash - discountedRent;
    await supabase.from('companies').update({ cash: newCash }).eq('id', companyId);
    company.cash = newCash;
  }

  for (const company of playerCompanies) {
    const compEffects = computeTickEffects(upgradesPerCompany[company.id] ?? []);
    if (compEffects.passivePerTick > 0) {
      company.cash += Math.round(compEffects.passivePerTick);
      await supabase.from('companies').update({ cash: company.cash }).eq('id', company.id);
    }
  }

  // ── Auto-sell ─────────────────────────────────────────────────────────────
  for (const company of companies) {
    const strategy = (company as any).warehouse_strategy as string ?? 'normal';
    const threshold = strategy === 'conservative' ? 80 : strategy === 'normal' ? 50 : strategy === 'aggressive' ? 0 : -1;
    if (threshold < 0) continue;
    const cap = storageCap[company.id] ?? 10000;
    const sector = company.primary_sector as Sector;
    const stock = inventoryMap[company.id]?.[sector] ?? 0;
    const fillPct = (stock / cap) * 100;
    if (fillPct < threshold) continue;
    const sellQty = strategy === 'aggressive' ? stock : Math.round(stock * (fillPct - threshold) / 100 * 2);
    if (sellQty <= 0) continue;
    const mktPrice = marketMap[sector]?.price ?? 0;
    if (mktPrice <= 0) continue;
    const compEffects = computeTickEffects(upgradesPerCompany[company.id] ?? []);
    const revenue = Math.round(sellQty * mktPrice * (1 + compEffects.priceBonus) * cityBonus.priceMult);
    (inventoryMap[company.id] ??= {} as Record<Sector, number>)[sector] = Math.max(0, stock - sellQty);
    await supabase.from('inventory').upsert({ company_id: company.id, sector, quantity: Math.max(0, stock - sellQty) }, { onConflict: 'company_id,sector' });
    company.cash += revenue;
    await supabase.from('companies').update({ cash: company.cash }).eq('id', company.id);
    totalSupply[sector] += sellQty;
  }

  // ── Insolvency ────────────────────────────────────────────────────────────
  for (const company of playerCompanies) {
    const { insolvency_stage: stage, cash } = company;
    if (cash >= 0) {
      if (stage > 0) {
        const newStage = stage - 1;
        await supabase.from('companies').update({ insolvency_stage: newStage }).eq('id', company.id);
      }
      continue;
    }
    if (stage === 0) {
      await supabase.from('companies').update({ insolvency_stage: 1 }).eq('id', company.id);
      events.push({ type: 'COMPANY_EVENT', title: `${company.name}: Defizit`, description: `Negatives Kapital (${cash.toLocaleString()} €). Effizienz auf 70% reduziert.`, sector: company.primary_sector, tick_number, data: { company_id: company.id } });
    } else if (stage >= 3 && cash < -100000) {
      await Promise.all([
        supabase.from('companies').update({ insolvency_stage: 4, cash: 0, owner_id: null }).eq('id', company.id),
        supabase.from('buildings').delete().eq('company_id', company.id),
        supabase.from('inventory').delete().eq('company_id', company.id),
      ]);
      events.push({ type: 'COMPANY_EVENT', title: `${company.name}: Liquidiert`, description: `${company.name} wurde automatisch liquidiert.`, sector: company.primary_sector, tick_number, company_id: company.id, data: { company_id: company.id } });
    } else if (cash < -50000) {
      await supabase.from('companies').update({ insolvency_stage: 3 }).eq('id', company.id);
    } else if (cash < -20000) {
      await supabase.from('companies').update({ insolvency_stage: 2 }).eq('id', company.id);
    }
  }

  // ── Save market ───────────────────────────────────────────────────────────
  await Promise.all([
    ...updatedMarket.map(m => supabase.from('market').update({ price: m.price, supply: m.supply, demand: m.demand, updated_at: m.updated_at }).eq('sector', m.sector)),
    supabase.from('price_history').insert(updatedMarket.map(m => ({ sector: m.sector, price: m.price, supply: m.supply, demand: m.demand, tick_number }))),
  ]);

  if (events.length > 0) await supabase.from('events').insert(events);

  return { tick_number, market_updates: updatedMarket, events: events as TickResult['events'], actions_executed, actions_failed };
}