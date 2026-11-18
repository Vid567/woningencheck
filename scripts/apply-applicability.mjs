// Zet de gestructureerde vervolgvragen uit data/applicability-questions.json in data/regulations.json.
// Alleen na akkoord (publicationDecision.publicationAllowed === true), of met --preview voor een testbranch.
// Valideert elke vraag; faalt hard bij een onbekend record of een onvolledige vraag.
import fs from "node:fs";

export const ANSWER_TYPES = new Set(["yes-no", "yes-no-unknown"]);
export const OPERATORS = new Set(["equals", "in", "<=", "prefix-in"]);

export function validateApplicability(id, a) {
  const errors = [];
  for (const key of ["version", "conclusiveWhenMatched", "matchMessage", "conditions"]) if (a[key] === undefined) errors.push(`${id}: ${key} ontbreekt`);
  if (!Array.isArray(a.conditions) || !a.conditions.length) errors.push(`${id}: geen condities`);
  const seen = new Set();
  for (const c of a.conditions || []) {
    if (seen.has(c.id)) errors.push(`${id}: dubbele conditie ${c.id}`);
    seen.add(c.id);
    for (const key of ["id", "category", "conditionType", "source", "operator", "evidenceUrl", "evidenceSection"]) if (!c[key]) errors.push(`${id}/${c.id}: ${key} ontbreekt`);
    if (!OPERATORS.has(c.operator)) errors.push(`${id}/${c.id}: onbekende operator ${c.operator}`);
    if (c.source === "user-input") {
      if (!c.question?.endsWith("?")) errors.push(`${id}/${c.id}: vraag ontbreekt of eindigt niet op '?'`);
      if (!ANSWER_TYPES.has(c.answerType)) errors.push(`${id}/${c.id}: onbekend answerType ${c.answerType}`);
      if (!["yes", "no"].includes(c.value)) errors.push(`${id}/${c.id}: waarde moet yes of no zijn`);
      if (!c.noMatchMessage) errors.push(`${id}/${c.id}: noMatchMessage ontbreekt`);
      if (c.onNoMatch && c.onNoMatch !== "uncertain") errors.push(`${id}/${c.id}: onNoMatch moet 'uncertain' zijn`);
    } else if (!c.fact) errors.push(`${id}/${c.id}: fact ontbreekt bij officiële data`);
  }
  if (!a.conditions?.some(c => c.source === "user-input")) errors.push(`${id}: geen enkele vervolgvraag`);
  return errors;
}

export function loadApprovedApplicability(file = "data/applicability-questions.json", { preview = false } = {}) {
  if (!fs.existsSync(file)) return new Map();
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (doc.publicationDecision?.publicationAllowed !== true && !preview) return new Map();
  return new Map(Object.entries(doc.records || {}));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const preview = process.argv.includes("--preview");
  const file = "data/regulations.json";
  const regulations = JSON.parse(fs.readFileSync(file, "utf8"));
  const byId = new Map(regulations.records.map(r => [r.id, r]));
  const specs = loadApprovedApplicability(undefined, { preview });
  if (!specs.size) { console.log("apply-applicability: geen goedgekeurde vervolgvragen (gebruik --preview op een testbranch)."); process.exit(0); }
  const errors = [];
  let applied = 0;
  for (const [id, a] of specs) {
    const rec = byId.get(id);
    if (!rec) { errors.push(`${id}: onbekend record`); continue; }
    if (a.conditions?.[0]?.value && a.conditions[0].conditionType === "municipality" && a.conditions[0].value !== rec.municipalityCode) errors.push(`${id}: gemeentecode wijkt af`);
    errors.push(...validateApplicability(id, a));
    rec.applicability = a;
    applied++;
  }
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  fs.writeFileSync(file, JSON.stringify(regulations, null, 2) + "\n");
  console.log(`apply-applicability: vervolgvragen gezet bij ${applied} regels${preview ? " (preview, nog niet goedgekeurd)" : ""}.`);
}
