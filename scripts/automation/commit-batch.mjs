import {execSync} from 'node:child_process';
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const paths = (args.paths||args.p||'').split(',').map(s=>s.trim()).filter(Boolean);
const message = args.message||`Persist batch ${new Date().toISOString()}`;
const branch = args.branch||process.env.GITHUB_REF?.replace('refs/heads/','')||'main';
const remote = args.remote||'origin';
const simulate = args.simulate==='true' || args.simulate===true || args.simulate==='1';

function run(cmd){
  try{return execSync(cmd,{stdio:'pipe'}).toString().trim()}catch(e){throw new Error(`${cmd} failed: ${e.message}\n${e.stdout?.toString()||''}\n${e.stderr?.toString()||''}`)}
}

if(!paths.length) throw Error('No paths provided. Use --paths=comma,separated,paths');

console.log('Commit-batch: staging paths',paths);
for(const p of paths){
  if(!fs.existsSync(p)) console.warn('Warning: path not found',p);
}

if(simulate){
  console.log('Simulate mode: showing git status');
  console.log(run('git status --porcelain'));
  console.log('Would run: git add',paths.join(' '));
  console.log('Would run: git commit -m',message);
  console.log('Would run: git pull --rebase',remote,branch);
  console.log('Would run: git push',remote,branch);
  process.exit(0);
}

run(`git add ${paths.map(p=>`"${p}"`).join(' ')}`);
// ensure there is something to commit
const status = run('git status --porcelain');
if(!status) { console.log('No changes to commit'); process.exit(0); }

run(`git config user.name "github-actions[bot]"`);
run(`git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`);
try{
  run(`git commit -m "${message.replace(/\"/g,'\\\"')}"`);
}catch(e){
  console.log('git commit failed or nothing to commit',e.message);
}

// pull/rebase from remote
console.log('Pull with rebase to avoid merge commits');
run(`git pull --rebase ${remote} ${branch}`);

// push
console.log('Pushing commit');
run(`git push ${remote} ${branch}`);
console.log('Persisted batch to remote');
