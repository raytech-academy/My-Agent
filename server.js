const express = require("express");
const path = require("path");
const { analyze } = require("./scam");

const app = express();
const PORT = process.env.PORT || 3000;
const COUNTRY = (process.env.COUNTRY || "za").toLowerCase();
const ROLES = ["admin", "data capture", "team leader", "receptionist"];
const cache = new Map();

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.send("ok"));

async function fetchRole(role, location, page) {
  const p = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY,
    results_per_page: "20", what_phrase: role, sort_by: "date", max_days_old: "30",
    "content-type": "application/json",
  });
  if (location) p.set("where", location);
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/${page}?${p}`);
  if (!r.ok) throw new Error(`Job source returned ${r.status}`);
  return (await r.json()).results || [];
}

app.get("/api/jobs", async (req, res) => {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY)
    return res.status(500).json({ error: "Job source not set up. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Render > Environment." });
  const minPay = Math.max(0, parseInt(req.query.minPay, 10) || 8000);
  const location = String(req.query.location || "").slice(0, 60);
  const wanted = String(req.query.role || "all");
  const hideRisky = req.query.hideRisky !== "0";
  const includeUnlisted = req.query.unlisted === "1";
  const roles = wanted === "all" ? ROLES : ROLES.filter((r) => r === wanted);
  const key = JSON.stringify([roles, location]);
  try {
    let raw = cache.get(key);
    if (!raw || Date.now() - raw.t > 10 * 60 * 1000) {
      const lists = await Promise.all(roles.map((r) => fetchRole(r, location, 1).then((l) => l.map((j) => ({ ...j, _role: r })))));
      raw = { t: Date.now(), data: lists.flat() };
      cache.set(key, raw);
    }
    const seen = new Set();
    const jobs = [];
    for (const j of raw.data) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      const hi = j.salary_max || j.salary_min || 0;
      const monthlyMax = hi ? Math.round(hi / 12) : null;
      const monthlyMin = j.salary_min ? Math.round(j.salary_min / 12) : null;
      if (monthlyMax === null && !includeUnlisted) continue;
      if (monthlyMax !== null && monthlyMax < minPay) continue;
      const check = analyze({
        title: j.title, company: j.company?.display_name, description: j.description,
        url: j.redirect_url, salaryMonthly: monthlyMax,
      });
      if (hideRisky && check.verdict === "scam") continue;
      jobs.push({
        id: j.id, title: (j.title || "").replace(/<[^>]+>/g, ""), company: j.company?.display_name || "",
        location: j.location?.display_name || "", role: j._role, created: j.created,
        monthlyMin, monthlyMax, predicted: j.salary_is_predicted === "1",
        snippet: (j.description || "").replace(/<[^>]+>/g, ""), url: j.redirect_url, check,
      });
    }
    jobs.sort((a, b) => b.check.score - a.check.score || new Date(b.created) - new Date(a.created));
    res.json({ count: jobs.length, jobs });
  } catch (e) {
    res.status(502).json({ error: "Could not reach the job source. Try again in a minute." });
  }
});

app.post("/api/check", (req, res) => {
  const b = req.body || {};
  const text = String(b.text || "").slice(0, 8000);
  if (text.trim().length < 20) return res.status(400).json({ error: "Paste the full job ad (at least a few sentences)." });
  res.json(analyze({ title: String(b.title || ""), company: String(b.company || ""), description: text, contact: String(b.contact || "") }));
});

app.listen(PORT, () => console.log(`My Agent running on ${PORT}`));
