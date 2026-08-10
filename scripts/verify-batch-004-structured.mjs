import fs from 'node:fs/promises';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const batch=await read('data/research-batches/batch-004-registry-recheck.json');
const UA='WoningencheckVerificationBot/1.0 (+https://woningencheck.nl)';
const structured=batch.records.filter(r=>r.route==='structured-verification');
if(structured.length!==21) throw new Error(`Expected 21 structured municipalities, got ${structured.length}`);
let requests=0,errors=0,active=0,maxConcurrency=0;
const fetchText=async url=>{requests++;active++;maxConcurrency=Math.max(maxConcurrency,active);try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':UA}});const text=await r.text();return{ok:r.ok,status:r.status,url:r.url,text,contentType:r.headers.get('content-type')||''};}catch(e){errors++;return{ok:false,status:'error',url,text:'',error:String(e),contentType:''}}finally{active--}};
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const links=(html,base)=>{const out=[];for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{out.push(new URL(m[1],base).href)}catch{}}return[...new Set(out)]};
const classify=url=>{const t=decodeURIComponent(url).toLowerCase();const types=[];if(/opkoop/.test(t))types.push('purchase-protection');if(/huisvestingsvergunning/.test(t))types.push('housing-permit');if(/kamerverhuur|omzettingsvergunning|woningdelen/.test(t))types.push('room-rental');if(/woningvorming|woning.?splitsen/.test(t))types.push('dwelling-formation');if(/splitsingsvergunning/.test(t))types.push('building-split');if(/onttrekk|samenvoeg/.test(t))types.push('withdrawal-merger');if(/leegstand/.test(t))types.push('vacancy-obligation');if(/vakantieverhuur|short.?stay/.test(t))types.push('holiday-rental');if(/goed.?verhuurderschap|verhuurvergunning/.test(t))types.push('good-landlord-permit');return[...new Set(types)]};
const extractSignals=(text)=>{const low=text.toLowerCase();const has=s=>low.includes(s);return{mentionsExceptions:/uitzonder|vrijstell|ontheff|niet van toepassing/.test(low),mentionsDocuments:/document|bewijs|bijlage|kopie|akte|woz|plattegrond|huurcontract/.test(low),mentionsApplication:/aanvrag|digid|eherkenning|formulier/.test(low),mentionsGeography:/postcode|wijk|buurt|gebied|kaart|aangewezen|gemeentegrens/.test(low),mentionsThreshold:/woz|grens|bedrag|nhg|prijsgrens/.test(low),mentionsTerm:/jaar|maanden|termijn/.test(low),keywords:{vergunning:has('vergunning'),verhuur:has('verhuur'),woonruimte:has('woonruimte')}}};
const pickSnippet=(text,re)=>{const m=text.match(re);if(!m)return null;const i=Math.max(0,m.index-220),j=Math.min(text.length,m.index+420);return text.slice(i,j).trim()};
const records=[];
for(const r of structured){
 const pages=[];
 for(const url of (r.reachableCandidates||[]).slice(0,6)){
  const res=await fetchText(url);if(!res.ok){pages.push({url,status:res.status,reachable:false});continue}
  const text=strip(res.text).slice(0,100000);const allLinks=links(res.text,res.url);
  const regulationLinks=allLinks.filter(u=>/lokaleregelgeving\.overheid\.nl\/CVDR\d+/i.test(u));
  const applicationLinks=allLinks.filter(u=>/formulier|aanvrag|digid|eherkenning|omgevingsloket|omgevingswet\.overheid\.nl/i.test(u));
  const documentLinks=allLinks.filter(u=>/\.pdf($|\?)/i.test(u)||/formulier|bijlage|download/i.test(u));
  pages.push({url:res.url,status:res.status,reachable:true,candidatePermitTypes:classify(res.url),signals:extractSignals(text),officialRegulationLinks:[...new Set(regulationLinks)].slice(0,10),applicationLinks:[...new Set(applicationLinks)].slice(0,10),documentLinks:[...new Set(documentLinks)].slice(0,10),evidenceSnippets:{exceptions:pickSnippet(text,/uitzonder|vrijstell|ontheff/i),documents:pickSnippet(text,/document|bewijs|bijlage|kopie|akte|woz|plattegrond|huurcontract/i),application:pickSnippet(text,/aanvrag|digid|eherkenning|formulier/i),geography:pickSnippet(text,/postcode|wijk|buurt|gebied|kaart|aangewezen/i)}})
 }
 const regulationSet=[...new Set(pages.flatMap(p=>p.officialRegulationLinks||[]))];
 const appSet=[...new Set(pages.flatMap(p=>p.applicationLinks||[]))];
 const docSet=[...new Set(pages.flatMap(p=>p.documentLinks||[]))];
 const types=[...new Set(pages.flatMap(p=>p.candidatePermitTypes||[]))];
 const verificationCompleteness={municipalInformation:pages.some(p=>p.reachable),officialRegulation:regulationSet.length>0,applicationRoute:appSet.length>0,documents:docSet.length>0,exceptions:pages.some(p=>p.signals?.mentionsExceptions),geographicScope:pages.some(p=>p.signals?.mentionsGeography)};
 const openChecks=Object.entries(verificationCompleteness).filter(([,v])=>!v).map(([k])=>k);
 records.push({municipalityCode:r.municipalityCode,municipalityName:r.municipalityName,candidatePermitTypes:types,pages,officialRegulationLinks:regulationSet,applicationLinks:appSet,documentLinks:docSet,verificationCompleteness,verificationStatus:openChecks.length?'research-pending-review':'structurally-complete-pending-legal-review',openChecks,publicOutputCreated:false,negativeLegalConclusion:false});
}
const summary={municipalities:records.length,withOfficialRegulation:records.filter(r=>r.officialRegulationLinks.length).length,withApplicationRoute:records.filter(r=>r.applicationLinks.length).length,withDocumentLinks:records.filter(r=>r.documentLinks.length).length,withExceptionSignal:records.filter(r=>r.verificationCompleteness.exceptions).length,withGeographicSignal:records.filter(r=>r.verificationCompleteness.geographicScope).length,structurallyComplete:records.filter(r=>r.verificationStatus==='structurally-complete-pending-legal-review').length,pendingReview:records.filter(r=>r.verificationStatus==='research-pending-review').length,networkRequests:requests,networkErrors:errors,maxConcurrency};
const output={schemaVersion:'1.0.0',batchId:'batch-004-structured-verification',generatedAt:new Date().toISOString(),sourceBatch:'batch-004-registry-recheck',records,summary,safety:{discoveryIsNotLegalVerification:true,publicRulesCreated:0,negativeLegalConclusions:0,existingPublicRulesUnchanged:true}};
await write('data/research-batches/batch-004-structured-verification.json',output);
const rows=records.map(r=>`| ${r.municipalityName} | ${r.candidatePermitTypes.join(', ')||'—'} | ${r.officialRegulationLinks.length} | ${r.applicationLinks.length} | ${r.documentLinks.length} | ${r.verificationStatus} |`).join('\n');
await fs.writeFile('docs/research-batches/batch-004-structured-verification.md',`# Batch 004 — structurele verificatie\n\nVoor de 21 gemeenten met bruikbare officiële kandidaatpagina's zijn bronstructuur, mogelijke vergunningtypen, officiële regelingslinks, aanvraagroutes, documentlinks en signalen voor uitzonderingen/geografisch bereik verzameld. Dit is nog geen juridische goedkeuring.\n\n| Gemeente | Mogelijke typen | Regelingen | Aanvraaglinks | Documentlinks | Status |\n| --- | --- | ---: | ---: | ---: | --- |\n${rows}\n\n## Samenvatting\n\n- Gemeenten: ${summary.municipalities}\n- Met officiële regelingslink: ${summary.withOfficialRegulation}\n- Met aanvraagroute: ${summary.withApplicationRoute}\n- Met documentlinks: ${summary.withDocumentLinks}\n- Met uitzonderingssignaal: ${summary.withExceptionSignal}\n- Met geografisch signaal: ${summary.withGeographicSignal}\n- Structureel compleet, juridische review nog nodig: ${summary.structurallyComplete}\n- Nog aanvullende broncontrole nodig: ${summary.pendingReview}\n- Netwerkrequests: ${summary.networkRequests}\n- Netwerkerrors: ${summary.networkErrors}\n- Publieke regels aangemaakt: 0\n`);
console.log(JSON.stringify(summary,null,2));
if(records.length!==21)process.exitCode=1;
