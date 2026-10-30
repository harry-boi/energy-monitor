# Energy Consumption Monitoring and Prediction System

A web-based energy consumption monitoring and prediction system for a shared student residence operating with a single prepaid electricity meter.

Developed in accordance with the project specifications in **Chapters 1–4 of the project report**.

---

## ⚡ System Purpose & Features

- **Appliance Management:** Register appliances with their wattage ratings, quantities, estimated daily hours, and ON/OFF operating states.
- **Energy Consumption Estimation:** Calculates estimated load in kW and daily consumption in kWh using mathematical load modelling (Equations 3.1–3.3).
- **Prepaid Token Recharges:** Records electricity credit purchases, calculating real-time cost per kWh.
- **Meter Reading Reconciliation:** Records physical prepaid meter balances, calculating drift differences from software estimates.
- **Recharge Duration Prediction & Low-Energy Alerts:** Estimates remaining recharge duration in days and projects depletion dates, triggering Normal, Low, and Critical warnings.
- **Consumption Analysis & Reporting:** Visualizes daily trends with Recharts, analyzes appliance percentage shares, compares equal-length time periods, and produces print-ready consumption reports.

> **Note:** The system's figures are estimates derived from registered appliance parameters and caretaker usage entries; it does not physically measure electricity directly.

---

## 🛠️ Technology Stack (Table 4.1)

- **Language:** JavaScript / TypeScript (Node.js 18+)
- **Framework:** Next.js 14+ (App Router) with React
- **Styling:** Tailwind CSS (fully responsive for mobile and desktop)
- **Charts:** Recharts
- **Database & Auth:** PostgreSQL via Supabase (5 tables with Check Constraints & Row Level Security)
- **Deployment:** Vercel

---

## 📁 Project Structure & Deliverables

```
├── SPEC.md                      # Complete system specification
├── schema.sql                   # Listing A.2: Database schema & RLS policies
├── lib/
│   ├── calculations.js          # Listing A.1: Pure calculation functions (Eq 3.1 - 3.10)
│   ├── dataService.js           # Data access layer (Supabase + LocalStorage fallback)
│   └── supabase.js              # Supabase client setup
├── scripts/
│   ├── test-calculations.mjs    # Appendix B: Runs all 16 Table 4.3 acceptance tests
│   └── test-validation.mjs      # Runs Table 4.4 interface & validation tests
├── components/
│   ├── Navbar.js                # Top navigation bar with branding & quick sample reset
│   └── AuthGuard.js             # Access control guard
└── app/
    ├── page.js                  # Caretaker Dashboard (Figure 3.12)
    ├── appliances/page.js       # Appliance Management (Figure 3.7)
    ├── usage/page.js            # Daily Usage Form (Figure 3.8)
    ├── recharges/page.js        # Recharges & Meter Readings (Figures 3.9 & 3.10)
    ├── analysis/page.js         # Consumption Analysis & Appliance Share (Figure 3.13)
    ├── settings/page.js         # Alert Preferences Form (Figure 3.11)
    ├── reports/page.js          # Printable Report (Figure 3.14)
    └── login/page.js            # Caretaker Sign-in Form (Figure 3.6)
```

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Caretaker Credentials

The system comes pre-seeded with a sample student residence scenario (14–20 Oct 2026):

- **Email:** `caretaker@goodnesslodge.example`
- **Password:** `caretaker123`

*(A "Fill Demo Credentials" button is provided on the sign-in page for instant access.)*

---

## 🧪 Acceptance Testing

Run the automated test suite covering all **16 calculation test cases from Table 4.3** and all **12 validation and constraint rules from Table 4.4**:

```bash
npm test
```

### Verified Acceptance Tests (Table 4.3):
- **Test 1:** Estimated energy of an appliance (75W × 10, 8h = 6.0 kWh) — Passed
- **Test 2:** Total estimated daily energy (5 sample appliances = 14.8 kWh) — Passed
- **Test 3:** Estimated load (All ON: 3.75 kW; iron OFF: 1.75 kW) — Passed
- **Test 4:** Daily usage records for 14/10/2026 = 14.8 kWh — Passed
- **Test 5:** Cost per kWh (₦40,000 for 200 kWh = ₦200.00/kWh) — Passed
- **Test 6:** Balance without meter reading (200 - 103.2 = 96.8 kWh) — Passed
- **Test 7:** Meter reading as starting balance (90.0 kWh on 20/10, diff -6.8 kWh, next balance 75.2 kWh) — Passed
- **Test 8:** Normal prediction (Average 14.74 kWh, 6.57 days, 2026-10-26, Normal, ₦2,948.57/day) — Passed
- **Test 9:** Low alert (Balance 30 kWh, 2.03 days, Low) — Passed
- **Test 10:** Critical alert (Balance 10 kWh, 0.68 days, Critical) — Passed
- **Test 11:** Prediction without usage history (Appliance estimate 14.8 kWh, 6.76 days) — Passed
- **Test 12:** Balance cannot be negative (Balance 0 kWh, Critical) — Passed
- **Test 13:** 3-day average (14.53 kWh) — Passed
- **Test 14:** Analysis totals (103.2 kWh total, 14.74 avg, highest 17 Oct, lowest 16 Oct) — Passed
- **Test 15:** Appliance share and period change (Fans 40.5%, +5.3% change) — Passed
- **Test 16:** Depletion date after meter reading (5.10 days, 2026-10-26) — Passed

---

## 🗄️ Supabase Production Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and run `schema.sql`.
3. In **Authentication** → **Users**, invite or add `caretaker@goodnesslodge.example`.
4. In **Authentication** → **Providers** → **Email**, disable public sign-ups.
5. Create `.env.local` in this folder:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Deploy the project to [Vercel](https://vercel.com) and add the two environment variables.
