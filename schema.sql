-- ==============================================================================
-- Goodness Lodge Energy Monitoring and Prediction System
-- Listing A.2: Database Schema & Row Level Security Policies
-- PostgreSQL / Supabase
-- ==============================================================================

-- 1. APPLIANCES TABLE
create table if not exists appliances (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  category     text not null check (category in
                 ('Lighting','Cooling','Refrigeration','Entertainment','Heating','Other')),
  power_watts  numeric not null check (power_watts > 0),
  quantity     integer not null check (quantity >= 1),
  daily_hours  numeric not null check (daily_hours >= 0 and daily_hours <= 24),
  state        text not null default 'ON' check (state in ('ON','OFF'))
);

-- 2. USAGE RECORDS TABLE
create table if not exists usage_records (
  id           uuid primary key default gen_random_uuid(),
  usage_date   date not null,
  appliance_id uuid not null references appliances(id) on delete restrict,
  hours        numeric not null check (hours >= 0 and hours <= 24),
  energy_kwh   numeric not null check (energy_kwh >= 0),
  unique (usage_date, appliance_id)
);

-- 3. RECHARGES TABLE
create table if not exists recharges (
  id            uuid primary key default gen_random_uuid(),
  recharge_date date not null,
  amount_naira  numeric not null check (amount_naira > 0),
  units_kwh     numeric not null check (units_kwh > 0)
);

-- 4. METER READINGS TABLE
create table if not exists meter_readings (
  id            uuid primary key default gen_random_uuid(),
  reading_date  date not null unique,
  balance_kwh   numeric not null check (balance_kwh >= 0),
  estimated_kwh numeric not null
);

-- 5. SETTINGS TABLE (Single-row table)
create table if not exists settings (
  id             integer primary key check (id = 1),
  averaging_days integer not null default 7 check (averaging_days between 3 and 30),
  alert_days     integer not null default 3 check (alert_days between 2 and 14)
);

-- Ensure the single settings row exists
insert into settings (id, averaging_days, alert_days)
values (1, 7, 3)
on conflict (id) do nothing;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows authorized web app clients (both authenticated caretaker and anon key)
-- to select, insert, update, or delete.
-- ==============================================================================

alter table appliances     enable row level security;
alter table usage_records  enable row level security;
alter table recharges      enable row level security;
alter table meter_readings enable row level security;
alter table settings       enable row level security;

-- Drop previous policies if re-running
drop policy if exists "signed-in only" on appliances;
drop policy if exists "signed-in only" on usage_records;
drop policy if exists "signed-in only" on recharges;
drop policy if exists "signed-in only" on meter_readings;
drop policy if exists "signed-in only" on settings;

drop policy if exists "permit all" on appliances;
drop policy if exists "permit all" on usage_records;
drop policy if exists "permit all" on recharges;
drop policy if exists "permit all" on meter_readings;
drop policy if exists "permit all" on settings;

create policy "permit all" on appliances     for all using (true) with check (true);
create policy "permit all" on usage_records  for all using (true) with check (true);
create policy "permit all" on recharges      for all using (true) with check (true);
create policy "permit all" on meter_readings for all using (true) with check (true);
create policy "permit all" on settings       for all using (true) with check (true);
