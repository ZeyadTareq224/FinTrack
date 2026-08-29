# FinOS v3

Personal finance operating system built around Zeyad's actual rules and priorities.

## Core behavior
- Financial cycle: 28th → 27th.
- Spending target: 7,303 EGP with separate, granular buckets.
- Retirement minimum: 6,500 EGP/month, funded before goals.
- Liquid reserve rule: keep at least 10,000 EGP.
- Credit card modeled as a liability and paid in full monthly.
- Priority order: Home renovation → First 1M net-worth milestone → Marriage/honeymoon.
- Renovation target: 350,000 EGP, desired 2027-01-01.
- Honeymoon target: 100,000 EGP.
- Physical gold: 20g 24K, with manual EGP/g input so net worth is not guessed.
- "Can I afford it?" estimates whether a purchase fits the current cycle and how many days it may delay the next goal.

## Run
```bash
npm install
npm run dev
```

Data is currently stored in browser localStorage only.
