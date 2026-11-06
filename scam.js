// Rule-based scam check. Returns { score 0-100 (higher = safer), verdict, flags[] }
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|webmail|mail)\.[a-z.]+/i;
const rules = [
  { re: /(registration|application|admin|training|uniform|deposit|joining|processing|medical|police clearance|vetting)\s+(fee|cost|payment)|pay\s+(a|an|the)?\s*(small\s+)?fee|upfront|send\s+money|buy\s+(your\s+own\s+)?(starter|kit|equipment)|r\s?\d[\d ,.]*\s*(to|for)\s+(register|apply|start)/i, pts: 45, msg: "Asks you to pay a fee. Real employers never charge applicants." },
  { re: /(bank(ing)? details|bank account number|pin number|otp|copy of (your )?id|id copy|passport copy)\b.*(send|submit|email|whatsapp)|(send|submit|email|whatsapp).*(bank(ing)? details|id copy|copy of (your )?id)/i, pts: 30, msg: "Wants ID or banking details before any interview." },
  { re: /(whatsapp|telegram|signal)\s*(only|us|number|now|on|:|\+?\d)|(apply|contact|send).{0,30}(whatsapp|telegram)|wa\.me|t\.me\//i, pts: 22, msg: "Pushes you to WhatsApp or Telegram instead of a company channel." },
  { re: /guaranteed\s+(income|job|salary|earnings)|earn\s+(up to\s+)?r?\s?\d[\d ,.]*\s*(k|000)?\s*(per|a|\/)\s*(day|week)|make money (fast|from home)|no\s+experience\s+(needed|required)[^.]{0,60}(r\s?\d{2,}|high|big)/i, pts: 22, msg: "Promises unrealistic or guaranteed income." },
  { re: /\b(urgent(ly)?|limited\s+(spots|positions)|apply\s+(now\s+)?immediately|first\s+come|hurry|today\s+only)\b/i, pts: 8, msg: "Uses pressure and urgency." },
  { re: /(bit\.ly|tinyurl|goo\.gl|cutt\.ly|shorturl|rb\.gy|forms\.gle|wa\.me)\//i, pts: 12, msg: "Contains a shortened or generic link." },
  { re: /(work\s+from\s+home).{0,80}(data\s*entry|typing|capture).{0,80}(r\s?\d{4,}|\d{4,})|\b(typing|captcha|copy.?paste)\s+jobs?\b/i, pts: 15, msg: "Looks like a typical work-from-home data-entry scam." },
  { re: /\b(dear (applicant|candidate|sir|madam)|congratulations|you (have been|are) (selected|shortlisted|hired))\b/i, pts: 12, msg: "Generic or 'you are hired' wording with no interview." },
];
const ENTRY = /(receptionist|data\s*captur|data\s*entry|admin|clerk)/i;

function analyze({ title = "", company = "", description = "", url = "", contact = "", salaryMonthly = null }) {
  const text = `${title}\n${company}\n${description}\n${contact}`;
  let score = 100;
  const flags = [];
  const good = [];
  for (const r of rules) if (r.re.test(text)) { score -= r.pts; flags.push(r.msg); }
  if (FREE_MAIL.test(text)) { score -= 15; flags.push("Uses a free email address (Gmail, Yahoo...) instead of a company email."); }
  if (!company || /confidential|private (advertiser|employer)|undisclosed/i.test(company)) { score -= 12; flags.push("Employer name is missing or hidden."); }
  else good.push("Employer is named.");
  if (description && description.length < 120) { score -= 8; flags.push("Very little detail about the role."); }
  if (salaryMonthly && ENTRY.test(title) && salaryMonthly > 40000) { score -= 15; flags.push("Salary is unusually high for this kind of role."); }
  if (/[A-Z]{12,}/.test(title) || /!{2,}/.test(text)) { score -= 5; flags.push("Shouting capitals or lots of exclamation marks."); }
  if (url && /^https:\/\//i.test(url)) good.push("Listed on a job board with a tracked link.");
  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 75 ? "legit" : score >= 45 ? "caution" : "scam";
  if (!flags.length) good.push("No common scam red flags found.");
  return { score, verdict, flags, good };
}
module.exports = { analyze };
