import fs from 'node:fs';
import crypto from 'node:crypto';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const regulations=read('data/regulations.json').records||[];
const timeoutMs=Number(process.env.SOURCE_WATCH_TIMEOUT_MS||15000);
const concurrency=Math.max(1,Number(process.env.SOURCE_WATCH_CONCURRENCY||8));
const outDir=process.env.SOURCE_WATCH_OUT||'artifacts/source-watch';
fs.mkdirSync(outDir,{recursive:true});

const urls=new Map();
function add(url,meta){if(!url||!/^https:\/\//i.test(url))return;const key=url.trim();const item=urls.get(key)||{url:key,uses:[]};item.uses.push(meta);urls.set(key,item)}
for(const r of regulations){
 const base={regulationId:r.id,municipalityCode:r.municipalityCode,municipalityName:r.municipalityName||r.municipalName||''};
 add(r.officialInformationUrl,{...base,type:'official-information'});
 add(r.officialRegulationUrl,{...base,type:'official-regulation'});
 add(r.officialApplicationUrl,{...base,type:'official-application'});
 for(const d of r.requiredDocuments||[]){add(d.officialInstructionsUrl,{...base,type:'document-instructions',documentId:d.id});add(d.officialTemplateUrl,{...base,type:'document-template',documentId:d.id});add(d.onlineFormUrl,{...base,type:'online-form',documentId:d.id})}
 for(const d of r.applicationDocuments||[])add(d.url,{...base,type:'application-document',label:d.label||''});
}

async function probe(item){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 const started=Date.now();
 try{
  let res=await fetch(item.url,{method:'HEAD',redirect:'follow',signal:controller.signal,headers:{'user-agent':'Woningencheck-source-watch/1.0'}});
  if([403,405,501].includes(res.status))res=await fetch(item.url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{'user-agent':'Woningencheck-source-watch/1.0','range':'bytes=0-4095'}});
  const body=res.body?await res.text().catch(()=> ''):'';
  return {...item,ok:res.ok,status:res.status,finalUrl:res.url,contentType:res.headers.get('content-type'),etag:res.headers.get('etag'),lastModified:res.headers.get('last-modified'),contentLength:res.headers.get('content-length'),sampleHash:body?crypto.createHash('sha256').update(body.slice(0,4096)).digest('hex'):null,durationMs:Date.now()-started,checkedAt:new Date().toISOString()};
 }catch(e){return {...item,ok:false,status:null,error:e?.name==='AbortError'?'timeout':String(e?.message||e),durationMs:Date.now()-started,checkedAt:new Date().toISOString()}}
 finally{clearTimeout(timer)}
}

const queue=[...urls.values()];const results=[];let i=0;
async function worker(){while(true){const n=i++;if(n>=queue.length)return;results[n]=await probe(queue[n])}}
await Promise.all(Array.from({length:Math.min(concurrency,queue.length||1)},worker));
const failed=results.filter(x=>!x.ok);const redirected=results.filter(x=>x.ok&&x.finalUrl&&x.finalUrl!==x.url);
const report={schemaVersion:'1.0.0',mode:'monthly-source-watch',generatedAt:new Date().toISOString(),sourceCount:results.length,okCount:results.length-failed.length,failedCount:failed.length,redirectedCount:redirected.length,reviewRequired:failed.length>0,results};
fs.writeFileSync(`${outDir}/monthly-source-watch.json`,JSON.stringify(report,null,2));
const md=[`# Maandelijkse broncontrole`,``,`Gecontroleerd: **${results.length}** officiële URL's`,`Bereikbaar: **${report.okCount}**`,`Review nodig: **${failed.length}**`,`Redirects: **${redirected.length}**`,``,failed.length?'## Handmatige review':'## Resultaat',failed.length?failed.map(x=>`- ${x.status??x.error} — ${x.url} — ${[...new Set(x.uses.map(u=>u.municipalityName||u.municipalityCode))].join(', ')}`).join('\n'):'Geen onbereikbare geregistreerde bronnen gevonden.'].join('\n');
fs.writeFileSync(`${outDir}/monthly-source-watch.md`,md+'\n');
console.log(`MONTHLY SOURCE WATCH: ${report.okCount}/${results.length} reachable; ${failed.length} review`);
if(process.env.SOURCE_WATCH_FAIL_ON_REVIEW==='1'&&failed.length)process.exitCode=2;
