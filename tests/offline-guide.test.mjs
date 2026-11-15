import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const scope='https://example.invalid/WWHI22L26A/';
const listeners={},guide={text:'saved guide'};let requests=0;
const context={URL,Response,self:{registration:{scope},location:{origin:'https://example.invalid'},addEventListener:(type,fn)=>listeners[type]=fn},caches:{open:async()=>({match:async url=>url===scope+'offline-guide.html'?guide:undefined}),match:async()=>undefined},fetch:async()=>{requests++;throw Error('offline');}};
vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),context);
for(const path of ['','app.html','app.html?tab=announcements','index.html','offline-guide.html']){
 let pending;listeners.fetch({request:{method:'GET',mode:'navigate',url:scope+path},respondWith:p=>pending=p});assert.equal(await pending,guide,'Saved guide opens without network: '+path);
}
let privateRequest;listeners.fetch({request:{method:'GET',mode:'navigate',url:scope+'api.php?action=interestSummary'},respondWith:p=>privateRequest=p});await assert.rejects(privateRequest,'Private API never falls back to tour guide');
let originalIntercepted=false;listeners.fetch({request:{method:'GET',mode:'navigate',url:'https://example.invalid/EWHI11J26A/app.html'},respondWith:p=>{originalIntercepted=true;p.catch(()=>{});}});assert.equal(originalIntercepted,true); // Network only; never serves this tour's guide.
const html=fs.readFileSync(new URL('../offline-guide.html',import.meta.url),'utf8');
for(let day=1;day<=12;day++)assert.ok(html.includes(`id="day-${day}"`));
assert.ok(html.includes('Arrival in London'));assert.ok(!html.includes('Meeting Point 3'));assert.ok(html.includes('Astoria'));assert.ok(html.includes('not live admin changes'));
console.log('PASS: offline entry points, private-route isolation, 12 days, hotels and London guidance.');
