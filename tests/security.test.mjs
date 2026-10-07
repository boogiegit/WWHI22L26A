import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'tests/.runtime/package.json'));
const ignore = require('ignore');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime, createNodeFsMountHandler } = require('@php-wasm/node');
const runtime = fs.mkdtempSync(path.join(root, 'tests/.runtime/run-'));
const site = path.join(runtime, 'site');
fs.mkdirSync(path.join(site, 'server'), { recursive: true });
fs.mkdirSync(path.join(runtime, 'internal'), { recursive: true });
for (const file of ['api.php', 'server/bootstrap.php', 'server/onward.php', 'server/resource-preview.php', 'server/config.example.php', 'tests/dev-router.php']) {
  fs.mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(site, file));
}
fs.mkdirSync(path.join(site,'config'),{recursive:true});
fs.copyFileSync(path.join(root,'config/analytics-events.json'),path.join(site,'config/analytics-events.json'));
const php = new PHP(await loadNodeRuntime('8.3', {
  emscriptenOptions: { processId: 1, nativeInternalDirPath: path.join(runtime, 'internal') }
}));
await php.mount('/site', createNodeFsMountHandler(site));
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; }
// Parse PHP using PHP itself. No original operational data is used by this test site.
for (const file of ['api.php', 'server/bootstrap.php', 'server/onward.php', 'server/resource-preview.php', 'server/config.example.php', 'tests/dev-router.php']) {
  const result = await php.run({ code: `<?php token_get_all(file_get_contents(${JSON.stringify('/site/' + file)}), TOKEN_PARSE); echo 'ok';` });
  if (result.text !== 'ok' || result.errors) console.log('PHP parser diagnostic:', result.errors || result.text);
  check(result.text === 'ok' && !result.errors, `PHP syntax: ${file}`);
}
const origin = 'https://tour.example.invalid';
const apiPath = '/site/api.php';
async function request(client, action, body, options = {}) {
  const response = await php.run({ scriptPath: apiPath,
    relativeUri: '/WWHI22L26A/api.php?' + new URLSearchParams({ action, ...(options.query || {}) }),
    protocol: 'https', method: body === undefined ? 'GET' : 'POST',
    headers: { Host: 'tour.example.invalid', Cookie: client.cookie || '',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin, 'X-CSRF-Token': client.csrf || '' }),
      ...(options.headers || {}) },
    body: body === undefined ? undefined : (options.rawBody || new TextEncoder().encode(JSON.stringify({ ...body, action }))),
    $_SERVER: { HTTPS: 'on', REMOTE_ADDR: options.ip || '127.0.0.1' }
  });
  check(!response.errors, `No PHP warnings: ${action}`);
  for (const cookie of response.headers['set-cookie'] || []) client.cookie = cookie.split(';')[0];
  let data; try { data = JSON.parse(response.text); } catch { data = {}; }
  if (data.csrfToken) client.csrf = data.csrfToken;
  check((response.headers['cache-control'] || []).some(v => v.includes('no-store')), `No-store: ${action}`);
  check(!response.headers['access-control-allow-origin'], `No permissive CORS: ${action}`);
  return { status: response.httpStatusCode, data, headers: response.headers, bytes: response.bytes };
}
let result = await request({}, 'session');
check(result.status === 503, 'Missing configuration fails closed');
const adminPassword = randomBytes(24).toString('hex');
const setup = await php.run({ code: `<?php $config=require ${JSON.stringify('/site/server/config.example.php')};
$config['origin']=${JSON.stringify(origin)};
$config['admin_password_hash']=password_hash(${JSON.stringify(adminPassword)}, PASSWORD_DEFAULT);
$config['analytics_enabled']=true;
file_put_contents(${JSON.stringify('/site/server/config.local.php')}, '<?php return '.var_export($config,true).';');
echo 'ok';` });
check(setup.text === 'ok', 'Temporary configuration created');
const guest = {}, other = {}, admin = {};
for (const client of [guest, other, admin]) {
  const session = await request(client, 'session');
  check(session.status === 200 && !session.data.role, 'Anonymous session has no privileges');
}
const cookieBefore = admin.cookie;
result = await request(admin, 'login', { role: 'admin', password: adminPassword });
check(result.status === 200 && result.data.role === 'admin', 'Admin authenticates server-side');
check(admin.cookie !== cookieBefore, 'Session ID rotates on sign-in');
check((result.headers['set-cookie'] || []).every(v => /httponly/i.test(v) && /secure/i.test(v) && /samesite=strict/i.test(v)), 'Cookie security attributes');
check((await request(guest, 'login', { role: 'guest', password: 'not-a-credential' })).status === 400, 'Guest login is not supported or required');
check((await request(guest,'resourcePreview',{url:'https://example.com/'})).status===401,'Preview fetching requires admin');
for(const url of ['http://127.0.0.1/','http://[::1]/','http://localhost/','file:///etc/passwd','https://example.com:8080/','https://user:pass@example.com/']) check((await request(admin,'resourcePreview',{url})).status===400,'Unsafe preview address rejected');
const base = 'tour:WWHI22L26A:shared:';
check((await request({}, 'get', undefined, { query: { key: base + 'admin-note:1' } })).status === 200, 'Anonymous public content available');
check((await request(guest, 'set', { key: base + 'admin-note:1', value: 'Synthetic notice' })).status === 403, 'Guest admin write denied');
check((await request(admin, 'set', { key: base + 'admin-note:1', value: 'Synthetic notice' })).status === 200, 'Admin notice save');
check((await request(guest, 'get', undefined, { query: { key: base + 'admin-note:1' } })).data.value === 'Synthetic notice', 'Guest shared notice read');
for (const suffix of ['admin-brief:1','admin-day-content:1','optional-content:example','meeting-points:1','day-resource-links:1','city-guide-links:1','host-content']) {
  check((await request(admin,'set',{key:base+suffix,value:'Synthetic public content'})).status===200,'Admin publishes public tour content');
  check((await request(guest,'get',undefined,{query:{key:base+suffix}})).data.value==='Synthetic public content','Anonymous public tour read');
  check((await request(guest,'set',{key:base+suffix,value:'unauthorized'})).status===403,'Anonymous public content editing denied');
}

// A fresh administrator session can add and remove links created by an older session.
const returningAdmin = {};
await request(returningAdmin, 'session');
check((await request(returningAdmin, 'login', {role:'admin',password:adminPassword})).status === 200, 'Returning administrator signs in');
const resourceKey = base + 'day-resource-links:1';
for (const value of ['[{"url":"https://example.invalid/one"}]', '[{"url":"https://example.invalid/one"},{"url":"https://example.invalid/two"}]', '[]', '[]']) {
  check((await request(returningAdmin,'set',{key:resourceKey,value})).status === 200, 'Administrator edits links across sessions, including unchanged values');
  check((await request(guest,'get',undefined,{query:{key:resourceKey}})).data.value === value, 'Updated links are publicly visible');
}
check((await request(returningAdmin,'delete',{key:resourceKey})).status === 200, 'Returning administrator can delete shared link record');

check((await request(admin, 'set', { key: base + 'admin-note:1', value: 'bad' }, { headers: { 'X-CSRF-Token': 'wrong' } })).status === 403, 'CSRF enforced');
check((await request(admin, 'set', { key: base + 'admin-note:1', value: 'bad' }, { headers: { Origin: 'https://other.example.invalid' } })).status === 403, 'Cross-origin write denied');
check((await request(guest, 'get', undefined, { query: { key: 'tour:OTHER:shared:admin-note:1' } })).status === 403, 'Tour namespace enforced');
const onward = base + 'tool:onward:synthetic';
check((await request(guest, 'set', { key: onward, value: JSON.stringify({ name: 'Synthetic fixture', plan: 'staying' }) })).status === 200, 'Guest personal submission');
check((await request(other, 'get', undefined, { query: { key: onward } })).data.value === null, 'Other guest cannot read personal submission');
check((await request(other, 'list', undefined, { query: { prefix: base + 'tool:onward:' } })).data.keys.length === 0, 'Personal keys not enumerated');
check((await request(other, 'set', { key: onward, value: '{}' })).status === 403, 'Other guest cannot overwrite');
check((await request(other, 'delete', { key: onward })).status === 403, 'Other guest cannot delete');
check((await request(admin, 'get', undefined, { query: { key: onward } })).data.value !== null, 'Admin can read personal submissions');
check((await request(guest, 'uploadPhoto', {})).status === 401, 'Anonymous uploads require administrator');
check((await request(guest, 'set', { key: base + 'tool:photo:synthetic', value: '{}' })).status === 403, 'Photo storage cannot bypass disabled uploads');
check((await request(guest, 'analyticsSummary')).status === 401, 'Analytics summary admin-only');
check((await request(guest, 'trackAnalytics', { event: 'click:Synthetic person' })).status === 400, 'Dynamic labels rejected');
check((await request(guest, 'trackAnalytics', { event: 'visit', device: 'synthetic' })).status === 400, 'Extra analytics fields rejected');
check((await request(guest, 'trackAnalytics', { event: 'visit' })).status === 200, 'Fixed event accepted');
const summary = await request(admin, 'analyticsSummary');
check(summary.status === 200 && summary.data.events.length === 1 && summary.data.events[0].count === 1, 'Aggregate analytics');
check(JSON.stringify(summary.data.onward) === JSON.stringify({total:1,flying:0,eurostar:0,staying:1}), 'Saved-form count includes staying guests');
check(!JSON.stringify(summary.data).includes('Synthetic fixture'), 'Completion summary contains no guest details');
for (const event of ['tab:programme','tab:contacts','tool:weather','itinerary:day:12','recap:day:1','input:change','onward:submitted','document:open','button:click']) check((await request(guest,'trackAnalytics',{event})).status===200,'Expanded fixed event accepted');
check((await request(admin,'trackAnalytics',{event:'tool:onward'})).status===200,'Admin activity included');
check((await request(admin,'analyticsSummary')).data.events.some(r=>r.label==='admin:tool:onward'),'Admin activity separately labelled');
check((await request(guest,'trackAnalytics',{event:'itinerary:day:13'})).status===400,'Unknown day rejected');
const departure={name:'Synthetic flyer',plan:'flying',airport:'Paris CDG',flightDate:'2026-10-22',flightTime:'10:31',terminal:'Not known',airline:'Example Air',flightNumber:'EX123',transferType:'complimentary'};
async function onwardWrite(record){return request(guest,'set',{key:onward,value:JSON.stringify(record)});}
check((await onwardWrite(departure)).status===200,'Complimentary after 10:30 accepted');
check((await onwardWrite({...departure,partySize:2})).status===200,'Couple accepted');
check((await request(admin,'analyticsSummary')).data.onwardPeople===2,'Couple counts as two people and one form');
for (const partySize of [0,3,'2',true]) check((await onwardWrite({...departure,partySize})).status===400,'Invalid party size rejected');
check((await onwardWrite(departure)).status===200,'Legacy single-person form supported');
check((await request(guest,'trackAnalytics',{event:'open:load'},{headers:{'User-Agent':'Synthetic iPhone private marker','X-Country':'GB'}})).status===200,'Device event accepted');
const deviceSummary=(await request(admin,'analyticsSummary')).data;
check(deviceSummary.breakdown.some(r=>r.label==='device:iPhone' && r.count===1),'Device class counted');
check(deviceSummary.breakdown.some(r=>r.label==='country:Unknown'),'Untrusted country header ignored');
check(!JSON.stringify(deviceSummary).includes('private marker'),'Raw user agent not retained');

check(JSON.stringify((await request(admin,'analyticsSummary')).data.onward) === JSON.stringify({total:1,flying:1,eurostar:0,staying:0}), 'Updating a form changes its category without double counting');
for(const time of ['10:29','10:30'])check((await onwardWrite({...departure,flightTime:time})).status===400,'Complimentary cutoff enforced');
for(const transferType of ['private','own'])check((await onwardWrite({...departure,flightTime:'07:00',transferType})).status===200,'Earlier independent transfer accepted');
for(const patch of [{flightDate:'2026-02-30'},{flightTime:'25:00'},{airline:''},{transferType:'guess'},{plan:'invalid'}])check((await onwardWrite({...departure,...patch})).status===400,'Invalid departure rejected');
const rail={name:'Synthetic rail traveller',plan:'eurostar',eurostarDate:'2026-10-22',eurostarTime:'09:00',eurostarRef:'EX-test',londonFlying:'yes',londonAirport:'Heathrow',londonFlightDate:'2026-10-23',londonFlightTime:'13:00',londonTerminal:'5',londonAirline:'Example Air',londonFlightNumber:'EX456'};
check((await onwardWrite({...rail,londonFlightNumber:''})).status===400,'London fields required when flying');
check((await onwardWrite(rail)).status===200,'Eurostar with London flight saved');
check((await onwardWrite({name:'Synthetic extension guest',plan:'eurostar',londonFlying:'yes',londonFlightDate:'2026-10-23',londonFlightTime:'13:00',londonTerminal:'5',londonFlightNumber:'EX456'})).status===200,'Extension requires only four London flight fields, no train, airport or airline');
check((await onwardWrite({...rail,londonFlying:'no'})).status===200,'Eurostar without flight saved');
let personal=JSON.parse((await request(admin,'get',undefined,{query:{key:onward}})).data.value);
check(!('londonAirport' in personal) && !('flightTime' in personal),'Inactive flight fields discarded');
check((await onwardWrite({...departure,plan:'staying',extra:'Not retained'})).status===200,'Staying update saved');
personal=JSON.parse((await request(admin,'get',undefined,{query:{key:onward}})).data.value);
check(!('airport' in personal) && !('extra' in personal),'Staying stores no flight or arbitrary data');
check((await request(other,'get',undefined,{query:{key:onward}})).data.value===null,'New travel records remain private');
check((await request(other,'set',{key:base+'tool:onward:synthetic-second',value:JSON.stringify(rail)})).status===200,'Second saved form accepted');
check(JSON.stringify((await request(admin,'analyticsSummary')).data.onward) === JSON.stringify({total:2,flying:0,eurostar:1,staying:1}), 'Saved totals reflect separate forms rather than analytics events');
check((await request(admin,'delete',{key:base+'tool:onward:synthetic-second'})).status===200,'Administrator can remove obsolete form');
check((await request(admin,'analyticsSummary')).data.onward.total===1,'Deleted forms no longer counted');

fs.mkdirSync(path.join(site, 'seating-plans'));
fs.writeFileSync(path.join(site, 'seating-plans/synthetic.json'), '{"synthetic":true}');
check((await request({}, 'privateFile', undefined, { query: { path: 'seating-plans/synthetic.json' } })).status === 401, 'Anonymous private file denied');
check((await request(guest, 'privateFile', undefined, { query: { path: 'seating-plans/synthetic.json' } })).status === 401, 'Private file defaults to admin');
await php.run({code:"<?php $p='/site/server/config.local.php'; $c=require $p; $c['guest_files']=['seating-plans/synthetic.json']; file_put_contents($p,'<?php return '.var_export($c,true).';');"});
check((await request(guest,'privateFile',undefined,{query:{path:'seating-plans/synthetic.json',admin:'1',role:'admin'}})).status===401,'Legacy sharing config and guessed admin URL cannot grant private file access');

check((await request(admin, 'privateFile', undefined, { query: { path: 'seating-plans/synthetic.json' } })).status === 200, 'Admin private file access');
check((await request(admin, 'privateFile', undefined, { query: { path: 'seating-plans/../server/config.local.php' } })).status === 403, 'Traversal denied');
// Private collections, invitation and records are inaccessible even to their submitter.
check((await request(guest, 'get', undefined, {query:{key:onward}})).data.value === null, 'Onward submissions are write-only for guests');
check((await request(guest, 'session')).data.config.whatsappCommunityUrl === '', 'Public session has no invitation');
for (const suffix of ['tool:group:synthetic', 'tool:photo-meta:photo:private', 'private:export']) {
  check((await request(admin, 'set', {key:base+suffix,value:'{"synthetic":true}'})).status === 200, 'Admin stores private fixture');
  check((await request(guest, 'get', undefined, {query:{key:base+suffix}})).data.value === null, 'Guessed private record denied');
  check((await request(guest, 'list', undefined, {query:{prefix:base+suffix}})).data.keys.length === 0, 'Private keys not enumerated');
}
check((await request(guest,'photoFeedback',{key:base+'tool:photo-meta:photo:private',text:'test'})).status === 401, 'Anonymous feedback denied');
// Exercise image-processing routes with authenticated administrators only.
for (const client of [guest, other]) check((await request(client,'login',{role:'admin',password:adminPassword})).status===200,'Image test administrator authenticates');
// Enable uploads only in this synthetic test site's ignored configuration.
await php.run({ code: "<?php $p='/site/server/config.local.php'; $c=require $p; $c['uploads_enabled']=true; file_put_contents($p, '<?php return '.var_export($c,true).';');" });
const boundary = 'SyntheticMultipartBoundary';
function multipart(bytes) {
  return Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="action"\r\n\r\nuploadPhoto\r\n--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
}
let upload = await request(other, 'uploadPhoto', {}, { rawBody: multipart(Buffer.from('not an image')), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } });
check(upload.status === 415, 'Non-image upload rejected');
upload = await request(other, 'uploadPhoto', {}, { rawBody: multipart(fs.readFileSync(path.join(root, 'favicon-16.png'))), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } });
check(upload.status === 200 && upload.data.url?.startsWith('./api.php?action=privateFile&path=uploads'), 'Real multipart image is re-encoded and protected');
const photo = base + 'tool:photo:synthetic';
const photoRecord = { id: 'tampered', name: 'private filename', url: upload.data.url, thumbUrl: upload.data.url, downloadUrl: upload.data.url, lat: 1, lng: 1 };
check((await request(other, 'set', { key: photo, value: JSON.stringify(photoRecord) })).status === 200, 'Uploaded photo metadata saved');
const savedPhoto = JSON.parse((await request(guest, 'get', undefined, { query: { key: photo } })).data.value);
check(savedPhoto.lat === null && savedPhoto.lng === null && savedPhoto.name === 'Tour photo' && savedPhoto.id === 'photo:synthetic', 'Server strips submitted location/name and binds photo ID');
// All roles and all three gallery image fields must reject inline bytes, including valid images.
const inlineImage = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'favicon-16.png')).toString('base64');
for (const client of [other, admin]) {
  for (const field of ['url', 'downloadUrl', 'thumbUrl']) {
    const payload = { ...photoRecord, [field]: inlineImage };
    check((await request(client, 'set', { key: photo, value: JSON.stringify(payload) })).status === 400, `Inline ${field} rejected for both roles`);
  }
}
const invalidInline = 'data:image/jpeg;base64,' + Buffer.from('SYNTHETIC_NOT_AN_IMAGE').toString('base64');
for (const scheme of ['da\tta:', 'da\r\nta:', 'bl\nob:']) {
  check((await request(admin, 'set', { key: base + 'optional-image:control-character', value: JSON.stringify(scheme + 'image/png;base64,AAAA') })).status === 400, 'Browser-normalized inline scheme rejected');
}
check((await request(other, 'set', { key: photo, value: JSON.stringify({ ...photoRecord, url: invalidInline }) })).status === 400, 'Non-image base64 rejected by general storage');
check((await request(admin, 'set', { key: base + 'optional-image:synthetic', value: inlineImage })).status === 400, 'Admin experience-image shortcut denied');
check((await request(admin, 'set', { key: base + 'optional-content:synthetic', value: JSON.stringify({ nested: { imageUrl: inlineImage } }) })).status === 400, 'Nested admin image bytes denied');
check((await request(admin, 'set', { key: base + 'optional-content:escaped', value: '{"imageUrl":"data\\u003aimage/png;base64,AAAA"}' })).status === 400, 'JSON-escaped inline scheme denied after decoding');
check((await request(admin, 'set', { key: base + 'optional-image:synthetic', value: upload.data.url })).status === 200, 'Processed admin experience image accepted');
check((await request(other, 'set', { key: photo, value: JSON.stringify({ ...photoRecord, nested: { original: inlineImage } }) })).status === 400, 'Extra nested gallery image denied');
const forgedPath = 'uploads/photos/' + 'a'.repeat(40) + '.jpg';
const forgedUrl = './api.php?action=privateFile&path=' + encodeURIComponent(forgedPath);
fs.writeFileSync(path.join(site, forgedPath), fs.readFileSync(path.join(root, 'favicon-16.png')));
check((await request(other, 'set', { key: photo, value: JSON.stringify({ ...photoRecord, thumbUrl: forgedUrl }) })).status === 400, 'Existing but unprocessed file cannot be registered as thumbnail');
check((await request(guest, 'privateFile', undefined, { query: { path: forgedPath } })).status === 404, 'Unprocessed photo cannot be served');
const emptyForgery = './api.php?action=privateFile&path=uploads%2Fphotos%2F' + 'b'.repeat(40) + '.jpg';
check((await request(admin, 'set', { key: photo, value: JSON.stringify({ ...photoRecord, url: emptyForgery }) })).status === 400, 'Nonexistent uploaded-photo reference denied to admin');

check((await request({}, 'set', { key: photo, value: '{}' })).status === 403, 'Anonymous photo overwrite denied without CSRF');
const feedback = base + 'tool:photo-meta:photo:synthetic';
check((await request(guest, 'photoFeedback', { key: feedback, name: 'Synthetic', text: 'Test comment' })).status === 200, 'Administrator can append private photo comment');
check((await request(other, 'photoFeedback', { key: feedback, reaction: '👍' })).status === 200, 'Administrator can append reaction');
check((await request({}, 'set', { key: feedback, value: '{}' })).status === 403, 'Anonymous feedback replacement denied');
const meta = JSON.parse((await request(guest, 'get', undefined, { query: { key: feedback } })).data.value);
check(meta.comments.length === 1 && meta.reactions['👍'] === 1, 'Append operations preserve other feedback');
check((await request(other, 'photoFeedback', { key: feedback, text: invalidInline })).status === 400, 'Feedback cannot become an image-byte storage shortcut');
const uploadPath = new URL(upload.data.url, origin).searchParams.get('path');
check((await request({}, 'privateFile', undefined, { query: { path: uploadPath } })).status === 401, 'Anonymous photo access denied');
check((await request(guest, 'privateFile', undefined, { query: { path: uploadPath } })).status === 200, 'Administrator can view private photo');
// Construct a JPEG with synthetic EXIF GPS and a comment in memory; no real location data is used.
const originalJpeg = fs.readFileSync(path.join(site, uploadPath));
const tiff = Buffer.alloc(128);
tiff.write('II', 0); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x8825, 10); tiff.writeUInt16LE(4, 12);
tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18); tiff.writeUInt16LE(4, 26);
for (const [i, tag, type, count, value] of [[0,1,2,2,78],[1,2,5,3,80],[2,3,2,2,69],[3,4,5,3,104]]) {
  const at = 28 + i * 12;
  tiff.writeUInt16LE(tag, at); tiff.writeUInt16LE(type, at+2); tiff.writeUInt32LE(count, at+4); tiff.writeUInt32LE(value, at+8);
}
for (let at=80; at<128; at+=8) { tiff.writeUInt32LE(1, at); tiff.writeUInt32LE(1, at+4); }
function jpegSegment(marker, payload) {
  const header=Buffer.alloc(4); header[0]=255; header[1]=marker; header.writeUInt16BE(payload.length+2,2);
  return Buffer.concat([header,payload]);
}
const gpsImage=Buffer.concat([originalJpeg.subarray(0,2), jpegSegment(0xe1,Buffer.concat([Buffer.from('Exif\0\0'),tiff])),
  jpegSegment(0xfe,Buffer.from('synthetic-location-metadata')),originalJpeg.subarray(2)]);
const scrubbed=await request(other,'uploadPhoto',{}, {rawBody:multipart(gpsImage),headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`}});
check(scrubbed.status===200, 'JPEG containing synthetic EXIF GPS is processed');
const scrubbedPath=new URL(scrubbed.data.url,origin).searchParams.get('path');
const sanitizedFile=await request(guest,'privateFile',undefined,{query:{path:scrubbedPath}});
const sanitizedBytes=Buffer.from(sanitizedFile.bytes);
check(!sanitizedBytes.includes(Buffer.from('Exif\0\0')) && !sanitizedBytes.includes(Buffer.from('synthetic-location-metadata')), 'Returned JPEG contains neither EXIF GPS nor original comment');
fs.appendFileSync(path.join(site,scrubbedPath),Buffer.from('synthetic tampering'));
check((await request(guest,'privateFile',undefined,{query:{path:scrubbedPath}})).status===404, 'Modified processed file fails digest check');
const usedBytes=fs.readdirSync(path.join(site,'uploads/photos')).reduce((n,f)=>n+fs.statSync(path.join(site,'uploads/photos',f)).size,0);
await php.run({code:`<?php $p='/site/server/config.local.php'; $c=require $p; $c['upload_quota_bytes']=${usedBytes+originalJpeg.length}; file_put_contents($p,'<?php return '.var_export($c,true).';');`});
check((await request(other,'uploadPhoto',{}, {rawBody:multipart(fs.readFileSync(path.join(root,'favicon-16.png'))),headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`}})).status===200, 'Exact processed-byte quota boundary permits one image');
check((await request(other,'uploadPhoto',{}, {rawBody:multipart(fs.readFileSync(path.join(root,'favicon-16.png'))),headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`}})).status===413, 'Next image exceeds aggregate quota');
check((await request(other,'set',{key:base+'tool:photo:fallback',value:JSON.stringify({...photoRecord,url:inlineImage,thumbUrl:inlineImage,downloadUrl:inlineImage})})).status===400, 'Full quota cannot be bypassed by database fallback');
const databaseCheck=await php.run({code:`<?php $db=new PDO('sqlite:/site/.private/runtime.db'); echo $db->query("SELECT COUNT(*) FROM storage WHERE value LIKE '%data:%'")->fetchColumn();`});
check(databaseCheck.text==='0', 'No inline photo payload was persisted by rejected routes');
await php.run({ code: "<?php $p='/site/server/config.local.php'; $c=require $p; $c['upload_quota_bytes']=0; file_put_contents($p, '<?php return '.var_export($c,true).';');" });
check((await request(other, 'uploadPhoto', {}, { rawBody: multipart(fs.readFileSync(path.join(root, 'favicon-16.png'))), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } })).status === 413, 'Upload quota enforced');
fs.symlinkSync(path.join(site, 'server/config.local.php'), path.join(site, 'seating-plans/link.json'));
check((await request(admin, 'privateFile', undefined, { query: { path: 'seating-plans/link.json' } })).status === 404, 'Symlink escape denied');

check((await request(admin, 'lockAdmin', {})).data.role === null, 'Admin lock removes privileged server session');
check((await request(admin, 'set', { key: base + 'admin-note:2', value: 'test' })).status === 403, 'Locked admin cannot write');
check((await request(guest, 'logout', {})).status === 200, 'Logout');
check((await request(guest, 'get', undefined, { query: { key: onward } })).data.value === null, 'Logged-out private record denied');
const brute = {};
await request(brute, 'session');
for (let n = 0; n < 9; n++) result = await request(brute, 'login', { role: 'admin', password: 'invalid-test-password' }, { ip: '127.0.0.2' });
check(result.status === 429, 'Login attempts throttled across sessions');

const rules = ignore().add(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'));
for (const file of ['data/storage.db', 'data/storage.db-wal', 'data/storage.db-shm', '.private/recovered-community.json', 'server/config.local.php',
  'uploads/photos/new.jpg', 'menu-choices.json', 'moulin-rouge-menu-choices.json', 'seating-plans/new.pdf', 'venice-passes/index.json',
  'colosseum-tickets/index.json', 'pantheon-tickets/tickets/new.pdf', 'guest-data/new.json', 'tour-data.json', 'tour-data.js', 'deployment.zip',
  'exports/new.json', 'logs/access.log', '.env', 'tests/.runtime/package.json', 'guest-names.json', 'passenger-manifest.json', 'archive.tar.xz']) check(rules.ignores(file), `Excluded: ${file}`);
for (const file of ['app.html', 'api.php', '.htaccess', 'data/.htaccess', 'server/config.example.php', 'js/services/auth.js',
  'tours/WWHI22L26A/itinerary.json', 'pantheon-tickets/index.html', 'assets/shared/today-heroes/rome-02.jpg']) check(!rules.ignores(file), `Retained: ${file}`);
// Parse every retained JavaScript file and inline script without executing application code.
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const relative = path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/');
  if (rules.ignores(relative + (entry.isDirectory() ? '/' : ''))) return [];
  return entry.isDirectory() ? walk(path.join(dir, entry.name)) : [relative];
}); }
for (const file of walk(root)) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.js')) { new vm.Script(text, { filename: file }); checks++; }
  if (file.endsWith('.html')) {
    for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) {
      new vm.Script(match[1], { filename: file }); checks++;
    }
  }
}
const previewCheck = await php.run({code:`<?php require_once '/site/server/resource-preview.php';
$p=previewMetadata('<title>Fallback</title><meta content="Gallery &amp; gardens" property="og:title"><meta property="og:image" content="/images/garden.jpg"><meta name="description" content="A lovely garden">','https://example.com/visit/page');
$q=previewMetadata('<meta name="twitter:image" content="../photo.jpg">','https://example.com/visit/page');
$r=previewMetadata('<meta property="og:image" content="javascript:alert(1)">','https://example.com/');
echo json_encode([$p,$q,$r]);`});
const previews=JSON.parse(previewCheck.text);
check(previews[0].title==='Gallery & gardens' && previews[0].image==='https://example.com/images/garden.jpg','Open Graph attributes, entities and relative image resolved');
check(previews[1].image==='https://example.com/visit/../photo.jpg','Twitter image fallback resolved');
check(previews[2].image==='','Unsafe image scheme omitted');
php.exit();
console.log(`PASS: ${checks} PHP/API, permissions, privacy, exclusion and JavaScript syntax checks.`);
