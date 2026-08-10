import fs from 'node:fs/promises';

const input=JSON.parse(await fs.readFile('data/research-batches/batch-005-registry-enrichment.json','utf8'));
const taxonomy=JSON.parse(await fs.readFile('data/permit-taxonomy.json','utf8'));
const TYPES=[
 ['opkoopbescherming',/opkoopbescherm|woning kopen.*verhur|verhuurvergunning-opkoop/i],
 ['huisvestingsvergunning',/huisvestingsvergunning/i],
 ['omzetting-kamerverhuur',/omzettingsvergunning|kamerverhuur|woningdelen|kamergewijze/i],
 ['woningvorming',/woningvorming|woning.?splitsen|woningsplits/i],
 ['splitsing',/splitsingsvergunning|kadastra.*splits/i],
 ['onttrekking-samenvoeging',/onttrekkingsvergunning|onttrekken.*woon|samenvoeg/i],
 ['leegstand',/leegstand/i],
 ['vakantieverhuur-shortstay',/vakantieverhuur|short.?stay/i],
 ['verhuurvergunning-wgv',/wet.?goed.?verhuurderschap|verhuurvergunning|verhuurderschap/i]
];
const NOISE=[/zaalverhuur/i,/onderwijshuisvesting/i,/grondwater/i,/weiland/i,/woonruimte.*(vogel|gevleugel)/i,/subsidie/i,/ouderenhuisvesting/i,/statushouder/i];
const classify=url=>{
 const text=decodeURIComponent(url).replace(/[-_/]+/g,' ');
 if(NOISE.some(r=>r.test(text)))return null;
 const hits=TYPES.filter(([,r])=>r.test(text)).map(([t])=>t);
 return hits.length?hits:null;
};
const records=input.records.map(r=>{
 const candidates=[];
 for(const url of r.reachableCandidates||[]){const permitTypes=classify(url);if(permitTypes)candidates.push({url,permitTypes,sourceClass:'municipal-site',official:true,verificationStatus:'candidate-only'});}
 const types=[...new Set(candidates.flatMap(x=>x.permitTypes))];
 return {municipalityCode:r.municipalityCode,municipalityName:r.municipalityName,municipalSite:r.municipalSite,candidateCount:candidates.length,candidatePermitTypes:types,candidates,route:candidates.length?'structured-verification':'deep-verification-needed'};
});
const structured=records.filter(r=>r.route==='structured-verification');
const out={schemaVersion:'1.0.0',batchId:'batch-005-semantic-triage',generatedAt:new Date().toISOString(),sourceBatch:input.batchId,records,summary:{municipalities:records.length,structuredVerification:structured.length,deepVerificationNeeded:records.length-structured.length,totalRelevantCandidates:records.reduce((n,r)=>n+r.candidateCount,0)},safety:{candidateIsNotLegalFinding:true,publicRulesCreated:0,negativeLegalConclusions:0}};
await fs.writeFile('data/research-batches/batch-005-semantic-triage.json',JSON.stringify(out,null,2)+'\n');
const rows=records.map(r=>`| ${r.municipalityName} | ${r.candidateCount} | ${r.candidatePermitTypes.join(', ')||'—'} | ${r.route} |`).join('\n');
await fs.writeFile('docs/research-batches/batch-005-semantic-triage.md',`# Batch 005 — semantische triage\n\nKandidaatlinks zijn gefilterd op de Woningencheck-vergunningtaxonomie. Een kandidaat is nog geen juridisch geverifieerde regel.\n\n| Gemeente | Relevante kandidaten | Mogelijke typen | Route |\n| --- | ---: | --- | --- |\n${rows}\n\n## Samenvatting\n\n- Structurele verificatie: ${structured.length}\n- Diepe verificatie: ${records.length-structured.length}\n- Relevante kandidaatlinks: ${out.summary.totalRelevantCandidates}\n- Publieke regels: 0\n`);
console.log(JSON.stringify(out.summary));
