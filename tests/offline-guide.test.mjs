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

assert.ok(!html.includes('class="time"'));
assert.ok(!html.includes('Colosseum entry'));
for(const section of ['itinerary','experiences','hotels','contacts'])assert.ok(html.includes(`id="${section}"`));
assert.ok(html.includes('Gondolas'));
assert.ok(html.includes('+447850880535'));
const deleted=[];
context.caches.keys=async()=>['wwhi22l26a-offline-guide-v1','wwhi22l26a-offline-guide-v2','wwhi22l26a-offline-guide-v4','wwhi22l26a-static-v177','wwhi22l26a-static-v185','ewhi11j26a-static-v1'];
context.caches.delete=async key=>deleted.push(key);
context.self.clients={claim:async()=>{}};
let activation;listeners.activate({waitUntil:p=>activation=p});await activation;
assert.deepEqual(deleted,['wwhi22l26a-offline-guide-v1','wwhi22l26a-offline-guide-v2','wwhi22l26a-static-v177']);
console.log('PASS: no Today schedule, offline experiences/contacts, old guide removed without touching original app caches.');
