import {buildAddressContext,evaluateRule,groupEvaluations,isApplicationRouteRelevant,STATES} from "./applicability.js?v=20260809-geography";
"use strict";
const state={municipalities:[],regulations:[],context:null,answers:{}};
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
function publicState(e){return ({[STATES.APPLICABLE]:["Van toepassing","state-applicable"],[STATES.POTENTIAL]:["Mogelijk van toepassing","state-potential"],[STATES.QUESTIONS]:["Nog een vraag nodig","state-question"],[STATES.INSUFFICIENT]:["Controle nodig","state-review"],[STATES.REVIEW]:["Controle nodig","state-review"],[STATES.NOT_APPLICABLE]:["Lijkt niet van toepassing","state-no"]})[e.state]}
function questionHelp(q){return q.id.includes("woz")?`<p class="question-help">Zoek de waarde voor deze woning zelf op bij het <a href="https://www.wozwaardeloket.nl/" target="_blank" rel="noopener noreferrer">officiële WOZ-waardeloket ↗</a>. Voer daar hetzelfde adres in. Woningencheck leest deze gegevens niet automatisch uit.</p>`:""}
function renderQuestions(r,e){return e.questions?.length?`<fieldset class="questions"><legend>We hebben nog informatie nodig</legend>${e.questions.map(q=>`<label>${esc(q.question)}<select data-rule="${r.id}" data-question="${q.id}"><option value="">Kies</option><option value="yes">Ja</option><option value="no">Nee</option>${q.answerType==="yes-no-unknown"?'<option value="unknown">Weet ik niet</option>':""}</select>${questionHelp(q)}</label>`).join("")}</fieldset>`:""}
function renderDocuments(r){const required=Array.isArray(r.requiredDocuments)?r.requiredDocuments:[],forms=Array.isArray(r.applicationDocuments)?r.applicationDocuments:[];if(!required.length&&!forms.length)return "";const docs=required.length?`<h4>Wat heeft u nodig voor de aanvraag?</h4><ul class="document-list">${required.map(d=>`<li>${esc(d.name)}${d.officialTemplateUrl?` ? ${link(d.officialTemplateUrl,"Open document")}`:""}</li>`).join("")}</ul>`:"";const direct=forms.length?`<h4>Formulieren voor deze route</h4><ul class="document-list">${forms.map(d=>`<li>${link(d.url,d.label)}</li>`).join("")}</ul>`:"";return docs+direct}
function renderRule(r,e){const [label,klass]=publicState(e),routeReady=isApplicationRouteRelevant(e),application=routeReady&&r.officialApplicationUrl?`<div><h4>Vergunning aanvragen</h4>${link(r.officialApplicationUrl,"Start aanvraag","application-cta")}</div>`:"",route=routeReady?renderDocuments(r):"";return `<article class="card"><span class="result-state ${klass}">${label}</span><h3>${esc(r.title)}</h3><h4>Wat betekent dit voor deze woning?</h4><p>${esc(e.reason)}</p>${renderQuestions(r,e)}<details><summary>Voorwaarden en officiële bronnen</summary><p>${esc(r.shortDescription)}</p>${route}<div class="result-links"><div><h4>Informatie van de gemeente</h4>${link(r.officialInformationUrl,"Bekijk uitleg van de gemeente")}</div><div><h4>Officiële regelgeving</h4>${link(r.officialRegulationUrl,"Bekijk de officiële regelgeving")}</div>${application}</div></details></article>`}
function select(code,address){const m=state.municipalities.find(x=>x.code===code||x.name.toLowerCase()===String(code).toLowerCase());if(!m)return;el("municipality").value=m.code;if(!state.context||state.context.municipality.code!==m.code)state.context={municipality:{code:m.code,name:m.name},location:{},address:{}};const items=state.regulations.filter(x=>x.municipalityCode===m.code).map(rule=>({rule,evaluation:evaluateRule(rule,state.context,state.answers[rule.id]||{})})),g=groupEvaluations(items);el("result-title").textContent=m.name;el("badge").textContent=address?"Adres gecontroleerd":"Gemeente geselecteerd";const box=el("address");box.hidden=!address;if(address)box.innerHTML=`<strong>${esc(address.weergavenaam)}</strong><br>Gemeente: ${esc(m.name)}${state.context.location.neighborhoodName?` · Buurt: ${esc(state.context.location.neighborhoodName)}`:""}`;const section=(title,list)=>list.length?`<section class="result-group"><h3>${title}</h3>${list.map(x=>renderRule(x.rule,x.evaluation)).join("")}</section>`:"";el("rules").innerHTML=section("Van toepassing",g.applicable)+section("Mogelijk van toepassing of nog te controleren",g.potential)+section("Lijkt niet van toepassing",g.notApplicable)||'<p class="empty">Voor deze gemeente zijn nog geen beoordeelde regels beschikbaar.</p>';el("results").focus()}

function normalizeMunicipalityName(name){return String(name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’'`]/g,"").replace(/[^a-z0-9]/g,"")}
function findMunicipality(address){const rawCode=String(address.gemeentecode||address.gemeente_code||"").replace(/^GM/i,"").replace(/\D/g,"");if(rawCode){const gm=`GM${rawCode.padStart(4,"0")}`;const byCode=state.municipalities.find(x=>x.code===gm);if(byCode)return byCode;}const aliases={sgravenhage:"Den Haag",gravenhage:"Den Haag"};const source=normalizeMunicipalityName(address.gemeentenaam);const target=aliases[source]||address.gemeentenaam;return state.municipalities.find(x=>normalizeMunicipalityName(x.name)===normalizeMunicipalityName(target));}
el("municipality").addEventListener("change",event=>select(event.target.value));
el("address-form").addEventListener("submit",async event=>{event.preventDefault();const msg=el("message"),postcode=el("postcode").value.toUpperCase().replace(/\s/g,""),number=el("number").value.trim(),addition=el("addition").value.trim();msg.className="";if(!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode)||!/^[1-9][0-9]*$/.test(number)){msg.textContent="Controleer de postcode en het huisnummer en probeer het opnieuw.";msg.className="error";return}if(!state.municipalities.length){msg.textContent="De gemeentelijst is nog niet geladen. Vernieuw de pagina en probeer het opnieuw.";msg.className="error";return}msg.textContent="Adres controleren...";try{const q=`${postcode} ${number}${addition?` ${addition}`:""}`;const data=await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=100`).then(json);const docs=data.response?.docs||[];const normalized=addition.replace(/[-\s]/g,"").toLowerCase();const found=docs.find(d=>d.postcode===postcode&&String(d.huisnummer)===number&&(!addition||`${d.huisletter||""}${d.huisnummertoevoeging||""}`.replace(/[-\s]/g,"").toLowerCase()===normalized));if(!found)throw new Error("Dit adres kon niet worden gevonden. Controleer de gegevens.");const m=findMunicipality(found);if(!m)throw new Error("Het adres is gevonden, maar de gemeente kon niet automatisch worden bepaald.");state.context=buildAddressContext(found);state.answers={};msg.textContent=`Adres gevonden: ${found.weergavenaam}`;select(m.code,found)}catch(error){msg.textContent=`${error.message} U kunt hieronder ook zelf een gemeente kiezen.`;msg.className="error"}});
el("rules").addEventListener("change",event=>{const r=event.target.dataset.rule,q=event.target.dataset.question;if(!r||!q)return;state.answers[r]??={};state.answers[r][q]=event.target.value;select(state.context.municipality.code,state.context.address?.displayName?{weergavenaam:state.context.address.displayName}:null)});
load();
