import fs from 'node:fs';
const R=p=>JSON.parse(fs.readFileSync(p,'utf8'));

// Generate next deterministic monotonic auto-national batch id using persisted filenames
// format: auto-national-001, auto-national-002, ...

function existingBatchIds(){
  const paths = ['data/research-batches'];
  const names = [];
  for(const p of paths){
    try{
      for(const f of fs.readdirSync(p)) if(f.endsWith('.json')) names.push(f.replace(/\.json$/,''));
    }catch(e){}
  }
  // also check artifacts and reports for previous auto batches
  try{for(const f of fs.readdirSync('artifacts')) if(f.startsWith('auto-national')) names.push(f);}catch{}
  return names;
}

function nextId(prefix='auto-national'){
  const existing = existingBatchIds();
  const re = new RegExp(`^${prefix}-(\\d{3})$`);
  let max=0;
  for(const name of existing){
    const m = name.match(re);
    if(m){
      const n = Number(m[1]); if(n>max) max=n;
    }
  }
  const next = (max+1).toString().padStart(3,'0');
  return `${prefix}-${next}`;
}

export default nextId;

if(process.argv[1]&&process.argv[2]==='--print') console.log(nextId());
