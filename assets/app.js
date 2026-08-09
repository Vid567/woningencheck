import {buildAddressContext,evaluateRule,groupEvaluations,STATES} from "./applicability.js";
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
function renderQuestions(r,e){return e.questions?.length?`<fieldset class="questions"><legend>Nog nodig voor deze controle</legend>${e.questions.map(q=>`<label>${esc(q.question)}<select data-rule="${r.id}" data-question="${q.id}"><option value="">Kies</option><option value="yes">Ja</option><option value="no">Nee</option>${q.answerType==="yes-no-unknown"?'<option value="unknown">Onbekend</option>':""}</select></label>`).join("")}</fieldset>`:""}
function renderDocuments(r){const required=Array.isArray(r.requiredDocuments)?r.requiredDocuments:[],forms=Array.isArray(r.applicationDocuments)?r.applicationDocuments:[];if(!required.length&&!forms.length)return "";const docs=required.length?`<h4>Benodigde documenten</h4><ul class="document-list">${required.map(d=>`<li>${esc(d.name)}${d.officialTemplateUrl?` ? ${link(d.officialTemplateUrl,"Open document")}`:""}</li>`).join("")}</ul>`:"";const direct=forms.length?`<h4>Directe formulieren</h4><ul class="document-list">${forms.map(d=>`<li>${link(d.url,d.label)}</li>`).join("")}</ul>`:"";return docs+direct}
function renderRule(r,e){const [label,klass]=publicState(e),application=r.officialApplicationUrl?link(r.officialApplicationUrl,"Start aanvraag","application-cta"):'<span>Aanvraagroute nog niet bevestigd</span>';return `<article class="card"><span class="result-state ${klass}">${label}</span><h3>${esc(r.title)}</h3><p>${esc(e.reason)}</p>${renderQuestions(r,e)}<details><summary>Voorwaarden, documenten en officiële links</summary><p>${esc(r.shortDescription)}</p>${renderDocuments(r)}<div class="result-links"><div><h4>Meer informatie</h4>${link(r.officialInformationUrl,"Bekijk gemeentelijke uitleg")}</div><div><h4>Officiële regeling</h4>${link(r.officialRegulationUrl,"Bekijk regeling")}</div><div><h4>Vergunning aanvragen</h4>${application}</div></div></details></article>`}

function select(code,address){const m=state.municipalities.find(x=>x.code===code||x.name.toLowerCase()===String(code).toLowerCase());if(!m)return;el("municipality").value=m.code;if(!state.context||state.context.municipality.code!==m.code)state.context={municipality:{code:m.code,name:m.name},location:{},address:{}};const items=state.regulations.filter(x=>x.municipalityCode===m.code).map(rule=>({rule,evaluation:evaluateRule(rule,state.context,state.answers[rule.id]||{})})),g=groupEvaluations(items);el("result-title").textContent=m.name;el("badge").textContent=address?"Adres gecontroleerd":"Gemeente geselecteerd";const box=el("address");box.hidden=!address;if(address)box.innerHTML=`<strong>${esc(address.weergavenaam)}</strong><br>Gemeente: ${esc(m.name)}${state.context.location.neighborhoodName?` · Buurt: ${esc(state.context.location.neighborhoodName)}`:""}`;const section=(title,list)=>list.length?`<section class="result-group"><