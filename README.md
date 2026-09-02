# SIH 2026 Problem Statement Tracker

> Congratulations. You found my repo. Gold star for you.

## Why Are You Here

No seriously. Why are you here. This is mine. I made it for me. You weren't supposed to find this. Please close this tab.


## What Even Is This

It's a dashboard. It tracks SIH 2026 problem statements. It tells me which ones are low competition so I can pick a good one. It's a **personal tool for my personal hackathon strategy** and you are not invited.

But since you're clearly not leaving — it scrapes `sih.gov.in/sih2026PS` every 6 hours, shows submission counts, velocity spikes, and capacity data. Recharts graphs. Doodle aesthetic. Very cute. You can't have it.

## How To Run It

```bash
npm install
npm run dev
```

It'll boot at `http://localhost:5173`. You're welcome, I guess.

```bash
npm run scrape      # fetches live data from the official portal
npm run seed-history # fills in realistic fake history so the graphs look nice
npm run build       # production build for Vercel
```

## Why Does The History Look Fake

Because **I just built this** and there are 0 days of real history yet. The seed script generates plausible trajectories so I can actually see what the Δ24h velocity charts will look like. Sue me.

Real data accumulates every 6 hours automatically once it's deployed.

## The GitHub Action

`.github/workflows/scrape.yml` runs on a cron every 6 hours and auto-commits data changes. It will not run until you push this to GitHub with the right permissions. Which you shouldn't do because this is MY repo.

## Is The Data Real

- **Problem statement metadata (titles, IDs, orgs, themes):** 100% live from the official SIH portal ✅
- **History snapshots (last 7 days of graphs):** Seeded for development preview. Run `npm run scrape` for the real thing.

## Legal Disclaimer

This is unofficial. Not affiliated with SIH, AICTE, or the Government of India. Data sourced from `sih.gov.in` under CC BY 4.0. I'm just a person trying to pick a problem statement that 40 other teams haven't already staked out.

## Contributing

No.

## License

Mine.

---

*Please close this tab. Thank you for your cooperation.*
