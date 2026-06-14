-- =============================================
-- MARKTSPIEL LITE — Supabase Schema
-- =============================================

-- Game World
create table world (
  id integer primary key default 1,
  tick_number integer default 0,
  last_tick_at timestamptz,
  phase text default 'cooperative',
  tick_interval_seconds integer default 30,
  city_level integer default 1,
  city_growth_points integer default 0,
  city_growth_target integer default 5000,
  npc_count integer default 0,
  check (id = 1)
);

-- Districts
create table districts (
  id text primary key,
  name text not null,
  rent_cost integer default 50,
  demand_level integer default 6,
  infrastructure_level integer default 1,
  logistics_cost integer default 10,
  available_slots integer default 20
);

-- Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id text,
  name text not null,
  color text default '#6366f1',
  logo text default 'default',
  primary_sector text not null,
  home_district text,
  cash numeric default 50000,
  production_priority jsonb default '{"cost":33,"quality":34,"growth":33}',
  warehouse_strategy text default 'normal',
  is_bot boolean default false,
  insolvency_stage integer default 0,
  created_at timestamptz default now()
);

-- Buildings
create table buildings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  district_id text,
  type text not null,
  sector text not null,
  level integer default 1,
  capacity integer default 100,
  construction_ticks_remaining integer default 0,
  construction_ends_at timestamptz,
  created_at timestamptz default now()
);

-- Market (one row per sector)
create table market (
  sector text primary key,
  price numeric not null,
  supply numeric default 0,
  demand numeric default 0,
  base_price numeric not null,
  updated_at timestamptz default now()
);

-- Price History
create table price_history (
  id bigint generated always as identity primary key,
  sector text not null,
  price numeric not null,
  supply numeric default 0,
  demand numeric default 0,
  tick_number integer not null,
  recorded_at timestamptz default now()
);

-- Inventory
create table inventory (
  company_id uuid references companies(id),
  sector text not null,
  quantity numeric default 0,
  primary key (company_id, sector)
);

-- Actions Queue
create table actions_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  type text not null,
  payload jsonb,
  status text default 'pending',
  tick_number integer default 0,
  created_at timestamptz default now()
);

-- Events
create table events (
  id bigint generated always as identity primary key,
  type text not null,
  title text,
  description text,
  company_id uuid references companies(id),
  sector text,
  tick_number integer not null,
  data jsonb default '{}',
  created_at timestamptz default now()
);

-- Company Upgrades
create table company_upgrades (
  company_id uuid references companies(id),
  upgrade_id text not null,
  level integer default 1,
  primary key (company_id, upgrade_id)
);

-- Decrement construction RPC
create or replace function decrement_construction()
returns void
language sql
as $$
  update buildings
  set construction_ticks_remaining = greatest(0, construction_ticks_remaining - 1)
  where construction_ticks_remaining > 0;
$$;

-- Seed districts
insert into districts (id, name, rent_cost, demand_level) values
  ('center',     'Hafenviertel',      80, 7),
  ('industrial', 'Fabrikviertel',     60, 6),
  ('outskirts',  'Minenviertel',      30, 5),
  ('trade',      'Marktplatz',       100, 8),
  ('energy',     'Kraftwerksviertel', 50, 6);

-- Seed market
insert into market (sector, price, base_price, supply, demand) values
  ('ENERGY',        42.00, 40.00, 500, 500),
  ('RAW_MATERIALS', 36.00, 35.00, 400, 400),
  ('INDUSTRY',      55.00, 50.00, 300, 300),
  ('LOGISTICS',     48.00, 45.00, 350, 350);

-- Seed world
insert into world (id, tick_number, phase, city_level, city_growth_points, city_growth_target)
values (1, 0, 'cooperative', 1, 0, 5000);