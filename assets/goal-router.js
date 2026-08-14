"use strict";
export const GOAL_DEFINITIONS={
 rent:{label:"Gehele woning verhuren",terms:["opkoopbescherming","verhuurvergunning","gehele woning"],exclude:/kamer|woningdel|omzetting|omzettingsvergunning/i},
 rooms:{label:"Kamers verhuren / woning delen",terms:["kamer","woningdel","omzet","onzelfstandig"]},
 split:{label:"Woning splitsen",terms:["splits","woningvorm"]},
 holiday:{label:"Vakantieverhuur / Airbnb",terms:["vakantie","toeristisch","airbnb"]},
 tohome:{label:"Pand naar woning veranderen",terms:["omgevingsplan","functie","gebruik","wonen"]},
 renovate:{label:"Verbouwen",terms:["verbouw","bouw","omgevingsplan"]},
 explore:{label:"Alle mogelijkheden voor dit adres bekijken",terms:[]}
};
const text=r=>[r.title,r.regulationType,r.canonicalType,r.shortDescription,r.conditions,r.notes].filter(Boolean).join(" ").toLowerCase();
export function goalsForRule(rule){
 const explicit=Array.isArray(rule.goals)?rule.goals.filter(g=>GOAL_DEFINITIONS[g]):[];
 if(explicit.length)return [...new Set(explicit)];
 const h=text(rule),out=[];
 for(const [goal,cfg] of Object.entries(GOAL_DEFINITIONS)){
  if(goal==="explore")continue;
  if(cfg.exclude?.test(h))continue;
  if(cfg.terms.some(t=>h.includes(t)))out.push(goal);
 }
 return [...new Set(out)];
}
export function ruleRelevantToGoal(rule,goal){return goal==="explore"||goalsForRule(rule).includes(goal)}
export function inferredAnswerForGoal(goal,condition){
 const q=`${condition?.id||""} ${condition?.question||""}`.toLowerCase();
 if(goal==="rent"&&(/wilt.*verhur|woning.*verhur/.test(q))&&!/(kamer|vakantie|toerist|airbnb)/.test(q))return "yes";
 if(goal==="rooms"&&/(kamer.*verhur|woningdel|woning.*delen|onzelfstandig|omzet/.test(q))return "yes";
 if(goal==="split"&&/(wilt.*splits|woning.*splits|woningvorm/.test(q))return "yes";
 if(goal==="holiday"&&/(vakantie.*verhur|toeristisch.*verhur|airbnb/.test(q))return "yes";
 if(goal==="tohome"&&/(naar.*woning|naar.*wonen|functie.*wonen|gebruik.*wonen/.test(q))return "yes";
 if(goal==="renovate"&&/(wilt.*verbouw|gaat.*verbouw|bouwkund.*wijzig/.test(q))return "yes";
 return undefined;
}
export function seedGoalAnswers(rule,goal,answers={}){
 const seeded={...answers};
 for(const c of rule.applicability?.conditions||[]){if(c.source!=="user-input"||seeded[c.id]!==undefined)continue;const v=inferredAnswerForGoal(goal,c);if(v!==undefined)seeded[c.id]=v}
 return seeded;
}
