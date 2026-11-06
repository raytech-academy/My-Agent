const $ = (id) => document.getElementById(id);
const LABEL = { legit: "Looks legit", caution: "Be careful", scam: "Likely scam" };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
const rand = (n) => "R" + Number(n).toLocaleString("en-ZA");

function flagList(check) {
  const d = el("details");
  d.appendChild(el("summary", "", `Safety check: ${check.score}/100`));
  const ul = el("ul");
  check.flags.forEach((f) => ul.appendChild(el("li", "", "⚠ " + f)));
  check.good.forEach((g) => ul.appendChild(el("li", "", "✓ " + g)));
  d.appendChild(ul);
  return d;
}

function jobCard(j) {
  const li = el("li", "job " + j.check.verdict);
  const main = el("div");
  main.appendChild(el("h2", "", j.title));
  const meta = el("div", "meta");
  meta.appendChild(el("span", "", j.company || "Employer not named"));
  if (j.location) meta.appendChild(el("span", "", j.location));
  meta.appendChild(el("span", "", j.role));
  if (j.created) meta.appendChild(el("span", "", "Posted " + new Date(j.created).toLocaleDateString("en-ZA")));
  main.appendChild(meta);
  li.appendChild(main);

  const pay = j.monthlyMax
    ? `${j.monthlyMin && j.monthlyMin !== j.monthlyMax ? rand(j.monthlyMin) + " – " : ""}${rand(j.monthlyMax)} per month${j.predicted ? " (estimated)" : ""}`
    : "Pay not listed";
  li.appendChild(el("div", "pay", pay));
  li.appendChild(el("p", "snip", j.snippet));
  li.appendChild(flagList(j.check));

  const side = el("div", "side");
  side.appendChild(el("span", "badge " + j.check.verdict, LABEL[j.check.verdict]));
  const a = el("a", "apply", "View and apply");
  a.href = j.url; a.target = "_blank"; a.rel = "noopener noreferrer nofollow";
  side.appendChild(a);
  li.appendChild(side);
  return li;
}

$("filters").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter || e.target.querySelector("button");
  const q = new URLSearchParams({
    role: $("role").value, minPay: $("minPay").value || "8000", location: $("location").value.trim(),
    hideRisky: $("hideRisky").checked ? "1" : "0", unlisted: $("unlisted").checked ? "1" : "0",
  });
  btn.disabled = true; $("status").textContent = "Searching and checking each ad…"; $("list").replaceChildren();
  try {
    const r = await fetch("/api/jobs?" + q);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Something went wrong.");
    $("status").textContent = data.count
      ? `${data.count} job${data.count === 1 ? "" : "s"} found, safest first.`
      : "No jobs matched. Try a wider town, a lower minimum pay, or include ads with no pay listed.";
    $("list").replaceChildren(...data.jobs.map(jobCard));
  } catch (err) {
    $("status").textContent = err.message;
  } finally { btn.disabled = false; }
});

$("checkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = $("checkOut");
  out.replaceChildren(el("p", "", "Checking…"));
  try {
    const r = await fetch("/api/check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: $("cTitle").value, company: $("cCompany").value, contact: $("cContact").value, text: $("cText").value }),
    });
    const c = await r.json();
    if (!r.ok) throw new Error(c.error);
    const box = el("div", "verdict");
    box.appendChild(el("span", "badge " + c.verdict, LABEL[c.verdict]));
    box.appendChild(el("div", "big", `${c.score}/100 safety score`));
    const ul = el("ul");
    c.flags.forEach((f) => ul.appendChild(el("li", "", "⚠ " + f)));
    c.good.forEach((g) => ul.appendChild(el("li", "", "✓ " + g)));
    box.appendChild(ul);
    out.replaceChildren(box);
  } catch (err) { out.replaceChildren(el("p", "", err.message)); }
});

const tabs = { find: [$("tab-find"), $("panel-find")], check: [$("tab-check"), $("panel-check")] };
Object.entries(tabs).forEach(([k, [t]]) => t.addEventListener("click", () => {
  Object.entries(tabs).forEach(([k2, [t2, p2]]) => { t2.setAttribute("aria-selected", k === k2); p2.hidden = k !== k2; });
}));
