import fs from "node:fs";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const fail=message=>{console.error(`FAIL: ${message}`);process.exitCode=1};
const municipalities=read("data/municipalities-2026.json").municipalities;
const research=read("data/research-status.json").records;
const regulations=read("data/regulations.json").records;
const taxonomy=read("data/permit-taxonomy.json").permitTypes;
const reviews=read("data/review-queue.json").items;
const snapshots=read("data/source-snapshots.json").snapshots;
const batch001=read("data/research-batches/batch-001.json");
const batch002=read("data/research-batches/batch-002.json");
for(const schema of fs.readdirSync("schemas").filter(name=>name.endsWith(".json")))try{read(`schemas/${schema}`)}catch(error){fail(`invalid JSON schema ${schema}: ${error.message}`)}
if(research.length!==342)fail(`research queue must contain 342 records, got ${research.length}`);
if(new Set(research.map(item=>item.municipalityCode)).size!==342)fail("research municipality codes are not unique");
const municipalityCodes=new Set(municipalities.map(item=>item.code));
for(const item of research)if(!municipalityCodes.has(item.municipalityCode))fail(`research municipality ${item.municipalityCode} absent from CBS data`);
for(const code of municipalityCodes)if(!research.some(item=>item.municipalityCode===code))fail(`CBS municipality ${code} disappeared from research queue`);
const canonicalTypes=new Set(taxonomy.map(item=>item.canonicalType));
for(const record of regulations){
  if(!municipalityCodes.has(record.municipalityCode))fail(`${record.id}: invalid municipality code`);
  if(!canonicalTypes.has(record.canonicalType))fail(`${record.id}: invalid canonical permit type`);
  for(const url of [record.officialInformationUrl,record.officialApplicationUrl,record.officialRegulationUrl])if(url&&!url.startsWith("https://"))fail(`${record.id}: official URL is not HTTPS`);
  if(record.officialInformationUrl===record.officialApplicationUrl&&record.applicationUrlStatus!=="same-as-info-verified")fail(`${record.id}: duplicate info/application URL lacks explicit verification`);
  if(!record.verification||!record.verification.legalReview)fail(`${record.id}: verification layers missing`);
  if(record.verification.legalReview.status==="approved")fail(`${record.id}: legal review may not be automatically approved`);
  if(!record.evidence?.length)fail(`${record.id}: verified claim has no evidence`);
  for(const evidence of record.evidence)if(!evidence.url?.startsWith("https://"))fail(`${record.id}: evidence metadata missing official HTTPS URL`);
  if(record.temporal.status==="expired"&&record.verification.currentness.status==="verified-current")fail(`${record.id}: expired record treated as current`);
  if(record.conflictStatus!=="none-found"&&(record.verification.content.status==="verified"||record.verification.currentness.status==="verified-current"))fail(`${record.id}: conflict record marked fully verified`);
  for(const document of record.requiredDocuments){for(const key of ["name","requirement","description","responsibleAuthority","lastVerifiedAt","classification"])if(!document[key])fail(`${record.id}: required document metadata missing ${key}`);if(document.classification==="user-supplied-document"&&document.officialTemplateUrl)fail(`${record.id}: user-supplied document must not fabricate template URL`)}
  for(const document of record.applicationDocuments)if(!document.url?.startsWith("https://")||!document.classification||!document.lastVerifiedAt)fail(`${record.id}: application document metadata invalid`);
}
const knownResearchIds=new Set([...regulations.map(record=>record.id),...batch001.findings.map(finding=>finding.id),...batch002.findings.map(finding=>finding.id)]);
for(const review of reviews)if(!municipalityCodes.has(review.municipalityCode)||(review.regulationId&&!knownResearchIds.has(review.regulationId)))fail(`${review.id}: review queue reference invalid`);
for(const snapshot of snapshots){if(snapshot.httpStatus===403&&snapshot.automatedStatus!=="automated-check-blocked")fail(`${snapshot.id}: HTTP 403 incorrectly treated as broken`);if(snapshot.automatedStatus==="reachable"&&!snapshot.contentFingerprint)fail(`${snapshot.id}: reachable source lacks fingerprint`)}
const pilotCodes=new Set(["GM0518","GM0114","GM0546","GM0599"]);
if([...pilotCodes].some(code=>!research.some(item=>item.municipalityCode===code&&item.researchStatus==="partially-verified")))fail("one or more pilot municipality statuses changed");
const batchCodes=new Set(batch001.municipalities.map(item=>item.municipalityCode));
if(batchCodes.size!==10)fail(`batch 001 must contain exactly ten municipalities, got ${batchCodes.size}`);
if(batch001.municipalities.some(item=>!research.some(record=>record.municipalityCode===item.municipalityCode&&record.researchStatus!=="not-started")))fail("batch 001 status update incomplete");
if(!process.exitCode)console.log(`PASS pipeline: ${research.length} municipalities, ${taxonomy.length} permit types, ${regulations.length} pilot records, ${reviews.length} review items`);
