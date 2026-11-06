# My Agent

Searches admin, data capture, team leader and receptionist jobs paying R8,000+ per month, then scores every ad for scam red flags. You can also paste any ad to check it.

## Deploy on Render
1. Get free keys at https://developer.adzuna.com (App ID + App Key).
2. Push this folder to a GitHub repo.
3. Render > New > Blueprint (uses render.yaml) or New > Web Service.
   Build: `npm install`   Start: `npm start`
4. Add env vars: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (optional `COUNTRY`, default `za`).

## Run locally
```
npm install
ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy npm start
```
Open http://localhost:3000

## Note
Scores are red-flag checks, not a guarantee. Never pay to get a job, and verify the company before sharing ID or banking details.
