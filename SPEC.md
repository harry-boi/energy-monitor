# SPEC.md — Goodness Lodge Energy Monitoring and Prediction System

Source of truth: project report Chapters 1–4. Where this file and the report disagree, the report wins; flag the conflict instead of guessing.
Items marked **(proposed)** are implementation choices not fixed by the report. Everything else is taken from it.

---

## 1. Purpose

A web-based system for the caretaker of Goodness Lodge (a single-prepaid-meter student residence, Ikot Ekpene, Akwa Ibom State) to:

1. Register appliances (power, quantity, estimated daily hours, ON/OFF state).
2. Estimate energy consumption from appliance data and daily usage records.
3. Keep a digital history of usage, prepaid recharges and meter readings.
4. Predict how long the current energy will last and warn before it runs out.

**The system does not measure electricity.** Every derived figure is an estimate and must be labelled as one in the UI.

### Users
One actor: the **caretaker**. One sign-in account, created manually in Supabase. No public sign-up.

### Out of scope (do not build)
Physical sensors, automatic meter reading, utility (PHED) integration, per-tenant billing, payment processing, automatic detection of whether an appliance is on, machine-learning prediction, automatic calibration from live meter data, IoT meter communication, automated appliance detection.

---

## 2. Technology stack

| Tool | Purpose |
| --- | --- |
| JavaScript | Pages, server code and calculation functions (one language throughout) |
| Node.js 18+ | Runtime |
| Next.js 14+ (App Router **(proposed)**) | Pages, routing, server functions |
| React | UI components |
| Tailwind CSS | Styling; must work on phone and computer |
| Recharts | Bar charts of daily consumption |
| Supabase | PostgreSQL database + login service |
| Vercel | Hosting |
| Git / GitHub | Version control and deployment source |

Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit `.env.local`.

---

## 3. Architecture

Three tiers:

1. **Presentation:** browser pages and forms.
2. **Application:** server code that signs in the caretaker, reads/saves data, and runs the Estimator and Predictor.
3. **Data:** PostgreSQL + Supabase login service.

Classes:

- **Data classes** (one table each): `Appliance`, `UsageRecord`, `Recharge`, `MeterReading`, `Settings`.
  - An `Appliance` has many `UsageRecord`s; each `UsageRecord` belongs to one `Appliance`. The other three are not linked; only calculations combine them.
- **Function classes** (no stored data): `Estimator`, `Predictor`. They take values in and return values out.

**Hard rule:** the calculation functions live in one plain JS file (or two: estimator/predictor), never read the database or the pages, and are used identically in the browser (live feedback while typing) and on the server (saving results). Pages call them; pages never re-implement the maths.

---

## 4. Database

Five tables. The caretaker's login lives in Supabase Auth, not in these tables.

### 4.1 Schema (Listing A.2 — proposed SQL)

```sql
create table appliances (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  category     text not null check (category in
                 ('Lighting','Cooling','Refrigeration','Entertainment','Heating','Other')),
  power_watts  numeric not null check (power_watts > 0),
  quantity     integer not null check (quantity >= 1),
  daily_hours  numeric not null check (daily_hours >= 0 and daily_hours <= 24),
  state        text not null default 'ON' check (state in ('ON','OFF'))
);

create table usage_records (
  id           uuid primary key default gen_random_uuid(),
  usage_date   date not null,
  appliance_id uuid not null references appliances(id) on delete restrict,
  hours        numeric not null check (hours >= 0 and hours <= 24),
  energy_kwh   numeric not null check (energy_kwh >= 0),
  unique (usage_date, appliance_id)
);

create table recharges (
  id            uuid primary key default gen_random_uuid(),
  recharge_date date not null,
  amount_naira  numeric not null check (amount_naira > 0),
  units_kwh     numeric not null check (units_kwh > 0)
);

create table meter_readings (
  id            uuid primary key default gen_random_uuid(),
  reading_date  date not null unique,
  balance_kwh   numeric not null check (balance_kwh >= 0),
  estimated_kwh numeric not null
);

create table settings (
  id             integer primary key check (id = 1),
  averaging_days integer not null default 7 check (averaging_days between 3 and 30),
  alert_days     integer not null default 3 check (alert_days between 2 and 14)
);
insert into settings (id) values (1);

-- Row level security: signed-in users only, on every table
alter table appliances     enable row level security;
alter table usage_records  enable row level security;
alter table recharges      enable row level security;
alter table meter_readings enable row level security;
alter table settings       enable row level security;

create policy "signed-in only" on appliances     for all to authenticated using (true) with check (true);
create policy "signed-in only" on usage_records  for all to authenticated using (true) with check (true);
create policy "signed-in only" on recharges      for all to authenticated using (true) with check (true);
create policy "signed-in only" on meter_readings for all to authenticated using (true) with check (true);
create policy "signed-in only" on settings       for all to authenticated using (true) with check (true);
```

---

## 5. Calculation functions (the core)

Function names are fixed by the report (Table 4.2).

| Function | Class | Eq. | Result |
| --- | --- | --- | --- |
| `estimateApplianceEnergy` | Estimator | 3.1 | Energy of one appliance (kWh) |
| `estimateDailyEnergy` | Estimator | 3.2 | Total energy of a set of usage records |
| `estimateLoad` | Estimator | 3.3 | Load of appliances that are ON (kW) |
| `estimateBalance` | Estimator | 3.4 | Estimated balance (kWh), never below 0 |
| `averageDailyEnergy` | Predictor | 3.5 | Average over last N recorded days |
| `estimateDuration` | Predictor | 3.6 | Recharge duration (days) |
| `projectDepletionDate` | Predictor | 3.6 | Balance date + whole days of duration |
| `costPerKwh` | Predictor | 3.7 | Cost of one kWh from a recharge |
| `estimatedDailyCost` | Predictor | 3.8 | Average daily consumption × cost per kWh |
| `alertStatus` | Predictor | Table 3.8 | Normal, Low or Critical |
| `applianceShare` | Estimator | 3.9 | Share of an appliance in total energy (%) |
| `periodChange` | Estimator | 3.10 | Change from previous period (%) |

### 5.1 Equations
- **(3.1)** `E = (P ÷ 1000) × Q × H`
- **(3.2)** `D = E1 + E2 + … + En`
- **(3.3)** `L = Σ (P × Q) ÷ 1000` for appliances whose state is ON (in kW)
- **(3.4)** `B = B0 + R − U`. If there is a meter reading, count only recharges and usage records dated after the reading date. Balance never below 0.
- **(3.5)** `A = (sum of daily totals of last N recorded days) ÷ (number of those days)`. If no usage recorded, use daily energy of ON appliances and state prediction is based on appliance estimate. If A = 0, stop with message.
- **(3.6)** `T = B ÷ A` (days). Depletion date = balance date + floor(T) days. Display T to 1 decimal place.
- **(3.7)** `Cost per kWh = amount paid ÷ units received` (from latest recharge).
- **(3.8)** `Estimated daily cost = A × cost per kWh`.
- **(3.9)** `Share (%) = (appliance energy ÷ total energy) × 100`.
- **(3.10)** `Change (%) = ((current total − previous total) ÷ previous total) × 100`.

### 5.2 Alert status (Table 3.8)
- **Critical:** Balance is 0 or T ≤ 1 day
- **Low:** T > 1 and T ≤ alert_days (default 3)
- **Normal:** T > alert_days
