import {test,expect} from '@playwright/test';

const leidenAddress={
  postcode:'2315SW',huisnummer:51,straatnaam:'Trompstraat',weergavenaam:'Trompstraat 51, 2315 SW Leiden',
  gemeentecode:'0546',gemeentenaam:'Leiden',buurtcode:'BU05460102',buurtnaam:'De Waard',wijkcode:'WK054601',wijknaam:'De Waard',
  adresseerbaarobject_id:'0546010000000001',centroide_ll:'POINT(4.5100 52.1600)',gebruiksdoel:['woonfunctie']
};

async function mockPdok(page){
 await page.route('https://api.pdok.nl/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({response:{numFound:1,docs:[leidenAddress]}})}));
}
async function errors(page){const found=[];page.on('pageerror',e=>found.push(String(e)));page.on('console',m=>{if(m.type()==='error')found.push(m.text())});return found}
async function address(page){await page.goto('/adrescheck.html');await page.locator('#postcode').fill('2315SW');await page.locator('#number').fill('51');await page.getByRole('button',{name:'Controleer adres'}).click();await expect(page.locator('#address')).toContainText('Trompstraat 51');await expect(page.locator('#address')).toContainText('Leiden')}

test('homepage houdt uitleg voorop en verwijst naar aparte adrescheck',async({page})=>{await page.goto('/');await expect(page.locator('#postcode')).toHaveCount(0);const links=page.locator('a[href*="adrescheck.html"]');await expect(links.first()).toBeVisible();await expect(links.first()).toHaveAttribute('href',/adrescheck\.html/)});

test('ongeldige adresinvoer geeft duidelijke foutmeldingen',async({page})=>{await page.goto('/adrescheck.html');await page.getByRole('button',{name:'Controleer adres'}).click();await expect(page.locator('#message')).toContainText('postcode');await page.locator('#postcode').fill('1234 AB');await page.locator('#number').fill('10');await page.route('https://api.pdok.nl/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"response":{"docs":[]}}'}));await page.getByRole('button',{name:'Controleer adres'}).click();await expect(page.locator('#message')).toContainText('Geen adres gevonden')});

test('BAG/gemeente, zeven doelen en terugnavigatie werken',async({page})=>{await mockPdok(page);const errs=await errors(page);await address(page);await expect(page.getByText('Huidig geregistreerd gebruik (BAG)')).toBeVisible();await expect(page.getByText('woonfunctie')).toBeVisible();for(const name of ['Gehele woning verhuren','Kamers verhuren / woning delen','Woning splitsen','Vakantieverhuur / Airbnb','Pand naar woning veranderen','Verbouwen','Alle mogelijkheden voor dit adres bekijken'])await expect(page.getByRole('button',{name:new RegExp(name.replace('/','\\/'))})).toBeVisible();await page.getByRole('button',{name:/Gehele woning verhuren/}).click();await expect(page.getByRole('button',{name:/Ander doel kiezen/})).toBeVisible();await page.getByRole('button',{name:/Ander doel kiezen/}).click();await expect(page.getByRole('button',{name:/Kamers verhuren/})).toBeVisible();expect(errs).toEqual([])});

test('Leiden opkoopbescherming stelt vragen sequentieel en toont officiële vervolgroutes',async({page})=>{await mockPdok(page);await address(page);await page.getByRole('button',{name:/Gehele woning verhuren/}).click();const card=page.locator('.guided-card').filter({hasText:'Opkoopbescherming'});await expect(card).toBeVisible();await expect(card.locator('select')).toHaveCount(1);await card.locator('select').selectOption('yes');await expect(card.locator('select')).toHaveCount(1);await card.locator('select').selectOption('no');await expect(card.locator('select')).toHaveCount(0);await expect(card.getByText('Resultaat',{exact:true})).toBeVisible();const details=card.locator('details');await expect(details).toHaveAttribute('open','');await expect(details).toContainText(/Meer weten|offici/i);await expect(details.locator('a[href^="https:"]').first()).toBeVisible()});

test('Leiden 2315SW gebiedsregel wordt automatisch gebruikt voor kamerverhuur',async({page})=>{await mockPdok(page);await address(page);await page.getByRole('button',{name:/Kamers verhuren/}).click();await expect(page.locator('.guided-results')).toContainText(/aangewezen gebied|omzettingsvergunning|straatquotum/i)});

test('bronzekerheid staat los van BAG-gebruiksdoel',async({page})=>{await mockPdok(page);await address(page);await expect(page.getByText('woonfunctie',{exact:true})).toBeVisible();const certainty=page.locator('body');await expect(certainty).not.toContainText(/woonfunctie.*extra controle nodig/i)});

test('alle zes afzonderlijke doelen plus totaaloverzicht openen zonder JavaScript-fouten',async({page})=>{await mockPdok(page);const errs=await errors(page);await address(page);for(const name of ['Gehele woning verhuren','Kamers verhuren / woning delen','Woning splitsen','Vakantieverhuur / Airbnb','Pand naar woning veranderen','Verbouwen','Alle mogelijkheden voor dit adres bekijken']){await page.getByRole('button',{name:new RegExp(name.replace('/','\\/'))}).click();await expect(page.locator('#rules')).toBeVisible();const back=page.getByRole('button',{name:/Ander doel kiezen/});if(await back.count())await back.click()}expect(errs).toEqual([])});
