"use strict";
const state={municipalities:[],regulations:[]};
const el=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
async function json(response){if(!response.ok)throw new Error(`Gegevens niet beschikbaar (${response.status})`);return response.json()}
async function load(){const [m,r]=await Promise.all([fetch("data/municipalities-2026.json").then(json),fetch("data/regulations.json").then(json)]);state.municipalities=m.municipalities;state.regulations=r.records;el("count").textContent=m.municipalities.length;el("municipality").innerHTML='<option value="">Kies een gemeente</option>'+m.municipalities.map(x=>`<option value="${x.code}">${esc(x.name)} &mdash; ${esc(x.provinceName)}</option>`).join("")}
function link(url,label,className="text-link"){return `<a class="${className}" href="${encodeURI(url)}" target="_blank" rel="noopener">${label} <span aria-hidden="true">&#8599;</span></a>`}
function renderRule(r){
  const documents=(r.applicationDocuments||[]).map(document=>`<li>${link(document.url,esc(document.label))}</li>`).join("");
  const required=(r.requiredDocuments||[]).map(document=>`<li>${esc(document)}</li>`).join("");
  const application=r.officialApplicationUrl&&r.applicationUrlStatus!=="unresolved"
    ?link(r.officialApplicationUrl,"Start aanvraag","application-cta")
    :'<span class="application-unresolved">Aanvraagroute nog niet bevestigd</span>';
  return `<article class="card">
    <div class="meta"><span>${esc(r.regulationType)}</span><span>${esc(r.scopeType)}: ${esc(r.scopeValue)}</span><span class="pending">juridische review: ${esc(r.legalReviewStatus)}</span></div>
    <h3>${esc(r.title)}</h3><p>${esc(r.shortDescription)}</p><p><strong>Waarom/voorwaarden:</strong> ${esc(r.conditions||"Raadpleeg de officiele bron.")}</p>
    ${required?`<section class="document-section"><h4>Benodigde documenten</h4><ul>${required}</ul></section>`:""}
    ${documents?`<section class="document-section"><h4>Directe formulieren</h4><ul>${documents}</ul></section>`:""}
    <div class="result-links">
      <div><h4>Meer informatie</h4>${link(r.officialInformationUrl,"Bekijk gemeentelijke uitleg")}</div>
      ${r.officialRegulationUrl?`<div><h4>Officiele regeling</h4>${link(r.officialRegulationUrl,"Bekijk CVDR-regeling")}</div>`:""}
      <div class="application-action"><h4>Vergunning aanvragen</h4>${application}</div>
    </div>
    <small>Broncontrole: ${esc(r.sourceVerificationStatus)} &middot; ${esc(r.lastVerificationDate)} · aanvraagroute: ${esc(r.applicationUrlStatus)}</small>
  </article>`;
}
function select(code,address){const m=state.municipalities.find(x=>x.code===code||x.code===`GM${String(code).replace(/^GM/,"").padStart(4,"0")}`||x.name.toLowerCase()===String(code).toLowerCase());if(!m)return;el("municipality").value=m.code;const rules=state.regulations.filter(x=>x.municipalityCode===m.code);el("result-title").textContent=m.name;el("badge").textContent=rules.length?`${rules.length} bronrecord${rules.length===1?"":"s"}`:"Nog geen inhoudelijke dekking";const box=el("address");box.hidden=!address;if(address)box.innerHTML=`<strong>${esc(address.weergavenaam)}</strong><br>BAG-id: ${esc(address.identificatie||"niet ontvangen")} &middot; Gemeente: ${esc(m.name)}`;el("rules").innerHTML=rules.length?rules.map(renderRule).join(""):'<p class="empty">Deze gemeente staat in de CBS-basis, maar heeft nog geen beoordeelde regelrecords. Controleer de gemeentelijke website.</p>';el("results").focus()}
el("municipality").addEventListener("change",event=>select(event.target.value));
el("address-form").addEventListener("submit",async event=>{event.preventDefault();const msg=el("message"),postcode=el("postcode").value.toUpperCase().replace(/\s/g,""),number=el("number").value.trim(),addition=el("addition").value.trim();msg.className="";if(!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode)||!/^[1-9][0-9]*$/.test(number)){msg.textContent="Vul een geldige postcode en positief huisnummer in.";msg.className="error";return}msg.textContent="Officieel BAG-adres zoeken via PDOK...";try{const q=`${postcode} ${number}${addition?` ${addition}`:""}`;const data=await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=100`).then(json);const docs=data.response?.docs||[];const normalized=addition.replace(/[-\s]/g,"").toLowerCase();const found=docs.find(d=>d.postcode===postcode&&String(d.huisnummer)===number&&(!addition||`${d.huisletter||""}${d.huisnummertoevoeging||""}`.toLowerCase()===normalized));if(!found)throw new Error("Geen exact officieel BAG-adres gevonden.");const m=state.municipalities.find(x=>x.name.toLowerCase()===String(found.gemeentenaam||"").toLowerCase()||x.code===`GM${String(found.gemeentecode||"").replace(/^GM/,"").padStart(4,"0")}`);if(!m)throw new Error("Adres gevonden, maar gemeente niet gekoppeld.");msg.textContent=`Gevonden: ${found.weergavenaam}`;select(m.code,found)}catch(error){msg.textContent=`${error.message} Kies de gemeente eventueel handmatig.`;msg.className="error"}});
load().catch(error=>{el("message").textContent=error.message;el("message").className="error"});
