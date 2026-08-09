import fs from "node:fs";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const productionJson=fs.readdirSync("data",{recursive:true}).filter(path=>String(path).endsWith(".json")).map(path=>`data/${String(path).replaceAll("\\","/")}`);
for(const path of productionJson)read(path);
const data=read("data/municipalities-2026.json"),rules=read("data/regulations.json").records,sources=read("data/sources.json").sources;
const app=fs.readFileSync("assets/app.js","utf8"),fail=message=>{console.error(`FAIL: ${message}`);process.exitCode=1};
if(data.municipalities.length!==342)fail(`expected 342 municipalities, got ${data.municipalities.length}`);
if(data.municipalityCount!==342)fail(`municipalityCount must be 342, got ${data.municipalityCount}`);
for(const field of ["code","name"])if(new Set(data.municipalities.map(item=>item[field])).size!==342)fail(`municipality ${field} values are not unique`);
for(const abolished of ["Boxmeer","Cuijk","Grave","Uden","Weesp","Brielle","Hellevoetsluis","Westvoorne"])if(data.municipalities.some(item=>item.name===abolished))fail(`${abolished} incorrectly marked current`);
for(const current of ["Den Haag","Rotterdam","Leiden","Emmen","Land van Cuijk","Maashorst","Voorne aan Zee"])if(!data.municipalities.some(item=>item.name===current))fail(`${current} missing`);
const denHaag=data.municipalities.find(item=>item.code==="GM0518");
if(!denHaag||denHaag.canonicalName!=="'s-Gravenhage"||!denHaag.aliases?.includes("'s-Gravenhage"))fail("canonical name and alias missing for Den Haag");
if(new Set(data.municipalities.map(item=>JSON.stringify(item))).size!==342)fail("municipality records are not unique");
const codes=new Set(data.municipalities.map(item=>item.code));
for(const rule of rules){
  if(!codes.has(rule.municipalityCode))fail(`${rule.id}: unknown municipality code`);
  if(!rule.officialApplicationUrl&&rule.applicationUrlStatus!=="unresolved")fail(`${rule.id}: missing officialApplicationUrl`);
  if(rule.officialApplicationUrl&&!rule.officialApplicationUrl.startsWith("https://"))fail(`${rule.id}: non-HTTPS application URL`);
  if(rule.officialApplicationUrl===rule.officialInformationUrl&&rule.applicationUrlStatus!=="same-as-info-verified")fail(`${rule.id}: identical info/application URL lacks explicit review`);
  if(rule.officialApplicationUrl!==rule.officialInformationUrl&&rule.applicationUrlStatus==="same-as-info-verified")fail(`${rule.id}: same-URL status does not match URLs`);
  if(!Array.isArray(rule.requiredDocuments)||!Array.isArray(rule.applicatio×Ş5æÚ$z{-®éÜj×JNÚYŠY›İ[™
]›İÈ™]È\œ›ÜŠ‘]Y™\ÈÛÛˆšY]ÛÜ™[ˆÙ]›Û™[‹ˆÛÛ›ÛY\ˆHÙYÙ]™[œËˆŠNØÛÛœİOYš[™][šXÚ\[]J›İ[™
NÚYŠ[J]›İÈ™]È\œ›ÜŠ’]Y™\È\ÈÙ]›Û™[‹XX\ˆHÙ[YY[HÛÛˆšY]]]ÛX]\ØÚÛÜ™[ˆ™\X[ˆŠNÜİ]K˜ÛÛ^XZ[Y™\ÜĞÛÛ^
›İ[™
NÜİ]K˜[œİÙ\œÏ^ßNÛ\ÙË^ÛÛ[XY™\ÈÙ]›Û™[ˆ	Ù›İ[™ÙY\™Ø]™[˜X[_XÜÙ[Xİ
K˜ÛÙK›İ[™
_XØ]Ú
\œ›ÜŠ^Û\ÙË^ÛÛ[X	Ù\œ›Ü‹›Y\ÜØYÙ_HHİ[Y\›Û™\ˆÛÚÈ™[ˆY[ˆÙ[YY[HÚY^™[‹˜Û\ÙË˜Û\ÜÓ˜[YOH™\œ›ÜˆŸ_JNÂ™[
œ[\ÈŠK˜Y]™[\İ[™\Š˜Ú[™ÙH‹]™[OØÛÛœİY]™[\™Ù]™]\Ù]œ[KOY]™[\™Ù]™]\Ù]œ]Y\İ[ÛÚYŠ\Ÿ\J\™]\›Üİ]K˜[œİÙ\œÖÜ—OÏÏ^ßNÜİ]K˜[œİÙ\œÖÜ—VÜWOY]™[\™Ù]˜[YNÜÙ[Xİ
İ]K˜ÛÛ^›][šXÚ\[]K˜ÛÙKİ]K˜ÛÛ^˜Y™\ÜÏË™\Ü^S˜[YOŞİÙY\™Ø]™[˜X[Nœİ]K˜ÛÛ^˜Y™\ÜË™\Ü^S˜[Y_N›[
_JNÂ›ØY

NÂ