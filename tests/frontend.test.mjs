import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'tests/.runtime/package.json'));
const { parseHTML } = require('linkedom');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const { document } = parseHTML(html);
const calls = [];
function store() {
  return { getItem(key) { return this[key] ?? null; }, setItem(key, value) { this[key] = String(value); }, removeItem(key) { delete this[key]; } };
}
let serverRole = null;
let uploadMode = 'ok';
let saveFails = false;
const processedPhotoUrl = './api.php?action=privateFile&path=uploads%2Fphotos%2F' + 'c'.repeat(40) + '.jpg';
const fakeLocation = new URL('https://tour.example.invalid/WWHI22L26A/app.html?admin=1&pin=synthetic');
fakeLocation.replace = () => {};
const context = {
  document, crypto:webcrypto, location: fakeLocation, URL, URLSearchParams, Blob, FormData, AbortController,
  TextEncoder, TextDecoder, Uint8Array, DataView, Date, Intl, console: { log() {}, warn() {}, error() {} },
  navigator: { language: 'en-GB', userAgent: 'Test', platform: 'Test', maxTouchPoints: 0 },
  localStorage: store(), sessionStorage: store(), innerWidth: 1024, innerHeight: 800,
  screen: { width: 1024, height: 800 }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  history: { replaceState(_s, _t, url) { calls.push({ history: url }); } },
  setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  requestAnimationFrame() {}, addEventListener() {}, scrollTo() {}, alert() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  fetch: async (input, options = {}) => {
    const url = new URL(input, fakeLocation);
    calls.push({ url: url.href, options });
    if (url.pathname.endsWith('/api.php')) {
      const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};
      const action = body.action || url.searchParams.get('action');
      let data = { keys: [], value: null };
      if (action === 'uploadPhoto') {
        assert.ok(options.body instanceof FormData && options.headers['X-CSRF-Token'] === 'synthetic-csrf', 'Images use authenticated multipart upload');
        return { ok: uploadMode !== 'quota', status: uploadMode === 'quota' ? 413 : 200,
          json: async () => uploadMode === 'quota' ? { error: 'Photo storage limit reached.' } : { url: uploadMode === 'inline' ? 'data:image/jpeg;base64,AAAA' : processedPhotoUrl } };
      }
      if (action === 'set' && saveFails) return {ok:false,status:503,json:async()=>({error:'Synthetic unavailable'})};
      if (action === 'login') {
        assert.ok(body.role === 'admin' && body.password === 'synthetic-new-password', 'Admin login goes to server');
        serverRole = 'admin';
      }
      if (action === 'lockAdmin') serverRole = null;
      if (['session', 'login', 'lockAdmin'].includes(action)) data = {
        role: serverRole, csrfToken: 'synthetic-csrf', config: { whatsappCommunityUrl: serverRole === 'admin' ? 'https://chat.example.invalid/synthetic' : '', analyticsEnabled: true }
      };
      return { ok: true, status: 200, json: async () => data };
    }
    const rel = url.pathname.replace('/WWHI22L26A/', '');
    if (url.origin === fakeLocation.origin && rel.startsWith('config/') || rel.startsWith('tours/')) {
      return { ok: true, status: 200, text: async () => fs.readFileSync(path.join(root, rel), 'utf8'), json: async () => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }
};
context.window = context;
vm.createContext(context);
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const src = /src="([^\"]+)"/.exec(match[1])?.[1];
  if (src?.startsWith('./')) vm.runInContext(fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8'), context, { filename: src });
  else if (!src) vm.runInContext(match[2], context, { filename: 'app.html' });
}
for (let n = 0; n < 40; n++) await new Promise(resolve => setImmediate(resolve));
if (document.getElementById('app').textContent.includes('Could not load the app')) console.log(document.getElementById('app').textContent.trim());
assert.ok(!document.getElementById('app').textContent.includes('Could not load the app'), 'Full app startup renders successfully');
assert.ok(document.getElementById('app').textContent.length > 500, 'Tour content rendered');
assert.equal(document.querySelector('#tour-sign-in'), null, 'No guest login screen');
assert.ok(!calls.some(c => c.options?.body && typeof c.options.body === 'string' && JSON.parse(c.options.body).action === 'login'), 'Public startup does not authenticate');
assert.ok(vm.runInContext('ADMIN_MODE === false', context), 'URL PIN cannot enable admin');
assert.ok(calls.some(call => call.history && !call.history.includes('pin=')), 'Legacy PIN removed from URL');
assert.ok(vm.runInContext('WHATSAPP_COMMUNITY_URL === authState.config.whatsappCommunityUrl', context), 'Runtime community configuration applied');
for (const tab of ['today', 'programme', 'experiences', 'tools', 'director', 'contacts']) {
  vm.runInContext(`setTab(${JSON.stringify(tab)})`, context);
}
vm.runInContext('openAdminLogin()', context);
const passwordInput = document.querySelector('[data-admin-pin]');
assert.ok(passwordInput && passwordInput.type === 'password', 'Admin password dialog rendered');
passwordInput.value = 'synthetic-new-password';
await vm.runInContext('unlockAdminWithPin()', context);
assert.ok(vm.runInContext('ADMIN_MODE', context), 'Server-confirmed admin unlock');
await vm.runInContext('lockMobileAdmin()', context);
assert.ok(vm.runInContext('!ADMIN_MODE && !FULL_ADMIN_UI', context), 'Server-confirmed admin lock');
const before = calls.length;
vm.runInContext("trackAnalytics('click:Synthetic name'); trackAnalytics('doc:private.pdf'); trackAnalytics('visit');", context);
const analytics = calls.slice(before).filter(call => call.options?.body).map(call => JSON.parse(call.options.body));
assert.ok(analytics.length === 1 && analytics[0].event === 'visit' && Object.keys(analytics[0]).length === 2, 'Only fixed analytics events leave client');

// Real upload orchestration must never save local or inline fallbacks after a server failure.
vm.runInContext(`
  authState.config.uploadsEnabled = true;
  prepareGalleryPhoto = async () => ({ blob: new Blob(['synthetic upload transport'], { type: 'image/png' }) });
  loadToolPhotos = async () => {};
  setToolPhotoStatus = (text) => { globalThis.photoStatus = text; };
  alert = (text) => { globalThis.photoAlert = text; };
`, context);
const photoEvent = () => ({ target: { files: [{ name: 'synthetic.png' }], value: 'selected' } });
context.photoEvent = photoEvent();
let photoCallStart = calls.length;
await vm.runInContext('handleToolPhotoUpload(photoEvent)', context);
let photoWrites = calls.slice(photoCallStart).filter(call => typeof call.options?.body === 'string').map(call => JSON.parse(call.options.body)).filter(body => body.action === 'set');
assert.ok(photoWrites.length === 1, 'Successful processed photo is saved once');
const storedPhoto = JSON.parse(photoWrites[0].value);
assert.ok(['url','downloadUrl','thumbUrl'].every(field => storedPhoto[field] === processedPhotoUrl), 'Thumbnail, display and download all reuse processed URL');
assert.ok(!photoWrites[0].value.includes('data:'), 'No inline thumbnail enters shared storage');
for (const failureMode of ['quota', 'inline']) {
  uploadMode = failureMode;
  context.photoEvent = photoEvent();
  photoCallStart = calls.length;
  await vm.runInContext('handleToolPhotoUpload(photoEvent)', context);
  photoWrites = calls.slice(photoCallStart).filter(call => typeof call.options?.body === 'string').map(call => JSON.parse(call.options.body)).filter(body => body.action === 'set');
  assert.ok(photoWrites.length === 0 && context.photoStatus.includes('failed'), 'Rejected upload has no storage fallback');
}
uploadMode = 'ok';
context.photoEvent = photoEvent();
photoCallStart = calls.length;
await vm.runInContext("handleOptionalUpload(photoEvent, 'Synthetic experience')", context);
photoWrites = calls.slice(photoCallStart).filter(call => typeof call.options?.body === 'string').map(call => JSON.parse(call.options.body)).filter(body => body.action === 'set');
assert.ok(photoWrites.length === 1 && photoWrites[0].value === processedPhotoUrl, 'Experience uploader uses processed URL too');
uploadMode = 'quota';
context.photoEvent = photoEvent();
photoCallStart = calls.length;
await vm.runInContext("handleOptionalUpload(photoEvent, 'Synthetic failure')", context);
assert.ok(!calls.slice(photoCallStart).some(call => typeof call.options?.body === 'string' && JSON.parse(call.options.body).action === 'set'), 'Experience upload failure cannot save inline bytes');
assert.ok(context.photoAlert.includes('limit'), 'Experience upload failure is reported');
vm.runInContext('USE_REMOTE_STORAGE = false', context);
context.photoEvent = photoEvent();
photoCallStart = calls.length;
await vm.runInContext('handleToolPhotoUpload(photoEvent)', context);
assert.ok(calls.length === photoCallStart && context.photoStatus.includes('Sign in'), 'Preview cannot create a local photo-byte fallback');
vm.runInContext('USE_REMOTE_STORAGE = true', context);


// Tour-specific day coverage and onward form behaviour.
assert.equal(vm.runInContext('tour.days.length',context),12);
for(let day=1;day<=12;day++) {
  assert.ok(vm.runInContext(`endOfDayPreviewCard(dayByNumber(${day})).includes("Today's Journey Recap")`,context));
  assert.equal(vm.runInContext(`dayLinksAndDocumentsSection(dayByNumber(${day})).includes('No links or documents')`,context), ![1,4,5,6,7].includes(day));
}
assert.equal(vm.runInContext('getDayResourceLinks(1).length',context),2);
vm.runInContext('dayResourceCache.set(dayResourceLinksKey(1), JSON.stringify({items:[]}))', context);
assert.equal(vm.runInContext('getDayResourceLinks(1).length',context),0,'An admin can remove all bundled links without their reappearing');
vm.runInContext('dayResourceCache.delete(dayResourceLinksKey(1))', context);
assert.ok(vm.runInContext(`traditionalEuropeExperiences().some(item => item.title.includes('Montmartre') && item.price === '€50')`,context));
assert.ok(vm.runInContext(`!traditionalEuropeExperiences().some(item => /Tyrolean|Versailles/.test(item.title))`,context));
assert.equal(vm.runInContext("(renderItineraryDays().match(/Today's Links & Documents/g)||[]).length",context),12);
vm.runInContext('showOnwardOpeningPrompt=false',context);
for(let day=1;day<=12;day++)assert.equal(vm.runInContext(`renderTodayImportantActions(dayByNumber(${day})).includes('Please complete your onward travel details.')`,context),[5,6,7].includes(day));
assert.ok(vm.runInContext("renderIntroWelcome().includes('Please complete your onward travel details.')",context));
assert.ok(!vm.runInContext("renderIntroWelcome().includes('Preferably')",context));
const flight={name:'Synthetic Guest',plan:'flying',airport:'Paris CDG',flightDate:'2026-10-22',flightTime:'10:31',terminal:'Not known',airline:'Example Air',flightNumber:'EX123',transferType:'complimentary'};
function mountForm(record){context.formRecord=record;vm.runInContext('APP_ROOT.innerHTML=renderOnwardTravelForm(formRecord)',context);}
function writesAfter(index){return calls.slice(index).filter(c=>typeof c.options?.body==='string').map(c=>JSON.parse(c.options.body)).filter(b=>b.action==='set');}
mountForm({...flight,flightTime:'10:30'});let start=calls.length;
await vm.runInContext('submitOnwardTravel()',context);assert.equal(writesAfter(start).length,0);assert.ok(document.getElementById('onward-status').textContent.includes('after 10:30'));
mountForm(flight);start=calls.length;await vm.runInContext('submitOnwardTravel()',context);assert.equal(writesAfter(start).length,1);
const first=JSON.parse(writesAfter(start)[0].value);assert.equal(first.airline,'Example Air');assert.equal(first.transferType,'complimentary');
assert.ok(vm.runInContext('loadLocalOnwardTravel().submittedAt',context));
saveFails=true;mountForm({...flight,name:'Changed synthetic guest'});await vm.runInContext('submitOnwardTravel()',context);
assert.ok(document.getElementById('onward-status').textContent.includes('not confirmed'));assert.equal(vm.runInContext('loadLocalOnwardTravel().name',context),flight.name);saveFails=false;
const rail={name:'Synthetic Rail Guest',plan:'eurostar',eurostarDate:'2026-10-22',eurostarTime:'09:00',londonFlying:'yes',londonAirport:'Heathrow',londonFlightDate:'2026-10-23',londonFlightTime:'13:00',londonTerminal:'5',londonAirline:'Example Air',londonFlightNumber:'EX456'};
mountForm({...rail,londonFlightNumber:''});start=calls.length;await vm.runInContext('submitOnwardTravel()',context);assert.equal(writesAfter(start).length,0);
mountForm(rail);start=calls.length;await vm.runInContext('submitOnwardTravel()',context);assert.equal(JSON.parse(writesAfter(start)[0].value).londonFlightNumber,'EX456');
mountForm({...rail,londonFlying:'no'});start=calls.length;await vm.runInContext('submitOnwardTravel()',context);assert.ok(!('londonAirport' in JSON.parse(writesAfter(start)[0].value)));
mountForm({...flight,plan:'staying'});start=calls.length;await vm.runInContext('submitOnwardTravel()',context);const stay=JSON.parse(writesAfter(start)[0].value);assert.ok(!('airport' in stay));assert.equal(stay.sharedKey,first.sharedKey);
vm.runInContext('ADMIN_MODE=true;FULL_ADMIN_UI=true',context);
await vm.runInContext("persistDayResource(5,'https://example.invalid/guide','Synthetic guide')",context);
assert.ok(vm.runInContext("dayLinksAndDocumentsSection(dayByNumber(5),'itinerary').includes('Synthetic guide')",context));
assert.ok(!vm.runInContext("dayLinksAndDocumentsSection(dayByNumber(6)).includes('Synthetic guide')",context));
await assert.rejects(vm.runInContext("persistDayResource(5,'javascript:alert(1)','bad')",context));
saveFails=true;await assert.rejects(vm.runInContext("persistDayResource(5,'https://example.invalid/new','Not saved')",context));saveFails=false;
assert.equal(vm.runInContext('getDayResourceLinks(5).length',context),2, 'Failed save preserves the bundled link and the successfully added link');
vm.runInContext('ADMIN_MODE=false;FULL_ADMIN_UI=false',context);
await assert.rejects(vm.runInContext("persistDayResource(5,'https://example.invalid/new','Not allowed')",context));
assert.deepEqual([...vm.runInContext('SAFE_ANALYTICS_EVENTS',context)].sort(),JSON.parse(fs.readFileSync(path.join(root,'config/analytics-events.json'),'utf8')).sort());
start=calls.length;vm.runInContext("trackAnalytics('tool:weather');trackAnalytics('tab:programme');trackAnalytics('itinerary:day:12');trackAnalytics('onward:submitted');trackAnalytics('doc:Synthetic Guest.pdf')",context);
assert.equal(calls.slice(start).filter(c=>typeof c.options?.body==='string').length,4);
console.log('PASS: 12 recaps and resource days, welcome/day 5–7 prompts, 10:30 cutoff, Paris/private/Eurostar/London form fields, private saved state, failure recovery, shared resource persistence and fixed analytics coverage.');

const listeners = {};
const cached = [];
const fetched = [];
const scope = 'https://tour.example.invalid/WWHI22L26A/';
const worker = {
  URL, self: { registration: { scope }, location: { origin: new URL(scope).origin },
    addEventListener: (type, fn) => { listeners[type] = fn; }, skipWaiting() {}, clients: { claim() {} } },
  caches: { open: async () => ({ addAll: async urls => { cached.push(...urls); }, put: async () => {} }),
    keys: async () => ['wwhi22l26a-static-old', 'ewhi11j26a-static-v169', 'bush-tour-v156', 'other-app-cache'], delete: async key => { cached.push(`deleted:${key}`); }, match: async () => undefined },
  fetch: async (req, options) => { fetched.push({ req, options }); return { ok: true, redirected: false, headers: { get: () => '' }, clone() { return this; } }; }
};
vm.createContext(worker);
vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), worker);
let pending;
listeners.install({ waitUntil(promise) { pending = promise; } }); await pending;
for (const url of cached) {
  assert.ok(fs.existsSync(path.join(root, new URL(url).pathname.replace('/WWHI22L26A/', ''))), 'Every precache resource exists');
  assert.ok(!/api\.php|menu-choices|seating-plans|tickets|passes|tour-data|app\.html/.test(url), 'Precache excludes private resources');
}
listeners.activate({ waitUntil(promise) { pending = promise; } }); await pending;
assert.ok(cached.includes('deleted:wwhi22l26a-static-old') && !cached.includes('deleted:ewhi11j26a-static-v169') && !cached.includes('deleted:bush-tour-v156') && !cached.includes('deleted:other-app-cache'), 'New tour cache purged without touching original tour caches');
for (const file of ['api.php?action=get', 'menu-choices.json', 'seating-plans/private.pdf', 'uploads/photos/private.jpg', 'app.html']) {
  listeners.fetch({ request: { url: scope + file, method: 'GET', mode: 'cors' }, respondWith(promise) { pending = promise; } }); await pending;
  assert.ok(fetched.at(-1).options.cache === 'no-store', 'Private request bypasses cache');
}
console.log('PASS: Full app startup, six tabs, admin sign-in/lock, invitation config, validated photo/thumbnail routes, failed-upload rejection, analytics filtering and service-worker privacy.');

vm.runInContext("activeTab='today'; recordAnalyticsVisit()",context);
assert.ok(calls.some(c=>c.options?.body?.includes?.('tab:today')),'Initial Today counted');
assert.ok(vm.runInContext('renderOnwardTravelForm({partySize:2})',context).includes('both names if travelling as a couple'));
assert.ok(vm.runInContext('renderOnwardTravelForm({partySize:2})',context).includes('value="2" selected'));
const days=JSON.parse(fs.readFileSync(path.join(root,'tours/WWHI22L26A/itinerary.json'))).days;
const expected={2:['06:15|Breakfast and Bags'],3:['13:15|Depart Munich'],4:['07:15|Breakfast and bags','08:15|Depart Innsbruck'],6:["08:00|Arrive Vatican — Inside St. Peter's","10:15|Depart on coach to continue Inside St. Peter's and Legends and Landmarks of Rome","12:45|Return to hotel for rest & Lunch"],7:['12:15|Meet local specialist for included sightseeing walk','13:15|Free time for late lunch and free time'],9:['08:00|Depart hotel for Mount Stanserhorn'],10:['06:00|Breakfast and Bags','EVE|Depart on local coach for hotel'],11:['17:30|Paris Included Dinner']};
for(const [number,rows] of Object.entries(expected))for(const row of rows)assert.ok(days.find(d=>d.number===Number(number)).schedule.some(s=>`${s.time}|${s.title}`===row),row);
vm.runInContext(`const oldDay={number:3,schedule:[{time:'13:30',title:'Depart'}]}; applyOctoberScheduleUpdates(oldDay); if(oldDay.schedule[0].time!=='13:15')throw Error('Migration'); oldDay.schedule[0].time='13:30';applyOctoberScheduleUpdates(oldDay,'20261002-details');if(oldDay.schedule[0].time!=='13:30')throw Error('New edits must survive');`,context);
assert.equal(vm.runInContext("timelineItemMatchesMapCity({number:10},{title:'Depart Lucerne'},'lucerne')",context),false);
console.log('PASS: revised itinerary, selective old-override migration, couples form and initial Today analytics.');

assert.equal(vm.runInContext("periodForTime('Evening')",context),'evening');
assert.equal(vm.runInContext("periodForTime('EVE')",context),'evening');

vm.runInContext(`const repeated={number:3,schedule:[{time:'09:45',title:'Depart'},{time:'13:30',title:'Depart'}]};applyOctoberScheduleUpdates(repeated);if(repeated.schedule[0].title!=='Depart'||repeated.schedule[1].title!=='Depart Munich'||repeated.schedule[1].time!=='13:15')throw Error('Repeated departure matching');`,context);

vm.runInContext(`const oldDeparture={number:2,schedule:[{time:'14:20',title:'Depart St. Goar'}]};applyOctoberScheduleUpdates(oldDeparture,'20261002-details');if(oldDeparture.schedule[0].title!=='Depart Boppard')throw Error('Saved departure migration'); oldDeparture.schedule[0].title='Depart St. Goar';applyOctoberScheduleUpdates(oldDeparture,'20261006-fixes');if(oldDeparture.schedule[0].title!=='Depart St. Goar')throw Error('Later admin edit must survive');`,context);

vm.runInContext(`localStorage.setItem('tour:EWHI11J26A:keep','original'); localStorage.setItem('tour:WWHI22L26A:clear','new'); clearPrivateBrowserState(); if(localStorage.getItem('tour:EWHI11J26A:keep')!=='original' || localStorage.getItem('tour:WWHI22L26A:clear')!==null)throw Error('Independent tour storage');`,context);
