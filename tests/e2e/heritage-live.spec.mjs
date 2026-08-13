import {test,expect} from '@playwright/test';

async function submitAddress(page,{postcode,number,addition=''}){
  await page.goto('/');
  await page.locator('#postcode').fill(postcode);
  await page.locator('#number').fill(String(number));
  if(addition) await page.locator('#addition').fill(addition);
  await page.getByRole('button',{name:'Controleer adres'}).click();
  await expect(page.locator('#message')).toHaveClass(/success/,{timeout:30000});
  await expect(page.locator('#badge')).toContainText('Adres gecontroleerd');
}

test('live PDOK single-address rijksmonument wordt herkend',async({page})=>{
  await submitAddress(page,{postcode:'1012DA',number:37});
  await expect(page.locator('#rules')).toContainText('Erfgoedstatus (RCE)',{timeout:30000});
  await expect(page.locator('#rules')).toContainText('Rijksmonument 8');
});

test('live PDOK multi-adres rijksmonument koppelt individueel adres',async({page})=>{
  await submitAddress(page,{postcode:'1012DA',number:23,addition:'H'});
  await expect(page.locator('#rules')).toContainText('Erfgoedstatus (RCE)',{timeout:30000});
  await expect(page.locator('#rules')).toContainText('Rijksmonument 2');
});

test('live PDOK gewoon adres geeft geen rijksmonument false positive',async({page})=>{
  await submitAddress(page,{postcode:'1082MS',number:1});
  await expect(page.locator('#rules')).not.toContainText('Erfgoedstatus (RCE)',{timeout:30000});
});
