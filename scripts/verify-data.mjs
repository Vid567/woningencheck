import fs from "node:fs";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const data=read("data/municipalities-2026.json"),rules=read("data/regulations.json").records,sources=read("data/sources.json").sources;
const app=fs.readFileSync("assets/app.js","utf8"),fail=message=>{console.error(`FAIL: ${message}`);process.exitCode=1};
if(data.municipalities.length!==342)fail(`expected 342 municipalities, got ${data.municipalities.length}`);
for(const field of ["code","name"])if(new Set(data.municipalities.map(item=>item[field])).size!==342)fail(`municipality ${field} values are not unique`);
for(const abolished of ["Boxmeer","Cuijk","Grave","Uden","Weesp","Brielle","Hellevoetsluis","Westvoorne"])if(data.municipalities.some(item=>item.name===abolished))fail(`${abolished} incorrectly marked current`);
for(const current of ["Land van Cuijk","Maashorst","Voorne aan Zee"])if(!data.municipalities.some(item=>item.name===current))fail(`${current} missing`);
const codes=new Set(data.municipalities.map(item=>item.code));
for(const rule of rules){
  if(!codes.has(rule.municipalityCode))fail(`${rule.id}: unknown municipality code`);
  if(!rule.officialApplicationUrl&&rule.applicationUrlStatus!=="unresolved")fail(`${rule.id}: missing officialApplicationUrl`);
  if(rule.officialApplicationUrl&&!rule.officialApplicationUrl.startsWith("https://"))fail(`${rule.id}: non-HTTPS application URL`);
  if(rule.officialApplicationUrl===rule.officialInformationUrl&&rule.applicationUrlStatus!=="same-as-info-verified")fail(`${rule.id}: identical info/application URL lacks explicit review`);
  if(rule.officialApplicationUrl!==rule.officialInformationUrl&&rule.applicationUrlStatus==="same-as-info-verified")fail(`${rule.id}: same-URL status does not match URLs`);
  if(!Array.isArray(rule.requiredDocuments)||!Array.isArray(rule.applicationDocuments))fail(`${rule.id}: document fields missing`);
  for(const document of rule.applicationDocuments||[])if(!document.url.startsWith("https://"))fail(`${rule.id}: non-HTTPS document URL`);
  const path=new URL(rule.officialApplicationUrl||"https://invalid.example").pathname.toLowerCase();
  if(rule.regulationType==="opkoopbescherming"&&!/(opkoop|verhuurvergunning)/.test(path))fail(`${rule.id}: application URL may point to unrelated permit type`);
  if(rule.regulationType==="omzettingsvergunning"&&!/(kamerverhuur|omzettingsvergunning)/.test(path))fail(`${rule.id}: application URL may point to unrelated permit type`);
}
for(const token of ["officialApplicationUrl","application-cta","Aanvraagroute nog niet bevestigd","Bekijk gemeentelijke uitleg","Bekijk CVDR-regeling"])if(!app.includes(token))fail(`application UI does not render ${token}`);
const text=fs.readFileSync("index.html","utf8")+app;
for(const bad of ["localhost","raw.githack.com","api_key","apiKey"])if(text.includes(bad))fail(`forbidden value found: ${bad}`);
if(fs.readFileSync("CNAME","utf8").trim()!=="woningencheck.nl")fail("CNAME mismatch");
if(!sources.length)fail("source register empty");
if(!process.exitCode)console.log(`PASS: ${data.municipalities.length} municipalities, ${rules.length} rules, ${sources.length} sources; application CTA rendered and reviewed`);
