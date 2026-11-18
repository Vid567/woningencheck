// Zet handmatig onderzochte gemeentelijke regels (data/research-batches/manual/*.json)
// om naar volledige regelrecords in data/regulations.json, en werkt het bronregister
// (data/sources.json) en de onderzoeksstatus (data/research-status.json) bij.
//
// Idempotent: records met hetzelfde id worden vervangen, niet gedupliceerd.
// Alleen batches met publicationDecision.publicationAllowed === true worden doorgezet.
import fs from "node:fs";
import path from "node:path";
import { loadApprovedApplicability } from "./apply-applicability.mjs";

const read = p => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");

const CANONICAL = {
  opkoopbescherming: { canonicalType: "purchase-protection", municipalName: "Opkoopbescherming", permitType: "purchase-protection", goals: ["rent"] },
  omzettingsvergunning: { canonicalType: "conversion-permit", municipalName: "Omzettingsvergunning", permitType: "conversion-permit", goals: ["rooms"] },
  splitsingsvergunning: { canonicalType: "building-split", municipalName: "Splitsingsvergunning", permitType: "building-split", goals: ["split"] },
  woningvormingsvergunning: { canonicalType: "dwelling-formation", municipalName: "Woningvormingsvergunning", permitType: "dwelling-formation", goals: ["split"] },
  "omgevingsvergunning-splitsen": { canonicalType: "split-building-permit", municipalName: "Omgevingsvergunning woning splitsen", permitType: "dwelling-formation", goals: ["split"] },
  "omgevingsvergunning-kamerverhuur": { canonicalType: "room-rental", municipalName: "Omgevingsvergunning kamerverhuur", permitType: "room-rental", goals: ["rooms"] },
  verhuurvergunning: { canonicalType: "good-landlord-permit", municipalName: "Verhuurvergunning", permitType: "good-landlord-permit", goals: ["rent", "rooms"] }
};

const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const batchDir = "data/research-batches/manual";
const batches = fs.readdirSync(batchDir).filter(n => n.endsWith(".json")).sort().map(n => ({ file: path.join(batchDir, n).replaceAll("\\", "/"), data: read(path.join(batchDir, n)) }));

const municipalities = read("data/municipalities-2026.json").municipalities;
const byCode = new Map(municipalities.map(m => [m.code, m]));

const regulations = read("data/regulations.json");
const sources = read("data/sources.json");
const status = read("data/research-status.json");

const regById = new Map(regulations.records.map(r => [r.id, r]));
const srcById = new Map(sources.sources.map(s => [s.id, s]));
const statusByCode = new Map(status.records.map(r => [r.municipalityCode, r]));

// Goedgekeurde vervolgvragen (data/applicability-questions.json) blijven behouden als een regel opnieuw wordt opgebouwd.
const approvedApplicability = loadApprovedApplicability();

let added = 0, replaced = 0, skipped = 0;
const touched = new Set();

for (const { file, data } of batches) {
  if (data.publicationDecision?.publicationAllowed !== true) { skipped += (data.municipalities || []).length; continue; }
  const checked = data.checkedAt;
  for (const m of data.municipalities) {
    const ref = byCode.get(m.code);
    if (!ref) throw new Error(`${file}: onbekende gemeentecode ${m.code}`);
    if (ref.name !== m.name) throw new Error(`${file}: ${m.code} heet ${ref.name}, niet ${m.name}`);
    const authority = `Gemeente ${ref.name}`;
    const muniSlug = slug(ref.name);
    const reg = m.regulation || null;
    for (const r of m.rules) {
      const canon = CANONICAL[r.regulationType];
      if (!canon) throw new Error(`${file}: onbekend regulationType ${r.regulationType}`);
      const id = `${muniSlug}-${r.key}-2026`;
      const regulationUrl = r.regulationUrl || reg?.url || r.infoUrl;
      const docId = r.documentIdentifier || reg?.cvdr || "";
      const appUrl = r.applicationUrl || null;
      const appStatus = !appUrl ? "unresolved" : appUrl === r.infoUrl ? "same-as-info-verified" : "separate-verified";
      const forms = (r.forms || []).map(f => ({ label: f.label, url: f.url, classification: f.classification || "official-form", responsibleAuthority: authority, lastVerifiedAt: checked }));
      const requiredDocuments = (r.forms || []).filter(f => (f.classification || "official-form") === "official-form").map((f, i) => ({
        id: `${id}-required-${i + 1}`, name: f.label, requirement: "required", description: `Officieel aanvraagmiddel: ${f.label}`,
        officialInstructionsUrl: r.infoUrl, officialTemplateUrl: /\.pdf$|\/file\//i.test(f.url) ? f.url : null, onlineFormUrl: /\.pdf$|\/file\//i.test(f.url) ? null : f.url,
        responsibleAuthority: authority, lastVerifiedAt: checked, classification: "official-form"
      }));
      const evidence = [
        { claimId: `${id}-applicability`, claim: `${r.title}: ${r.shortDescription}`, evidenceType: "official-information", url: r.infoUrl, identifier: null, articleOrSection: r.infoSection || null, verifiedAt: checked, contentFingerprint: null }
      ];
      if (regulationUrl && regulationUrl !== r.infoUrl) evidence.push({ claimId: `${id}-legal-basis`, claim: `Juridische basis: ${reg?.title || r.title}${r.section ? `, ${r.section}` : ""}`, evidenceType: "official-regulation", url: regulationUrl, identifier: docId || null, articleOrSection: r.section || null, verifiedAt: checked, contentFingerprint: null });
      if (appUrl) evidence.push({ claimId: `${id}-application`, claim: `Officiële aanvraagroute voor ${r.title}`, evidenceType: "official-application", url: appUrl, identifier: null, articleOrSection: null, verifiedAt: checked, contentFingerprint: null });
      const scopeIsMunicipality = r.scopeType === "gemeente" && !r.scopeExcludes;
      const record = {
        id, municipalityCode: m.code, municipalityName: ref.name, title: r.title, regulationType: r.regulationType,
        scopeType: r.scopeType, scopeValue: r.scopeValue, shortDescription: r.shortDescription, conditions: r.conditions, exceptions: r.exceptions || "Geen aanvullende uitzonderingen gevonden op de officiële pagina; raadpleeg de regeling.",
        officialInformationUrl: r.infoUrl, officialApplicationUrl: appUrl, applicationUrlStatus: appStatus, applicationUrlVerifiedDate: appUrl ? checked : null,
        requiredDocuments, applicationDocuments: forms,
        officialRegulationUrl: regulationUrl, documentIdentifier: docId,
        effectiveDate: r.effectiveDate || reg?.validFrom || null, endDate: r.endDate || null, sourcePublicationDate: null, lastVerificationDate: checked,
        sourceVerificationStatus: "verified live", legalReviewStatus: "not reviewed",
        canonicalType: canon.canonicalType, municipalName: canon.municipalName, goals: r.goals || canon.goals,
        temporal: { validFrom: r.effectiveDate || reg?.validFrom || null, validUntil: r.endDate || null, supersededBy: null, previousVersion: null, lastCheckedAt: checked, status: r.temporalStatus || "current" },
        verification: {
          url: { status: "verified", checkedAt: checked },
          source: { status: "verified-official", checkedAt: checked },
          content: { status: r.contentStatus || "verified", checkedAt: checked },
          currentness: { status: r.currentnessStatus || "verified", checkedAt: checked },
          application: { status: appStatus, checkedAt: checked },
          documents: { status: forms.length ? "verified" : "not-applicable", checkedAt: checked },
          legalReview: { status: "not-reviewed", reviewedAt: null, reviewedBy: null }
        },
        evidence, conflictStatus: r.conflict ? "conflict — manual review required" : "none-found", conflicts: r.conflict ? [r.conflict] : [],
        geographicScopeReview: scopeIsMunicipality ? "fully-verified" : "partially-verified",
        notes: [r.notes, r.leges ? `Leges: ${r.leges}.` : null, `Handmatig onderzocht ${checked} (${data.batch}).`].filter(Boolean).join(" ")
      };
      if (r.geoConditions) {
        record.geographicScope = { operator: "OR", validFrom: record.effectiveDate, validUntil: r.endDate || null, supersededBy: null, sourceVersion: docId || regulationUrl, lastVerifiedDate: checked,
          conditions: r.geoConditions.map(c => ({ ...c, evidence: [{ municipalityCode: m.code, url: regulationUrl, section: r.section || null }] })) };
        record.geographicScopeReview = "verified";
      } else if (scopeIsMunicipality) record.geographicScope = {
        operator: "AND", validFrom: record.effectiveDate, validUntil: null, supersededBy: null, sourceVersion: docId || regulationUrl, lastVerifiedDate: checked,
        conditions: [{ type: "municipality", operator: "equals", value: m.code, evidence: [{ municipalityCode: m.code, url: regulationUrl, section: r.section || null }] }]
      };
      const applicability = approvedApplicability.get(id) || regById.get(id)?.applicability;
      if (applicability) record.applicability = applicability;
      if (regById.has(id)) replaced++; else added++;
      regById.set(id, record);

      for (const [kind, url] of [["info", r.infoUrl], ["regulation", regulationUrl !== r.infoUrl ? regulationUrl : null]]) {
        if (!url) continue;
        const sid = `${muniSlug}-${r.key}-${kind}`;
        srcById.set(sid, { id: sid, municipalityCode: m.code, regulationType: r.regulationType, url, authority, official: true, lastChecked: checked, liveStatus: "live", regulationStatus: "current", manualReviewRequired: false });
      }
    }
    // hercontrole zonder inhoudelijke wijziging: alleen controledata bijwerken, record (incl. gebiedsdata) blijft intact
    for (const rv of m.reverified || []) {
      const rec = regById.get(rv.id);
      if (!rec) throw new Error(`${file}: reverified onbekend record ${rv.id}`);
      if (rec.municipalityCode !== m.code) throw new Error(`${file}: reverified ${rv.id} hoort niet bij ${m.code}`);
      rec.lastVerificationDate = checked;
      if (rec.temporal) rec.temporal.lastCheckedAt = checked;
      for (const k of ["url", "source", "content", "currentness", "application", "documents"]) if (rec.verification?.[k]) rec.verification[k].checkedAt = checked;
      if (rv.currentnessStatus && rec.verification?.currentness) rec.verification.currentness.status = rv.currentnessStatus;
      for (const e of rec.evidence || []) if (rv.urlsChecked?.includes(e.url)) e.verifiedAt = checked;
      const rvNote = rv.note ? `Hercontrole ${checked}: ${rv.note}` : null;
      if (rvNote && !(rec.notes || "").includes(rvNote)) rec.notes = [rec.notes, rvNote].filter(Boolean).join(" "); // idempotent bij herhaald draaien
      replaced++;
    }
    // onderzoeksstatus
    const st = statusByCode.get(m.code);
    if (st) {
      const permitTypes = [...new Set([...(st.researchedPermitTypes || []), ...m.rules.map(r => CANONICAL[r.regulationType].permitType).filter(Boolean), ...(m.researchedWithoutRule || [])])];
      Object.assign(st, {
        researchStatus: (m.unresolved || []).length ? "partially-verified" : "verified",
        researchStartedAt: st.researchStartedAt || checked, researchCompletedAt: checked, lastCheckedAt: checked,
        nextReviewAt: m.nextReviewAt || data.nextReviewAt || "2027-01-01", researchedPermitTypes: permitTypes, unresolvedQuestions: m.unresolved || [],
        sourceCount: [...srcById.values()].filter(s => s.municipalityCode === m.code).length,
        notes: m.statusNote || `Handmatig bronnenonderzoek ${checked} (${data.batch}): opkoopbescherming, kamerverhuur/omzetting, splitsen/woningvorming, leges en aanvraagroute.`
      });
    }
    touched.add(m.code);
  }
}

regulations.records = [...regById.values()].sort((a, b) => a.municipalityName.localeCompare(b.municipalityName, "nl") || a.id.localeCompare(b.id));
sources.sources = [...srcById.values()];
write("data/regulations.json", regulations);
write("data/sources.json", sources);
write("data/research-status.json", status);
console.log(`apply-manual-research: ${touched.size} gemeenten, ${added} regels toegevoegd, ${replaced} vervangen, ${skipped} niet doorgezet (geen publicatiebesluit). Totaal ${regulations.records.length} regels, ${sources.sources.length} bronnen.`);
