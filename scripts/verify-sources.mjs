import fs from "node:fs";
const sources=JSON.parse(fs.readFileSync("data/sources.json","utf8")).sources;
const rules=JSON.parse(fs.readFileSync("data/regulations.json","utf8")).records;
const official=["cbs.nl","overheid.nl","denhaag.nl","emmen.nl","leiden.nl","rotterdam.nl","pdok.nl"];
const targets=[...sources.map(source=>({id:source.id,url:source.url,type:"source"})),...rules.flatMap(rule=>[{id:rule.id,url:rule.officialApplicationUrl,type:"application"},...(rule.applicationDocuments||[]).map((document,index)=>({id:`${rule.id}-document-${index+1}`,url:document.url,type:"document"}))])].filter(target=>target.url);
let failed=false;
for(const target of targets){
  const host=new URL(target.url).hostname.replace(/^www\./,"");
  if(!official.some(domain=>host===domain||host.endsWith(`.${domain}`))){console.error(`UNTRUSTED ${target.type} ${target.id}: ${host}`);failed=true;continue}
  try{const response=await fetch(target.url,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"user-agent":"Woningencheck-source-verifier/1.1"}});console.log(`${response.ok?"LIVE":"HTTP "+response.status} ${target.type} ${target.id}`);if(!response.ok&&response.status!==403)failed=true}catch(error){console.error(`ERROR ${target.type} ${target.id}: ${error.message}`);failed=true}
}
if(failed)process.exitCode=1;
