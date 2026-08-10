import fs from 'node:fs/promises';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const batch=await read('data/research-batches/batch-004-registry-recheck.json');
const registry=await read('data/source-registry/bronregister-342.json');
const targets=batch.records.filter(r=>r.route==='deep-verification-needed');
if(targets.length!==4) throw new Error(`Expected 4 deep-verification municipalities, got ${targets.length}`);
const regByCode=new Map(registry.records.map(r=>[r.municipalityCode,r]));
const UA='WoningencheckDeepVerificationBot/1.0 (+https://woningencheck.nl)';
const terms=['huisvestingsverordening','opkoopbescherming','kamerverhuur omzettingsvergunning','splitsingsvergunning woningvorming','onttrekkingsvergunning woonruimte','leegstandsverordening','verhuurvergunning goed verhuurderschap','vakantieverhuur short stay'];
let requests=0,errors=0;
const fetchText=async url=>{requests++;try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':UA}});return{ok:r.ok,status:r.status,url:r.url,text:await r.text()}}catch(e){errors++;return{ok:false,status:'error',url,text:'',error:String(e)}}};
const cvdrs=text=>[...new Set([...text.matchAll(/https:\/\/lokaleregelgeving\.overheid\.nl\/CVDR\d+/gi)].map(m=>m[0]))];
const links=(html,base)=>{const out=[];for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{out.push(new URL(m[1],base).href)}catch{}}return[...new Set(out)]};
const records=[];
for(const t of targets){
 const rr=regByCode.get(t.municipalityCode);const municipal=(rr?.sources||[]).find(s=>s.sourceClass==='municipal-site')?.url||null;
 const publicationSearch=[];const regulationLinks=new Set();
 for(const term of terms){const q=`${t.municipalityName} ${term}`,url=`https://lokaleregelgeving.overheid.nl/zoeken?query=${encodeURIComponent(q)}`,r=await fetchText(url);const found=r.ok?cvdrs(r.text):[];found.forEach(x=>regulationLinks.add(x));publicationSearch.push({query:q,url,status:r.status,foundCvdr:found});}
 const municipalSearch=[];if(municipal){
  const home=await fetchText(municipal);const homeLinks=home.ok?links(home.text,home.url):[];
  for(const term of ['huisvest','verhuur','opkoop','kamer','splits','onttrek','leegstand']){const matches=homeLinks.filter(u=>decodeURIComponent(u).toLowerCase().includes(term)).slice(0,5);municipalSearch.push({term,matches});}
 }
 const knownSources=(rr?.sources||[]).filter(s=>s.official).map(s=>({url:s.url,sourceClass:s.sourceClass,descriptors:s.descriptors||[]}));
 const gisSources=knownSources.filter(s=>/gis|arcgis|wfs|wms|map|feature/i.test(`${s.sourceClass} ${s.url}`));
 const status=regulationLinks.size?'official-regulation-candidate-found':'manual-legal-source-review-required';
 records.push({municipalityCode:t.municipalityCode,municipalityName:t.municipalityName,municipalSite:municipal,registrySources:knownSources,officialPublicationSearch:publicationSearch,officialRegulationCandidates:[...regulationLinks],municipalHomepageSearch:municipalSearch,gisCandidates:gisSources,verificationStatus:status,negativeLegalConclusion:false,publicOutputCreated:false});
}
const summary={municipalities:records.length,withRegulationCandidates:records.filter(r=>r.officialRegulationCandidates.length).length,manualLegalSourceReviewRequired:records.filter(r=>!r.officialRegulationCandidates.length).length,withGisCandidate:records.filter(r=>r.gisCandidates.length).length,networkRequests:requests,networkErrors:errors};
const output={schemaVersion:'1.0.0',batchId:'batch-004-deep-verification',generatedAt:new Date().toISOString(),records,summary,safety:{absenceOfDiscoveryIsNotAbsenceOfRegulation:true,publicRulesCreated:0,negativeLegalConclusions:0}};
await write('data/research-batches/batch-004-deep-verification.json',output);
const rows=records.map(r=>`| ${r.municipalityName} | ${r.officialRegulationCandidates.length} | ${r.gisCandidates.length} | ${r.verificationStatus} |`).join('\n');
await fs.writeFile('docs/research-batches/batch-004-deep-verification.md',`# Batch 004 — diepe verificatie\n\nDe vier gemeenten zonder bruikbare kandidaatpagina uit de eerste website/sitemaplaag zijn apart onderzocht via gerichte officiële-publicatiezoeking, het landelijke bronregister en eventuele GIS-bronnen. Geen leeg zoekresultaat wordt als afwezigheid van regelgeving geïnterpreteerd.\n\n| Gemeente | Regelingskandidaten | GIS-kandidaten | Status |\n| --- | ---: | ---: | --- |\n${rows}\n\n## Samenvatting\n\n- Gemeenten: ${summary.municipalities}\n- Met officiële regelingskandidaat: ${summary.withRegulationCandidates}\n- Handmatige juridische bronreview nodig: ${summary.manualLegalSourceReviewRequired}\n- Met GIS-kandidaat: ${summary.withGisCandidate}\n- Netwerkrequests: ${summary.networkRequests}\n- Netwerkerrors: ${summary.networkErrors}\n- Publieke regels: 0\n`);
console.log(JSON.stringify(summary,null,2));
// Trigger marker: Batch 004 deep verification.
