import fs from 'node:fs/promises';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const structured=await read('data/research-batches/batch-004-structured-verification.json');
const deep=await read('data/research-batches/batch-004-deep-verification.json');
const pending=structured.records.filter(r=>r.verificationStatus==='research-pending-review');
if(pending.length!==20) throw new Error(`Expected 20 pending structured records, got ${pending.length}`);
const UA='WoningencheckGapClosureBot/1.0 (+https://woningencheck.nl)';
let requests=0,errors=0;
const fetchText=async url=>{requests++;try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':UA}});return{ok:r.ok,status:r.status,url:r.url,text:await r.text()}}catch(e){errors++;return{ok:false,status:'error',url,text:'',error:String(e)}}};
const htmlText=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const cvdrIds=s=>[...new Set([...s.matchAll(/CVDR\d+/gi)].map(m=>m[0].toUpperCase()))];
const termMap={
 'housing-permit':'huisvestingsvergunning',
 'purchase-protection':'opkoopbescherming',
 'good-landlord-permit':'verhuurvergunning goed verhuurderschap',
 'room-rental':'kamerverhuur omzettingsvergunning',
 'dwelling-formation':'woningvorming woningsplitsing',
 'building-split':'splitsingsvergunning',
 'withdrawal-merger':'onttrekkingsvergunning samenvoeging woonruimte',
 'vacancy-obligation':'leegstandsverordening',
 'holiday-rental':'vakantieverhuur short stay'
};
const genericTerms=['huisvestingsverordening','opkoopbescherming','kamerverhuur omzettingsvergunning','woningvorming splitsingsvergunning','onttrekkingsvergunning','leegstandsverordening','verhuurvergunning goed verhuurderschap'];
const records=[];
for(const r of pending){
 const terms=[...new Set([...(r.candidatePermitTypes||[]).map(t=>termMap[t]).filter(Boolean),...genericTerms])].slice(0,8);
 const searches=[];const candidates=new Set(r.officialRegulationLinks||[]);
 for(const term of terms){
   const q=`${r.municipalityName} ${term}`;
   const u=`https://lokaleregelgeving.overheid.nl/zoeken?query=${encodeURIComponent(q)}`;
   const res=await fetchText(u);
   const ids=res.ok?cvdrIds(res.text):[];
   ids.forEach(id=>candidates.add(`https://lokaleregelgeving.overheid.nl/${id}`));
   searches.push({query:q,url:u,status:res.status,cvdrIds:ids});
 }
 const checkedRegulations=[];
 for(const url of [...candidates].slice(0,8)){
   const res=await fetchText(url);if(!res.ok){checkedRegulations.push({url,status:res.status,reachable:false});continue}
   const text=htmlText(res.text).slice(0,120000).toLowerCase();
   const nameTokens=r.municipalityName.toLowerCase().replace(/[().]/g,' ').split(/\s+/).filter(x=>x.length>2);
   const authorityMatch=nameTokens.some(t=>text.includes(t));
   const signals={effective:/in werking|inwerkingtred|geldend/.test(text),exceptions:/uitzonder|vrijstell|ontheff/.test(text),geography:/postcode|wijk|buurt|gebied|kaart|aangewezen/.test(text),threshold:/woz|prijsgrens|nhg|bedrag/.test(text),application:/aanvrag|digid|eherkenning|formulier/.test(text),documents:/bijlage|bewijs|kopie|plattegrond|akte|huurcontract/.test(text)};
   checkedRegulations.push({url:res.url,status:res.status,reachable:true,authorityMatch,signals});
 }
 const trustedRegs=checkedRegulations.filter(x=>x.reachable&&x.authorityMatch);
 const pageEvidence={applicationRoute:(r.applicationLinks||[]).length>0,documents:(r.documentLinks||[]).length>0,exceptions:r.verificationCompleteness?.exceptions===true,geography:r.verificationCompleteness?.geographicScope===true};
 const merged={officialRegulation:trustedRegs.length>0,applicationRoute:pageEvidence.applicationRoute||trustedRegs.some(x=>x.signals.application),documents:pageEvidence.documents||trustedRegs.some(x=>x.signals.documents),exceptions:pageEvidence.exceptions||trustedRegs.some(x=>x.signals.exceptions),geographicScope:pageEvidence.geography||trustedRegs.some(x=>x.signals.geography)};
 const openChecks=Object.entries(merged).filter(([,v])=>!v).map(([k])=>k);
 records.push({municipalityCode:r.municipalityCode,municipalityName:r.municipalityName,candidatePermitTypes:r.candidatePermitTypes||[],searches,checkedRegulations,trustedOfficialRegulations:trustedRegs.map(x=>x.url),evidenceCompleteness:merged,openChecks,verificationStatus:openChecks.length===0?'structurally-complete-pending-legal-review':'targeted-review-required',publicOutputCreated:false,negativeLegalConclusion:false});
}
const all=[...records,...deep.records.map(r=>({municipalityCode:r.municipalityCode,municipalityName:r.municipalityName,verificationStatus:r.verificationStatus,openChecks:['manualLegalSourceReview'],trustedOfficialRegulations:r.officialRegulationCandidates||[]}))];
const summary={targetedMunicipalities:records.length,newStructurallyComplete:records.filter(r=>r.verificationStatus==='structurally-complete-pending-legal-review').length,targetedReviewRequired:records.filter(r=>r.verificationStatus==='targeted-review-required').length,deepManualReview:deep.records.length,withTrustedOfficialRegulation:records.filter(r=>r.trustedOfficialRegulations.length).length,networkRequests:requests,networkErrors:errors};
const output={schemaVersion:'1.0.0',batchId:'batch-004-gap-closure',generatedAt:new Date().toISOString(),records,deepReview:deep.records,summary,safety:{publicRulesCreated:0,negativeLegalConclusions:0,legalApprovalAutomatic:false}};
await write('data/research-batches/batch-004-gap-closure.json',output);
const rows=all.map(r=>`| ${r.municipalityName} | ${(r.trustedOfficialRegulations||[]).length} | ${(r.openChecks||[]).join(', ')||'—'} | ${r.verificationStatus} |`).join('\n');
await fs.writeFile('docs/research-batches/batch-004-gap-closure.md',`# Batch 004 — gap closure\n\nDe 20 structureel onvolledige gemeenten zijn opnieuw gericht gecontroleerd tegen Lokale Regelgeving. De 4 deep-review gemeenten blijven apart. Geen resultaat wordt automatisch juridisch goedgekeurd of gepubliceerd.\n\n| Gemeente | Vertrouwde regelingskandidaten | Open controles | Status |\n| --- | ---: | --- | --- |\n${rows}\n\n## Samenvatting\n\n- Gericht opnieuw gecontroleerd: ${summary.targetedMunicipalities}\n- Nieuw structureel compleet, juridische review nog nodig: ${summary.newStructurallyComplete}\n- Gerichte review blijft nodig: ${summary.targetedReviewRequired}\n- Diepe handmatige bronreview: ${summary.deepManualReview}\n- Met vertrouwde officiële regelingskandidaat: ${summary.withTrustedOfficialRegulation}\n- Netwerkverzoeken: ${summary.networkRequests}\n- Netwerkerrors: ${summary.networkErrors}\n- Publieke regels: 0\n`);
console.log(JSON.stringify(summary,null,2));
