import {test,expect} from '@playwright/test';

async function submitAddress(page,{postcode,number,addition=''}){
  await page.goto('/');
  await page.locator('#postcode').fill(postcode);
  await page.locator('#number').fill(String(number));
  if(addition) await page.locator('#addition').fill(addition);
  await page.getByRole('button',{name:'Controleer adres'}).click();
  await expect(page.locator('#message')).toHaveClass(/success/,{timeout:30000});
  await expect(page.locator('#badge