"use strict";
const state={municipalities:[],regulations:[]};
const el=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
async function json(response){if(!response.ok)throw new Error(`Gegevens niet beschikbaar (${response.status})`);return response.json()}
async function load(){
  const msg=el("message");
  try{
    const m=await fetch("data/municipalities-2026.json",{cache:"no-store"}).then(json);
    state.municipalities=m.municipalities||[];
    el("count").textContent=state.municipalities.length;
    el("municipality").innerHTML='<option value="">Kies een gemeente</option>'+state.municipalities.map(x=>`<option value="${x.code}">${esc(x.name)} &mdash; ${esc(x.provinceName)}</option>`).join("");
  }catch(error){
    el("municipality").innerHTML='<option value="">Gemeentelijst kon niet worden geladen</option>';
    msg.textContent="De gemeentelijst kon niet worden geladen. Probeer de pagina opnieuw te laden.";
    msg.className="error";
    console.error("municipalities-2026.json",error);
    return;
  }
  try{
    const r=await fetch("data/regulations.json",{cache:"no-store"}).then(json);
    state.regulations=r.records||[];
  }catch(error){
    state.regulations=[];
    msg.textContent="De gemeenten zijn geladen, maar de woonregels konden niet worden geladen. U kunt wel een adres of gemeente selecteren.";
    msg.className="error";
    console.error("regulations.json",error);
  }
}
function link(url,label,className="text-link"){return `<a class="${className}" href="${encodeURI(url)}" target="_blank" rel="noopener">${label} <span aria-hidden="true">&#8599;</span></a>`}
function renderRule(r){
  const documents=(r.applicationDocuments||[]).map(document=>`<li>${link(document.url,`Open formulier: ${esc(document.label)}`)}</li>`).join("");
  const required=(r.requiredDocuments||[]).map(document=>`<li><strong>${esc(document.name)}</strong> — ${esc(document.requirement)}<br><span>${esc(document.description)}</span><br>${document.officialTemplateUrl?link(document.officialTemplateUrl,"Download document"):document.classification==="user-supplied-document"?'<span class="self-supplied">Zelf aanleveren</span>':""} ${document.officialInstructionsUrl?link(document.officialInstructionsUrl,"Bekijk instructies"):""}</li>`).join("");
  const application=r.officialApplicationUrl&&r.applicationUrlStatus!=="unresolved"?link(r.officialApplicationUrl,"Start aanvraag","application-cta"):'<span class="application-unresolved">Aanvraagroute nog niet bevestigd</span>';
  return `<article class="card"><div class="meta"><span>${esc(r.regulationType)}</span><span>${esc(r.scopeType)}: ${esc(r.scopeValue)}</span><span class="pending">juridische review: ${esc(r.legalReviewStatus)}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.shortDescription)}</p><p><strong>Waarom/voorwaarden:</strong> ${esc(r.conditions||"Raadpleeg de officiele bron.")}</p>${required?`<section class="document-section"><h4>Benodigde documenten</h4><ul>${required}</ul></section>`:""}${documents?`<section class="document-section"><h4>Directe formulieren</h4><ul>${documents}</ul></section>`:""}<div class="result-links"><div><h4>Meer informatie</h4>${link(r.officialInformationUrl,"Bekijk gemeentelijke uitleg")}</div>${r.officialRegulationUrl?`<div><h4>Officiele regeling</h4>${link(r.officialRegulationUrl,"Bekijk CVDR-regeling")}</div>`:""}<div class="application-action"><h4>Vergunning aanvragen</h4>${application}</div></div><small>Broncontrole: ${esc(r.sourceVerificationStatus)} &middot; ${esc(r.lastVerificationDate)} · aanvraagroute: ${esc(r.applicationUrlStatus)}</small></article>`;
}
function select(code,address){const m=state.municipalities.find(x=>x.code===code||x.code===`GM${String(code).replace(/^GM/,"").padStart(4,"0")}`||x.name.toLowerCase()===String(code).toLowerCase());if(!m)return;el("municipality").value=m.code;const rules=state.regulations.filter(x=>x.municipalityCode===m.code);el("result-title").textContent=m.name;el("badge").textContent=rules.length?`${rules.length} bronrecord${rules.length===1?"":"s"}`:"Nog geen inhoudelijke dekking";const box=el("address");box.hidden=!address;if(address)box.innerHTML=`<strong>${esc(address.weergavenaam)}</strong><br>Gemeente: ${esc(m.name)}`;el("rules").innerHTML=rules.length?rules.map(renderRule).join(""):'<p class="empty">Voor deze gemeente zijn nog niet alle woon- en verhuurregels toegevoegd. Controleer voor de zekerheid ook de website van de gemeente.</p>';el("results").focus()}
function normalizeMunicipalityName(name){return String(name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’'`]/g,"").replace(/[^a-z0-9]/g,"")}
function findMunicipality(address){const rawCode=String(address.gemeentecode||address.gemeente_code||"").replace(/^GM/i,"").replace(/\D/g,"");if(rawCode){const gm=`GM${rawCode.padStart(4,"0")}`;const byCode=state.municipalities.find(x=>x.code===gm);if(byCode)return byCode;}const aliases={sgravenhage:"Den Haag",gravenhage:"Den Haag"};const source=normalizeMunicipalityName(address.gemeentenaam);const target=aliases[source]||address.gemeentenaam;return state.municipalities.find(x=>normalizeMunicipalityName(x.name)===normalizeMunicipalityName(target));}
el("municipality").addEventListener("change",event=>select(event.target.value));
el("address-form").addEventListener("submit",async event=>{event.preventDefault();const msg=el("message"),postcode=el("postcode").value.toUpperCase().replace(/\s/g,""),number=el("number").value.trim(),addition=el("addition").value.trim();msg.className="";if(!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode)||!/^[1-9][0-9]*$/.test(number)){msg.textContent="Controleer de postcode en het huisnummer en probeer het opnieuw.";msg.className="error";return}if(!state.municipalities.length){msg.textContent="De gemeentelijst is nog niet geladen. Vernieuw de pagina en probeer het opnieuw.";msg.className="error";return}msg.textContent="Adres controleren...";try{const q=`${postcode} ${number}${addition?` ${addition}`:""}`;const data=await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=100`).then(json);const docs=data.response?.docs||[];const normalized=addition.replace(/[-\s]/g,"").toLowerCase();const found=docs.find(d=>d.postcode===postcode&&String(d.huisnummer)===number&&(!addition||`${d.huisletter||""}${d.huisnummertoevoeging||""}`.replace(/[-\s]/g,"").toLowerCase()===normalized));if(!found)throw new Error("Dit adres kon niet worden gevonden. Controleer de gegevens.");const m=findMunicipality(found);if(!m)throw new Error("Het adres is gevonden, maar de gemeente kon niet automatisch worden bepaald.");msg.textContent=`Adres gevonden: ${found.weergavenaam}`;select(m.code,found)}catch(error){msg.textContent=`${error.message} U kunt hieronder ook zelf een gemeente kiezen.`;msg.className="error"}});
load();
