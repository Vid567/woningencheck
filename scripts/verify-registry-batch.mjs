import fs from 'node:fs/promises';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const safeLabel=(process.env.BATCH_LABEL||'auto-next-25').replace(/[^a-z0-9._-]+/gi,'-').toLowerCase();
const input=await read(`data/research-batches/auto/${safeLabel}.json`);
const UA='WoningencheckVerificationBot/2.0 (+https://woningencheck.nl)';
const terms=['huisvestingsverordening','opkoopbescherming','kamerverhuur omzettingsvergunning','splitsingsvergunning woningvorming','onttrekkingsvergunning woonruimte','leegstandsverordening','verhuurvergunning goed verhuurderschap','vakantieverhuur short stay'];
let requests=0,errors=0,active=0,maxConcurrency=0;
const fetchText=async url=>{requests++;active++;maxConcurrency=Math.max(maxConcurrency,active);try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':UA}});return{ok:r.ok,status:r.status,url:r.url,text:await r.text(),contentType:r.headers.get('content-type')||''}}catch(e){errors++;return{ok:false,status:'error',url,text:'',error:String(e),contentType:''}}finally{active--}};
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const links=(html,base)=>{const out=[];for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{out.push(new URL(m[1],base).href)}catch{}}return[...new Set(out)]};
const classify=url=>{const t=decodeURIComponent(url).toLowerCase(),types=[];if(/opkoop/.test(t))types.push('purchase-protection');if(/huisvestingsvergunning/.test(t))types.push('housing-permit');if(/kamerverhuur|omzettingsvergunning|woningdelen/.test(t))types.push('room-rental');if(/woningvorming|woning.?splitsen/.test(t))types.push('dwelling-formation');if(/splitsingsvergunning/.test(t))types.push('building-split');if(/onttrekk|samenvoeg/.test(t))types.push('withdrawal-merger');if(/leegstand/.test(t))types.push('vacancy-obligation');if(/vakantieverhuur|short.?stay/.test(t))types.push('holiday-rental');if(/goed.?verhuurderschap|verhuurvergunning/.test(t))types.push('good-landlord-permit');return[...new Set(types)]};
const signals=text=>{const low=text.toLowerCase();return{exceptions:/uitzonder|vrijstell|ontheff|niet van toepassing/.test(low),documents:/document|bewijs|bijlage|kopie|akte|woz|plattegrond|huurcontract/.test(low),application:/aanvrag|digid|eherkenning|formulier|omgevingsloket/.test(low),geography:/postcode|wijk|buurt|gebied|kaart|aangewezen|gemeentegrens/.test(low),threshold:/woz|grens|bedrag|nhg|prijsgrens/.test(low)}};
const cvdrs=text=>[...new Set([...text.matchAll(/https:\/\/lokaleregelgeving\.overheid\.nl\/CVDR\d+/gi)].map(m=>m[0]))];

async function verifyStructured(r){
 const pages=[];
 for(const url of (r.reachableCandidates||[]).slice(0,6)){
  const res=await fetchText(url); if(!res.ok){pages.push({url,status:res.status,reachable:false});continue}
  const text=strip(res.text).slice(0,100000), all=links(res.text,res.url);
  pages.push({url:res.url,status:res.status,reachable:true,candidatePermitTypes:classify(res.url),signals:signals(text),officialRegulationLinks:all.filter(u=>/lokaleregelgeving\.overheid\.nl\/CVDR\d+/i.test(u)).slice(0,10),applicationLinks:all.filter(u=>/formulier|aanvrag|digid|eherkenning|omgevingsloket|omgevingswet\.overheid\.nl/i.test(u)).slice(0,10),documentLinks:all.filter(u=>/\.pdf($|\?)/i.test(u)||/formulier|bijlage|download/i.test(u)).slice(0,10)});
 }
 const regs=[...new Set(pages.flatMap(p=>p.officialRegulationLinks||[]))],apps=[...new Set(pages.flatMap(p=>p.applicationLinks||[]))],docs=[...new Set(pages.flatMap(p=>p.documentLinks||[]))],types=[...new Set(pages.flatMap(p=>p.candidatePermitTypes||[]))];
 const complete={municipalInformation:pages.some(p=>p.reachable),officialRegulation:regs.length>0,applicationRoute:apps.length>0,documents:docs.length>0,exceptions:pages.some(p=>p.signals?.exceptions),geographicScope:pages.some(p=>p.signals?.geography)};
 const openChecks=Object.entries(complete).filter(([,v])=>!v).map(([k])=>k);
 return {...r,verificationRoute:'structured',candidatePermitTypes:types,pages,officialRegulationLinks:regs,applicationLinks:apps,documentLinks:docs,evidenceCompleteness:complete,verificationStatus:openChecks.length?'targeted-review-required':'structurally-complete-pending-legal-review',openChecks,publicOutputCreated:false,negativeLegalConclusion:false};
}

async function verifyDeep(r){
 const searches=[],regulationLinks=new Set();
 for(const term of terms){const q=`${r.municipalityName} ${term}`,url=`https://lokaleregelgeving.overheid.nl/zoeken?query=${encodeURIComponent(q)}`,res=await fetchText(url);const found=res.ok?cvdrs(res.text):[];found.forEach(x=>regulationLinks.add(x));searches.push({query:q,url,status:res.status,foundCvdr:found});}
 return {...r,verificationRoute:'deep',officialPublicationSearch:searches,officialRegulationCandidates:[...regulationLinks],verificationStatus:regulationLinks.size?'official-regulation-candidate-found':'manual-legal-source-review-required',publicOutputCreated:false,negativeLegalConclusion:false};
}

const results=[];let idx=0;
await Promise.all(Array.from({length:5},async()=>{while(true){const i=idx++;if(i>=input.records.length)return;const r=input.records[i];results[i]=r.route==='structured-verification'?await verifyStructured(r):await verifyDeep(r);}}));
const summary={municipalities:results.length,structuredProcessed:results.filter(r=>r.verificationRoute==='structured').length,deepProcessed:results.filter(r=>r.verificationRoute==='deep').length,structurallyComplete:results.filter(r=>r.verificationStatus==='structurally-complete-pending-legal-review').length,targetedReviewRequired:results.filter(r=>r.verificationStatus==='targeted-review-required').length,officialRegulationCandidateFound:results.filter(r=>r.verificationStatus==='official-regulation-candidate-found').length,manualLegalSourceReviewRequired:results.filter(r=>r.verificationStatus==='manual-legal-source-review-required').length,networkRequests:requests,networkErrors:errors,maxConcurrency};
const out={schemaVersion:'1.0.0',batchId:`${safeLabel}-verification`,generatedAt:new Date().toISOString(),sourceBatch:safeLabel,records:results,summary,safety:{legalApprovalAutomatic:false,publicRulesCreated:0,negativeLegalConclusions:0,absenceOfDiscoveryIsNotAbsenceOfRegulation:true}};
await write(`data/research-batches/auto/${safeLabel}-verification.json`,out);
const rows=results.map(r=>`| ${r.municipalityName} | ${r.verificationRoute} | ${r.verificationStatus} | ${(r.officialRegulationLinks||r.officialRegulationCandidates||[]).length} |`).join('\n');
await fs.writeFile(`docs/research-batches/auto/${safeLabel}-verification.md`,`# ${safeLabel} — automatische verificatie\n\nDiscoveryresultaten worden automatisch doorgezet naar structurele of diepe verificatie. Dit is nog geen juridische goedkeuring.\n\n| Gemeente | Route | Status | Regelingskandidaten |\n| --- | --- | --- | ---: |\n${rows}\n\n## Samenvatting\n\n- Gemeenten: ${summary.municipalities}\n- Structureel verwerkt: ${summary.structuredProcessed}\n- Diep verwerkt: ${summary.deepProcessed}\n- Structureel compleet, juridische review nodig: ${summary.structurallyComplete}\n- Gerichte review nodig: ${summary.targetedReviewRequired}\n- Officiële regelingskandidaat gevonden: ${summary.officialRegulationCandidateFound}\n- Handmatige juridische bronreview: ${summary.manualLegalSourceReviewRequired}\n- Netwerkrequests: ${summary.networkRequests}\n- Netwerkerrors: ${summary.networkErrors}\n- Publieke regels: 0\n`);
console.log(JSON.stringify(summary,null,2));
