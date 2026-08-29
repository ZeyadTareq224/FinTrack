# FinOS v5

A local-first personal finance operating system built around one canonical financial model.

## What changed in v5
- One source of truth for balances, goals, budgets, card debt, FIRE and net worth.
- Manual expenses update the selected cash account or credit-card balance immediately.
- Transfers update both sides and never count as spending.
- Goal progress is derived from linked accounts instead of a duplicated `funded` field.
- Category allocations must balance to the monthly spending target.
- Credit-card payment is a real money movement; an external-payment override is available.
- Closing a 28th→27th cycle saves a permanent report and net-worth snapshot.
- Historical CSV imports affect spending history but intentionally do not mutate today's balances.
- v4 data migrates automatically to the v5 schema in localStorage.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

Data is stored in browser localStorage under `finos-state-v5`.
