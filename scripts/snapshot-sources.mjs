import fs from "node:fs";
import {createHash} from "node:crypto";
const sources=JSON.parse(fs.readFileSync("data/sources.json","utf8")).sources;
const rules=JSON.parse(fs.readFileSync("data/regulations.json","utf8")).records;
const batch=JSON.parse(fs.readFileSync("data/research-batches/batch-001.json","utf8"));
const previous=JSON.parse(fs.readFileSync("data/source-snapshots.json","utf8")).snapshots;
const targets=[...sources.map(source=>({id:source.id,url:source.url})),...rules.flatMap(rule=>[
  {id:`${rule.id}-information`,url:rule.officialInformationUrl},{id:`${rule.id}-regulation`,url:rule.officialRegulationUrl},{id:`${rule.id}-application`,url:rule.officialApplicationUrl},
  ...rule.requiredDocuments.flatMap(document=>[document.officialInstructionsUrl,document.officialTemplateUrl,document.onlineFormUrl].filter(Boolean).map((url,index)=>({id:`${document.id}-${index+1}`,url}))),
  ...rule.applicationDocuments.map((document,index)=>({id:`${rule.id}-form-${index+1}`,url:document.url}))
]),...batch.findings.map(finding=>({id:`batch001-${finding.id}`,url:finding.officialRegulationUrl}))];
const unique=[...new Map(targets.filter(item=>item.url).map(item=>[item.url,item])).values()],snapshots=[];
for(const target of unique){
  try{const response=await fetch(target.url,{redirect:"follow",signal:AbortSignal.timeout(20000),headers:{"user-agent":"Woningencheck-change-detector/1.0"}});const body=await response.arrayBuffer();snapshots.push({id:target.id,url:target.url,finalUrl:response.url,httpStatus:response.status,automatedStatus:response.status===403?"automated-check-blocked":response.ok?"reachable":"http-error",lastCheckedAt:"2026-08-09",lastKnownModified:response.headers.get("last-modified"),contentFingerprint:response.ok?createHash("sha256").update(Buffer.from(body)).digest("hex"):null})}catch(error){snapshots.push({id:target.id,url:target.url,finalUrl:null,httpStatus:null,automatedStatus:"check-error",lastCheckedAt:"2026-08-09",lastKnownModified:null,contentFingerprint:null,error:error.message})}
}
const merged=[...new Map([...previous,...snapshots].map(snapshot=>[snapshot.url,snapshot])).values()];
fs.writeFileSync("data/source-snapshots.json",JSON.stringify({schemaVersion:"1.0.0",generatedAt:"2026-08-09",snapshots:merged},null,2)+"\n");
console.log(`Stored ${snapshots.length} source snapshots; changes require review, never automatic legal rewrites.`);
