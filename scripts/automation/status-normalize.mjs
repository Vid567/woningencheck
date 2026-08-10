// Normalization helpers for canonical verification route and outcome
import fs from 'node:fs';
export const canonicalRoutes = {
  'structured-verification': 'structured-verification',
  'deep-verification': 'deep-verification',
  'manual-review': 'manual-review'
};

const routeAliases = new Map([
  // legacy -> canonical
  ['structured-verification-required','structured-verification'],
  ['deep-verification-required','deep-verification'],
  ['source-incomplete','manual-review'],
]);

export function normalizeRoute(value){
  if(!value) return null;
  if(canonicalRoutes[value]) return value;
  if(routeAliases.has(value)) return routeAliases.get(value);
  // tolerant guesses
  const v=String(value).toLowerCase().replace(/[_ ]+/g,'-');
  if(v.includes('structured')) return 'structured-verification';
  if(v.includes('deep')) return 'deep-verification';
  if(v.includes('manual')||v.includes('legal')||v.includes('source')) return 'manual-review';
  return null;
}

export const canonicalOutcomes = {
  'structured-complete':'structured-complete',
  'targeted-review':'targeted-review',
  'deep-manual-review':'deep-manual-review'
};

const outcomeAliases = new Map([
  ['verified','structured-complete'],
  ['partially-verified','targeted-review'],
  ['legal-review-required','deep-manual-review'],
  ['source-review','targeted-review'],
  ['conflict','targeted-review']
]);

export function normalizeOutcome(value){
  if(!value) return null;
  if(canonicalOutcomes[value]) return value;
  if(outcomeAliases.has(value)) return outcomeAliases.get(value);
  const v=String(value).toLowerCase().replace(/[_ ]+/g,'-');
  if(v.includes('part')||v.includes('partial')) return 'targeted-review';
  if(v.includes('verify')||v.includes('verified')) return 'structured-complete';
  if(v.includes('legal')||v.includes('manual')) return 'deep-manual-review';
  return null;
}
