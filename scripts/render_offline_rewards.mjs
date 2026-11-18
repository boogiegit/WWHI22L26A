// Reuse the live Where Next content so saved information cannot drift from it.
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const start=app.indexOf('const DIRECTOR_RECOMMENDATIONS =');
const end=app.indexOf('function canonicalOptionalDescription',start);
if(start<0 || end<0)throw Error('Where Next content not found');
const context={tour:JSON.parse(fs.readFileSync(new URL('../tours/WWHI22L26A/data.json',import.meta.url),'utf8')),escapeHtml:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
vm.createContext(context);
vm.runInContext(app.slice(start,end),context);
vm.runInContext(fs.readFileSync(new URL('../js/rendering/rewards-renderer.js',import.meta.url),'utf8'),context);
process.stdout.write(vm.runInContext('renderRewards()',context));
