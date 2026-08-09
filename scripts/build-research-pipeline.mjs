import fs from "node:fs";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const write=(path,value)=>fs.writeFileSync(path,JSON.stringify(value,null,2)+"\n");
const municipalities=read("data/municipalities-2026.json").municipalities;
const regulations=read("data/regulations.json");
const canonical={opkoopbescherming:"purchase-protection",omzettingsvergunning:"conversion-permit"};
const geographicReview=new Set(["leiden-omzetting-2024","rotterdam-opkoop","rotterdam-kamerverhuur-2026"]);
const documentReview=new Set(["emmen-opkoop-2023","rotterdam-opkoop","rotterdam-kamerverhuur-2026"]);
for(const record of regulations.records){
  record.requiredDocuments=record.requiredDocuments.map((document,index)=>typeof document==="string"?{
    id:`${record.id}-required-${index+1}`,
    name:document,
    requirement:"conditional",
    description:document,
    officialInstructionsUrl:record.officialInformationUrl,
    officialTemplateUrl:null,
    onlineFormUrl:record.officialApplicationUrl,
    responsibleAuthority:`Gemeente ${record.municipalityName}`,
    lastVerifiedAt:"2026-08-09",
    classification:"user-supplied-document"
  }:document);
  record.applicationDocuments=record.applicationDocuments.map(document=>({...document,classification:"official-form",responsibleAuthority:`Gemeente ${record.municipalityName}`,lastVerifiedAt:"2026-08-09"}));
  record.canonicalType=canonical[record.regulationType];
  record.municipalName=record.title;
  record.temporal={validFrom:record.effectiveDate,validUntil:record.endDate,supersededBy:null,previousVersion:null,lastCheckedAt:record.lastVerificationDate,status:record.endDate&&record.endDate<"2026-08-09"?"expired":"current-candidate"};
  record.verification={
    url:{status:"verified",checkedAt:"2026-08-09"},
    source:{status:"verified-official",checkedAt:"2026-08-09"},
    content:{status:"partially-verified",checkedAt:"2026-08-09"},
    currentness:{status:"manual-review-required",checkedAt:"2026-08-09"},
    application:{status:record.applicationUrlStatus,checkedAt:record.applicationUrlVerifiedDate},
    documents:{status:documentReview.has(record.id)?"partially-verified":"verified",checkedAt:"2026-08-09"},
    legalReview:{status:"not-reviewed",reviewedAt:null,reviewedBy:null}
  };
  record.evidence=[
    {claimId:`${record.id}-applicability`,claim:`${record.title}: ${record.shortDescription}`,evidenceType:"official-information",url:record.officialInformationUrl,identifier:null,articleOrSection:"Toepassing en voorwaarden",verifiedAt:"2026-08-09",contentFingerprint:null},
    {claimId:`${record.id}-legal-basis`,claim:`Juridische basis voor ${record.title}`,evidenceType:"official-regulation",url:record.officialRegulationUrl,identifier:record.documentIdentifier,articleOrSection:null,verifiedAt:"2026-08-09",contentFingerprint:null},
    {claimId:`${record.id}-application`,claim:`Officiële aanvraagroute voor ${record.title}`,evidenceType:"official-application",url:record.officialApplicationUrl,identifier:null,articleOrSection:"Aanvragen",verifiedAt:"2026-08-09",contentFingerprint:null}
  ];
  record.conflictStatus="none-found";
  record.conflicts=[];
  record.geographicScopeReview=geographicReview.has(record.id)?"manual-review-required":"structured-candidate";
}
write("data/regulations.json",regulations);
const pilotCodes=new Set(regulations.records.map(record=>record.municipalityCode));
const records=municipalities.map(municipality=>{
  const related=regulations.records.filter(record=>record.municipalityCode===municipality.code);
  return {municipalityCode:municipality.code,municipalityName:municipality.name,province:municipality.provinceName,researchStatus:pilotCodes.has(municipality.code)?"partially-verified":"not-started",researchStartedAt:pilotCodes.has(municipality.code)?"2026-08-09":null,researchCompletedAt:null,lastCheckedAt:pilotCodes.has(municipality.code)?"2026-08-09":null,nextReviewAt:pilotCodes.has(municipality.code)?"2026-11-09":null,researchedPermitTypes:[...new Set(related.map(record=>record.canonicalType))],unresolvedQuestions:pilotCodes.has(municipality.code)?["Volledige taxonomie nog niet onderzocht; afwezigheid van overige vergunningtypen is niet vastgesteld"]:[],conflicts:[],sourceCount:new Set(related.flatMap(record=>record.evidence.map(item=>item.url))).size,notes:pilotCodes.has(municipality.code)?"Pipelinepilot; geen volledige gemeentelijke inventarisatie.":"Nog niet onderzocht; dit betekent niet dat regels ontbreken."};
});
write("data/research-status.json",{schemaVersion:"1.0.0",referenceDate:"2026-01-01",generatedAt:"2026-08-09",records});
const reviewItems=regulations.records.flatMap(record=>[
  {id:`review-${record.id}-legal`,municipalityCode:record.municipalityCode,regulationId:record.id,category:"legal-interpretation",reason:"Inhoudelijke juridische interpretatie is nog niet handmatig goedgekeurd.",status:"open",priority:"high",createdAt:"2026-08-09"},
  ...(geographicReview.has(record.id)?[{id:`review-${record.id}-scope`,municipalityCode:record.municipalityCode,regulationId:record.id,category:"geographic-scope",reason:"Kaart, wijk- of quotumgegevens vereisen handmatige interpretatie of structurele geometrie.",status:"open",priority:"high",createdAt:"2026-08-09"}]:[]),
  ...(documentReview.has(record.id)?[{id:`review-${record.id}-documents`,municipalityCode:record.municipalityCode,regulationId:record.id,category:"required-documents",reason:"Formulierroute is geverifieerd, maar de volledige conditionele documentenlijst vereist handmatige controle.",status:"open",priority:"medium",createdAt:"2026-08-09"}]:[])
]);
write("data/review-queue.json",{schemaVersion:"1.0.0",generatedAt:"2026-08-09",items:reviewItems});
console.log(`Built research queue: ${records.length} municipalities; review queue: ${reviewItems.length} items`);
