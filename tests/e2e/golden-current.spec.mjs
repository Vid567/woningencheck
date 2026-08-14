import {test,expect} from '@playwright/test';
import fs from 'node:fs';

// Keep the established 46-path golden matrix as the single source of case data,
// while exercising it against the current separate address-check page and UX.
const legacySource=fs.readFileSync(new URL('./golden-46.spec.mjs',import.meta.url),'utf8');
const match=legacySource.match(/const CASES=(\[[\s\S]*?\n\]);/);
if(!match)throw new Error('Golden CASES matrix could not be read');
const CASES=JSON.parse(match[1]);

const GOAL_LABELS={rent:'Gehele woning verhuren',rooms:'Kamers verhuren / woning delen',split:'Woning splitsen',holiday:'Vakantieverhuur / Airbnb',tohome:'Pand naar woning veranderen',renovate:'Verbouwen'};
function pdokDoc(c){return {postcode:c.postcode,huisnummer:c.number,huisnummertoevoeging:c.addition||undefined,straatnaam:c.street,weergavenaam:c.address,gemeentecode:c.code,gemeentenaam:c.municipality,buurtcode:c.neighborhood?`TEST-${c.code}-${c.neighborhood}`:undefined,buurtnaam:c.neighborhood||undefined,wijkcode:undefined,wijknaam:c.neighborhood||undefined,adresseerbaarobject_id:c.bagId,centroide_ll:'POINT(5.0000 52.0000)',gebruiksdoel:c.bagUses};}
async function mockPdok(page,c){await page.route('https://api.pdok.nl/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({response:{numFound:1,docs:[pdokDoc(c)]}})}));}
async function openCase(page,c){await mockPdok(page,c);await page.goto('/adrescheck.html');await page.locator('#postcode').fill(c.postcode);await page.locator('#number').fill(String(c.number));if(c.addition)await page.locator('#addition').fill(c.addition);await page.getByRole('button',{name:'Controleer adres'}).click();await expect(page.locator('#address')).toContainText(c.municipality);for(const use of c.bagUses)await expect(page.locator('body')).toContainText(new RegExp(use,'i'));const label=GOAL_LABELS[c.goal];await page.getByRole('button',{name:new RegExp(label.replace('/','\\/'),'i')}).click();}
async function answerVisibleQuestions(page,c){let i=0;for(let guard=0;guard<12;guard++){const selects=page.locator('.guided-questions select:visible');if(!await selects.count())break;const value=c.answers[Math.min(i,c.answers.length-1)]||'yes';await selects.first().selectOption(value);i++;await page.waitForTimeout(20);}}
function regex(s){return new RegExp(s,'i')}

// Every established municipality/path is rerun. This intentionally covers all goals
// represented by the matrix, not only kamerverhuur and vakantieverhuur.
test.describe('Current E2E — complete golden matrix',()=>{
 for(const c of CASES){
  test(`${c.id} · ${c.municipality} · ${c.goal}`,async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await openCase(page,c);await answerVisibleQuestions(page,c);
   const results=page.locator('.guided-results');const pageText=page.locator('#rules');
   if(c.outcome==='none'){
    await expect(pageText).toContainText(/Nog geen automatische conclusie|geen complete machineleesbare beslisroute|officiële route|beschikbare informatie/i);
   }else if(c.outcome==='precision'){
    for(const p of c.patterns)await expect(pageText).toContainText(regex(p));
    await expect(pageText).not.toContainText(/verhuurvergunning.*opkoop|kamerverhuurvergunning/i);
   }else{
    await expect(results).toBeVisible();
    for(const p of c.patterns)await expect(pageText).toContainText(regex(p));
    const outcomeClass=c.outcome==='no'?'.outcome-no':'.outcome-conditional';
    await expect(results.locator(outcomeClass).first()).toBeVisible();
   }
   // BAG is factual address context and must not be presented as uncertain merely
   // because one or more municipal sources need periodic/extra source control.
   if(c.bagUses?.length)await expect(page.locator('body')).not.toContainText(/BAG.{0,80}(onzeker|extra controle nodig)/i);
   expect(errors,`console/page errors in ${c.id}`).toEqual([]);
  });
 }
});

test('matrix covers every supported goal and multiple municipalities',async()=>{
 const goals=new Set(CASES.map(c=>c.goal));
 for(const goal of Object.keys(GOAL_LABELS))expect(goals.has(goal),`missing goal ${goal}`).toBeTruthy();
 expect(new Set(CASES.map(c=>c.municipality)).size).toBeGreaterThan(15);
 expect(CASES.length).toBeGreaterThanOrEqual(46);
});
