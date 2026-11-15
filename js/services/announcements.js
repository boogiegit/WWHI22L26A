// One-way, public tour announcements. Only the existing administrator can publish.
const announcementState = { items: [], loaded: false, error: '', busy: false, photoBusy: false, message: '', pushAvailable: false, subscribed: false, delivery: null, draft: { title: '', body: '', photo: '', media: '', mediaName: '', requestId: '' } };
const ANNOUNCEMENT_READ_KEY = 'wwhi22l26a-announcements-read';
const ANNOUNCEMENT_TOKEN_KEY = 'wwhi22l26a-announcements-device';
function announcementReadId() { try { return Number(localStorage.getItem(ANNOUNCEMENT_READ_KEY)) || 0; } catch { return 0; } }
const ANNOUNCEMENT_SEEN_KEY='wwhi22l26a-announcements-seen-v2';
const announcementSeen=new Set();
try { const ids=JSON.parse(localStorage.getItem(ANNOUNCEMENT_SEEN_KEY)||'[]'); if(Array.isArray(ids))ids.filter(Number.isSafeInteger).forEach(id=>announcementSeen.add(id)); } catch {}
function announcementUnread() { return announcementState.items.filter(item => !announcementSeen.has(Number(item.id))).length; }
function markAnnouncementSeen(id) {
  if(ADMIN_MODE || activeTab!=='announcements' || document.hidden || !announcementState.items.some(item=>Number(item.id)===id))return;
  announcementSeen.add(id);
  try {localStorage.setItem(ANNOUNCEMENT_SEEN_KEY,JSON.stringify([...announcementSeen].slice(-2000)));}catch{}
  updateAnnouncementReadStatus();
}
function updateAnnouncementReadStatus(){
  const count=announcementUnread(), status=document.getElementById('ann-read-status');
  if(status)status.innerHTML=!ADMIN_MODE&&!count?announcementCaughtUp():'';
  const badge=document.getElementById('ann-badge');if(badge){badge.textContent=count>9?'9+':String(count);badge.hidden=!count;}
  document.querySelectorAll('[data-ann-read]').forEach(button=>{const read=announcementSeen.has(Number(button.dataset.annRead));button.textContent=read?'✓ Seen':'Mark as read';button.disabled=read;});
}
let announcementReadObserver=null;
let announcementReadTimers=[];
function observeAnnouncementReading(){
  announcementReadObserver?.disconnect();announcementReadTimers.forEach(clearTimeout);announcementReadTimers=[];
  if(ADMIN_MODE || activeTab!=='announcements' || typeof IntersectionObserver==='undefined')return;
  const started=new Set();
  announcementReadObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting||document.hidden)continue;
      const id=Number(entry.target.dataset.annId);
      if(entry.target.dataset.annEdge==='start'){started.add(id);continue;}
      if(!started.has(id)||announcementSeen.has(id))continue;
      announcementReadTimers.push(setTimeout(()=>{
        if(!entry.target.isConnected||activeTab!=='announcements'||document.hidden)return;
        const r=entry.target.getBoundingClientRect(), root=document.getElementById('scr-announcements').getBoundingClientRect();
        if(r.top>=root.top && r.bottom<=Math.min(root.bottom,window.innerHeight)-90)markAnnouncementSeen(id);
      },1500));
    }
  },{root:document.getElementById('scr-announcements'),rootMargin:'0px 0px -90px 0px',threshold:1});
  document.querySelectorAll('[data-ann-edge]').forEach(el=>announcementReadObserver.observe(el));
}
function announcementRandom(bytes) { return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, '0')).join(''); }
function announcementInline(text) {
  // Escape first; only our own fixed formatting tags can enter the rendered message.
  return escapeHtml(text).replace(/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g, (_,a,b)=>`<strong>${a||b}</strong>`).replace(/(^|\s)_([^_\n]+)_(?=\s|[.,!?]|$)/g,'$1<em>$2</em>');
}
function announcementText(text) {
  return String(text).split(/(https?:\/\/[^\s<>]+)/gi).map(part => {
    if (!/^https?:\/\//i.test(part)) return announcementInline(part);
    try {
      const url = new URL(part);
      if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return announcementInline(part);
      const label = /(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname) ? 'Watch on YouTube' : /(^|\.)(google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/.test(url.hostname) ? 'Open Google Maps / link' : /(^|\.)maps\.apple(?:\.com)?$/.test(url.hostname) ? 'Open Apple Maps' : part;
      return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    } catch { return announcementInline(part); }
  }).join('');
}
function announcementCards() {
  if (!announcementState.loaded) return `<p class="ann-empty">${escapeHtml(announcementState.error || 'Loading announcements…')}</p>`;
  if (!announcementState.items.length) return '<div id="ann-read-status">'+(ADMIN_MODE?'':announcementCaughtUp())+'</div>';
  return announcementState.items.map(item => `<article class="ann-card"><span data-ann-edge="start" data-ann-id="${Number(item.id)}" style="display:block;height:1px"></span>
    <p class="ann-meta">BRENDON · <time datetime="${escapeHtml(item.created)}">${escapeHtml(new Date(item.created).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }))}</time></p>
    <h2>${escapeHtml(item.title)}</h2><div class="ann-body">${announcementText(item.body)}</div>
    ${item.photo && /^\.\/api\.php\?action=announcementPhoto&id=\d+$/.test(item.photo) ? `<a href="${escapeHtml(item.photo)}" target="_blank" rel="noopener"><img class="ann-photo" src="${escapeHtml(item.photo)}" alt="Photo from Brendon for ${escapeHtml(item.title)}" loading="lazy"></a><p><a class="ann-media-link" href="${escapeHtml(item.photo)}&download=1" download>Save photo</a></p>` : ''}
    ${announcementMediaPlayer(item)}
    ${ADMIN_MODE ? `<button class="ann-remove" onclick="deleteAnnouncement(${Number(item.id)})">Remove announcement</button>` : ''}
    ${!ADMIN_MODE?`<button class="ann-remove" data-ann-read="${Number(item.id)}" onclick="markAnnouncementSeen(${Number(item.id)})" ${announcementSeen.has(Number(item.id))?'disabled':''}>${announcementSeen.has(Number(item.id))?'✓ Seen':'Mark as read'}</button>`:''}
    <span data-ann-edge="end" data-ann-id="${Number(item.id)}" style="display:block;height:1px"></span>
  </article>`).join('') + `<div id="ann-read-status" role="status" aria-live="polite">${!ADMIN_MODE&&!announcementUnread()?announcementCaughtUp():''}</div>`;
}
function announcementAlertHint() {
  if (!USE_REMOTE_STORAGE) return 'Local preview. Publishing and phone alerts work on the hosted app.';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) return 'On iPhone or iPad: use Share → Add to Home Screen, open the app from its icon, then tap Enable alerts.';
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return 'This browser does not support phone alerts. You can still read every announcement here.';
  if (Notification.permission === 'denied') return 'Alerts are blocked. Allow notifications for this app in your phone or browser settings, then try again.';
  if (announcementState.loaded && !announcementState.pushAvailable) return 'Phone alerts are temporarily unavailable. All announcements are still available here.';
  if (announcementState.subscribed) return 'Alerts are enabled on this device.';
  return 'Allow notifications to hear when Brendon posts. You can turn alerts off at any time.';
}
function announcementDeliveryText() {
  const d = announcementState.delivery;
  if (!d) return '';
  return `${d.devices} device${d.devices === 1 ? '' : 's'} registered for alerts.${d.pending ? ` ${d.pending} alert${d.pending === 1 ? '' : 's'} waiting to send. Keep this app open to retry automatically.` : ''}`;
}
function renderAnnouncements() {
  const s = announcementState, d = s.draft;
  return `<section class="ann-wrap">${location.pathname.endsWith('/admin.php')?`<div class="admin-shortcut-label">Whirl Admin · ${ADMIN_MODE?'Unlocked':'Locked'} <button class="tools-admin-btn secondary" onclick="${ADMIN_MODE?'lockMobileAdmin()':'openAdminLogin()'}">${ADMIN_MODE?'Lock':'Unlock with PIN'}</button></div>`:''}<p class="sec-label">FROM YOUR TRAVEL DIRECTOR</p><h1>Announcements</h1><p>Messages, meeting points and moments from Brendon. For everyone on this trip.</p>
    <div class="ann-alerts"><p id="ann-alert-hint">${escapeHtml(announcementAlertHint())}</p>
    <button class="tools-admin-btn secondary" onclick="toggleAnnouncementAlerts()" ${!USE_REMOTE_STORAGE ? 'disabled' : ''} id="ann-alert-button">${s.subscribed ? 'Turn alerts off' : 'Enable alerts'}</button></div>
    <p id="ann-status" role="status" aria-live="polite">${escapeHtml(s.message)}</p>
    ${ADMIN_MODE ? `<form class="ann-composer" onsubmit="event.preventDefault();publishAnnouncement()"><h2>Share with your guests</h2><p>Visible to everyone on this trip. Guests cannot reply.</p>
      <label for="ann-body">Message</label><textarea id="ann-body" maxlength="5000" rows="5" placeholder="Write your message. Paste YouTube, Google Maps or Apple Maps links here." oninput="announcementState.draft.body=this.value;updateAnnouncementPreview()">${escapeHtml(d.body)}</textarea>
${announcementWritingTools()}<div class="ann-format-tools">      <button id="ann-publish" class="tools-admin-btn" type="submit" ${s.busy || s.photoBusy || announcementRecorder ? 'disabled' : ''}>${s.busy ? 'Publishing…' : 'Publish & alert everyone'}</button>      <button type="button" id="ann-record" onclick="toggleAnnouncementRecording()">${announcementRecorder?'Stop recording':'Record voice message'}</button></div>
<p class="ann-help">Type or dictate, add anything you need, then publish.</p>
<div class="ann-attach-row"><button type="button" onclick="document.getElementById('ann-link-box').open=!document.getElementById('ann-link-box').open">↗ Add link</button><label>＋ Photo<input id="ann-upload" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onchange="attachAnnouncementPhoto(this.files[0])"></label><label>＋ Video / audio<input id="ann-media-upload" type="file" accept="video/mp4,video/quicktime,video/webm,audio/mp4,audio/mpeg,audio/ogg,audio/webm,audio/wav,.m4a,.mov" onchange="attachAnnouncementMedia(this.files[0])"></label></div>
<details id="ann-link-box"><summary>YouTube, maps or another link</summary><input id="ann-link-input" type="url" placeholder="Paste your link here"><button type="button" class="tools-admin-btn secondary" onclick="addAnnouncementLink()">Add to message</button></details>
<div id="ann-photo-draft">${announcementDraftPhoto()}</div><div id="ann-media-draft">${announcementDraftMedia()}</div>
<p class="ann-help">One photo and one video or voice clip per announcement. Clips up to 20 MB; use a YouTube link for longer videos.</p>
<details><summary>Heading, bold & preview</summary>
      <details><summary>Add a heading (optional)</summary><label for="ann-title">Heading</label><input id="ann-title" maxlength="120" placeholder="Update from Brendon" value="${escapeHtml(d.title)}" oninput="announcementState.draft.title=this.value"></details>
      <div class="ann-format-tools"><button type="button" onclick="formatAnnouncement('*')"><strong>Bold</strong></button><button type="button" onclick="formatAnnouncement('_')"><em>Italic</em></button></div>
      <p class="ann-help">Use *bold*, _italic_ and emojis. To dictate text, tap the microphone on your phone keyboard.</p>
      <details class="ann-preview"><summary>Preview your message</summary><div id="ann-message-preview" class="ann-body">${announcementText(d.body)}</div></details>
      </details><p id="ann-delivery" class="ann-meta">${escapeHtml(announcementDeliveryText())}</p>
    </form>` : ''}
    <div class="ann-feed-heading"><h2>Latest updates</h2><button class="tools-admin-btn secondary" onclick="refreshAnnouncements(true)">Refresh</button></div>
    <div id="ann-feed">${announcementCards()}</div></section>`;
}
function announcementDraftPhoto() {
  const photo = announcementState.draft.photo;
  return photo ? `<img class="ann-photo ann-thumbnail" src="${escapeHtml(photo)}" alt="Photo ready to publish"><button type="button" class="ann-remove" onclick="announcementState.draft.photo='';document.getElementById('ann-photo-draft').innerHTML=''">Remove photo</button>` : '';
}
function announcementStatus(message) { announcementState.message=message; const el=document.getElementById('ann-status'); if(el) el.textContent=message; }
function syncAnnouncementView() {
  const s=announcementState;

  const feed=document.getElementById('ann-feed'); const signature=JSON.stringify([s.loaded,s.items,s.error,ADMIN_MODE]); if(feed && feed.dataset.signature!==signature){feed.innerHTML=announcementCards();feed.dataset.signature=signature;observeAnnouncementReading();} updateAnnouncementReadStatus();
  const hint=document.getElementById('ann-alert-hint'); if(hint) hint.textContent=announcementAlertHint();
  const button=document.getElementById('ann-alert-button'); if(button) button.textContent=s.subscribed?'Turn alerts off':'Enable alerts';
  const delivery=document.getElementById('ann-delivery'); if(delivery) delivery.textContent=announcementDeliveryText();
  const badge=document.getElementById('ann-badge'); if(badge) { const count=announcementUnread(); badge.textContent=count>9?'9+':String(count); badge.hidden=!count; }
}
async function refreshAnnouncements(manual=false) {
  if(!USE_REMOTE_STORAGE) { announcementState.loaded=true; syncAnnouncementView(); return; }
  try {
    const data=await authRequest('announcements');
    announcementState.items=Array.isArray(data.items)?data.items:[]; announcementState.loaded=true; announcementState.error='';
    announcementState.pushAvailable=!!data.pushAvailable; announcementState.delivery=data.delivery || null;
    if(manual) announcementStatus('Announcements are up to date.');
    syncAnnouncementView();
  } catch { announcementState.error='Could not refresh announcements. Please check your connection and tap Refresh.'; if(manual || !announcementState.loaded) announcementStatus(announcementState.error); syncAnnouncementView(); }
}
async function attachAnnouncementPhoto(file) {
  if(!file || announcementState.photoBusy) return;
  announcementState.photoBusy=true; document.getElementById('ann-publish').disabled=true;
  announcementStatus('Preparing your photo…');
  try { const {blob}=await prepareGalleryPhoto(file); announcementState.draft.photo=await uploadGalleryPhotoBlob(blob,file.name); document.getElementById('ann-photo-draft').innerHTML=announcementDraftPhoto(); announcementStatus('Photo ready. Publish when your message is ready.'); }
  catch(error) { announcementStatus(error.message || 'Could not upload the photo. Try a JPEG or PNG image.'); }
  finally { announcementState.photoBusy=false; const button=document.getElementById('ann-publish'); if(button)button.disabled=announcementState.busy; }
}
async function publishAnnouncement() {
  if(announcementDictation){stopAnnouncementDictation();return;}
  const s=announcementState;
  if(!ADMIN_MODE || s.busy || s.photoBusy || announcementRecorder) return;
  if(!s.draft.body.trim() && !s.draft.photo && !s.draft.media) { announcementStatus('Write a message, or add a photo or voice/video clip.'); return; }
  s.draft.requestId ||= announcementRandom(16); s.busy=true;
  for(const control of document.querySelectorAll('.ann-composer input,.ann-composer textarea,.ann-composer button')) control.disabled=true;
  announcementStatus('Publishing your announcement…');
  try {
    const result=await authRequest('announcementPublish',{...s.draft}); s.delivery=result.delivery;
    s.draft={title:'',body:'',photo:'',media:'',mediaName:'',requestId:''};
    announcementStatus(result.delivery?.pending ? 'Published. Some phone alerts are waiting to send; the app will retry while you keep it open.' : 'Published. Everyone can now read your announcement.');
    await refreshAnnouncements();
  } catch(error) { announcementStatus(`${error.message || 'Could not publish.'} Your draft is still here. You can retry safely.`); }
  finally { s.busy=false; renderApp({preserveScroll:true}); }
}
async function deleteAnnouncement(id) {
  if(!ADMIN_MODE || !window.confirm('Remove this announcement from the trip? Notifications already delivered cannot be recalled.')) return;
  try { await authRequest('announcementDelete',{id}); await refreshAnnouncements(); announcementStatus('Announcement removed.'); }
  catch(error) { announcementStatus(error.message); }
}
async function toggleAnnouncementAlerts() {
  const button=document.getElementById('ann-alert-button'); if(button)button.disabled=true;
  try {
    if(!USE_REMOTE_STORAGE || !('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) throw new Error(announcementAlertHint());
    // Permission must be requested directly from this user gesture, before network work.
    if(!announcementState.subscribed && Notification.permission!=='granted' && await Notification.requestPermission()!=='granted') throw new Error('Alerts were not enabled. You can still read announcements in the app.');
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    let token=localStorage.getItem(ANNOUNCEMENT_TOKEN_KEY);
    if(announcementState.subscribed) {
      if(subscription) { await authRequest('announcementUnsubscribe',{endpoint:subscription.endpoint,token:token||''}); await subscription.unsubscribe(); }
      announcementState.subscribed=false; announcementStatus('Alerts turned off on this device.');
    } else {
      if(subscription && !token) { await subscription.unsubscribe(); subscription=null; }
      const {publicKey}=await authRequest('announcementPushKey');
      const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-publicKey.length%4)%4));
      if(!subscription) subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
      token ||= announcementRandom(32); localStorage.setItem(ANNOUNCEMENT_TOKEN_KEY,token);
      await authRequest('announcementSubscribe',{endpoint:subscription.endpoint,token});
      announcementState.subscribed=true; announcementStatus('Alerts enabled. New announcements will notify this device.');
    }
  } catch(error) { announcementStatus(error.message || 'Could not enable alerts. Please try again.'); }
  finally { if(button)button.disabled=false; syncAnnouncementView(); }
}
async function startAnnouncements() {
  await refreshAnnouncements();
  if('serviceWorker' in navigator && USE_REMOTE_STORAGE) {
    navigator.serviceWorker.ready.then(async registration=>{
      try { const sub=await registration.pushManager.getSubscription(); const token=localStorage.getItem(ANNOUNCEMENT_TOKEN_KEY);
        if(sub && token) { await authRequest('announcementSubscribe',{endpoint:sub.endpoint,token}); announcementState.subscribed=true; syncAnnouncementView(); }
      } catch {}
    }).catch(()=>{});
    navigator.serviceWorker.addEventListener('message',event=>{ if(event.data?.type==='announcements') { if(event.data.open)setTab('announcements'); refreshAnnouncements(); } });
  }
  setInterval(async()=>{
    if(document.visibilityState==='hidden' || announcementState.busy) return;
    await refreshAnnouncements();
    if(ADMIN_MODE && announcementState.delivery?.pending) { try { const result=await authRequest('announcementRetry',{}); announcementState.delivery=result.delivery; syncAnnouncementView(); } catch {} }
  },60000);
}

function announcementMediaPlayer(item) {
  if(!/^\.\/api\.php\?action=announcementMedia&id=\d+$/.test(item.media||''))return '';
  const tag=String(item.mediaType).startsWith('audio/')?'audio':'video';
  return `<${tag} class="ann-media" controls playsinline preload="none" src="${escapeHtml(item.media)}"></${tag}><a class="ann-media-link" href="${escapeHtml(item.media)}" target="_blank" rel="noopener">Open clip</a> · <a class="ann-media-link" href="${escapeHtml(item.media)}&download=1" download>Save ${tag==='video'?'video':'audio'}</a>`;
}
function updateAnnouncementPreview(){const el=document.getElementById('ann-message-preview');if(el)el.innerHTML=announcementText(announcementState.draft.body);}
function formatAnnouncement(marker){const field=document.getElementById('ann-body');if(!field)return;const start=field.selectionStart,end=field.selectionEnd;const text=field.value;const selected=text.slice(start,end)||'your text';field.value=text.slice(0,start)+marker+selected+marker+text.slice(end);announcementState.draft.body=field.value;field.focus();field.setSelectionRange(start+1,start+1+selected.length);updateAnnouncementPreview();}
function announcementDraftMedia(){const d=announcementState.draft;return d.media?`<p>✓ ${escapeHtml(d.mediaName||'Clip ready')}</p><button type="button" class="ann-remove" onclick="announcementState.draft.media='';document.getElementById('ann-media-draft').innerHTML=''">Remove clip</button>`:'';}
async function attachAnnouncementMedia(file){
  const s=announcementState;if(!file||s.photoBusy||s.busy)return;
  if(!USE_REMOTE_STORAGE){announcementStatus('Upload clips on the hosted app.');return;}
  if(file.size>20000000){announcementStatus('This clip is larger than 20 MB. Choose a shorter clip or paste a YouTube link.');return;}
  s.photoBusy=true;const button=document.getElementById('ann-publish');if(button)button.disabled=true;announcementStatus('Uploading your clip…');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
  try {const form=new FormData();form.append('action','announcementUploadMedia');form.append('media',file,file.name||'voice-message.webm');
    const response=await fetch(`${API_URL}?action=announcementUploadMedia`,{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':authState.csrfToken},body:form,signal:controller.signal});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Upload failed. Try a smaller clip or a YouTube link.');
    s.draft.media=data.media;s.draft.mediaName=file.name||'Voice message ready';const draft=document.getElementById('ann-media-draft');if(draft)draft.innerHTML=announcementDraftMedia();announcementStatus('Clip ready. Add your message, check the preview, then publish.');
  }catch(error){announcementStatus(error.name==='AbortError'?'Upload timed out. Please try again with a smaller clip.':error.message);}
  finally{clearTimeout(timer);s.photoBusy=false;if(button)button.disabled=s.busy;}
}
let announcementRecorder=null;
async function toggleAnnouncementRecording(){
  if(announcementRecorder){announcementRecorder.stop();return;}
  if(announcementState.busy||announcementState.photoBusy)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){announcementStatus('Voice recording is unavailable in this browser. You can attach a recorded audio file or dictate using your keyboard microphone.');return;}
  let stream;
  try {stream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const recorder=new MediaRecorder(stream,type?{mimeType:type}:{}),chunks=[];let size=0;
    announcementRecorder=recorder;const button=document.getElementById('ann-record');if(button)button.textContent='Stop recording';document.getElementById('ann-publish').disabled=true;announcementStatus('Recording… Tap Stop recording when finished (up to 2 minutes).');
    const timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},120000);
    recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);size+=event.data.size;if(size>19000000&&recorder.state==='recording')recorder.stop();}};
    recorder.onstop=async()=>{clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());announcementRecorder=null;const b=document.getElementById('ann-record');if(b)b.textContent='Record voice message';const blob=new Blob(chunks,{type:recorder.mimeType});await attachAnnouncementMedia(new File([blob],recorder.mimeType.includes('mp4')?'voice-message.m4a':'voice-message.webm',{type:recorder.mimeType}));};
    recorder.onerror=()=>{announcementStatus('Recording failed. Please try again.');if(recorder.state!=='inactive')recorder.stop();};recorder.start(1000);
  }catch{stream?.getTracks().forEach(track=>track.stop());announcementRecorder=null;announcementStatus('Microphone unavailable. Allow microphone access or use your keyboard microphone to dictate text.');}
}

function announcementCaughtUp(){return '<div class="ann-caught-up"><div class="bell" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></div><strong>You’re all caught up.</strong><p>You’ve seen all the latest announcements. New updates will appear here.</p></div>';}
function announcementWritingTools(){return `<div class="ann-writing"><strong>Speak or write your message</strong><div class="ann-format-tools"><button type="button" id="ann-dictate" onclick="dictateAnnouncement()">🎙 Dictate message</button><button type="button" id="ann-polish" onclick="polishAnnouncement()" ${authState.config?.announcementAiAvailable?'':'disabled'}>✨ Polish with AI</button><button type="button" onclick="undoAnnouncementPolish()">Undo polish</button></div><p>${authState.config?.announcementAiAvailable?'Polishing sends this draft to OpenAI. Review the result before publishing.':'AI polishing is awaiting service setup. Typing, dictation and publishing are ready.'}</p><p class="ann-help">Tap Dictate message, wait for Listening, then speak. Tap Stop dictation when finished. No need to tap the message box first.</p><p id="ann-writing-status" role="status"></p></div>`;}
function addAnnouncementLink(){const input=document.getElementById('ann-link-input');try{const url=new URL(input.value.trim());if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error();const body=document.getElementById('ann-body');body.value=(body.value.trimEnd()+'\n'+url.href).trim();announcementState.draft.body=body.value;updateAnnouncementPreview();input.value='';document.getElementById('ann-link-box').open=false;}catch{announcementStatus('Paste a full link beginning with https://.');}}
let announcementDictation=null,announcementBeforePolish='';
function stopAnnouncementDictation(){
  if(!announcementDictation)return;
  announcementDictation.stopping=true;
  const status=document.getElementById('ann-writing-status');if(status)status.textContent='Finishing your last words…';
  announcementDictation.stop();
}
function dictateAnnouncement(){
  if(announcementDictation){stopAnnouncementDictation();return;}
  const body=document.getElementById('ann-body'),status=document.getElementById('ann-writing-status');
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){body.focus();status.textContent='Use the microphone on your phone keyboard. Speak, then tap its Done or microphone button to stop. Your words appear in Message.';return;}
  const speech=new Speech();announcementDictation=speech;speech.lang='en-GB';speech.continuous=true;speech.interimResults=true;
  const prefix=body.value.trimEnd();let segments=[],failure='';
  const sync=()=>{body.value=(prefix+(prefix&&segments.length?' ':'')+segments.join(' ')).slice(0,5000);announcementState.draft.body=body.value;updateAnnouncementPreview();};
  const controls=active=>{
    body.readOnly=active;
    for(const id of ['ann-polish','ann-publish']){const el=document.getElementById(id);if(el)el.disabled=active;}
    const button=document.getElementById('ann-dictate');if(button){button.textContent=active?'■ Stop dictation':'🎙 Dictate message';button.setAttribute('aria-pressed',String(active));}
  };
  controls(true);status.textContent='Starting microphone… Allow access if asked. Wait for “Listening” before speaking.';
  speech.onstart=()=>{status.textContent='🔴 Listening — speak now. Your words appear above. Tap Stop dictation when finished.';trackAnalytics('announcement:dictate');};
  speech.onresult=event=>{
    // Results are cumulative within a session. Replace interim words instead of appending duplicates.
    segments=Array.from(event.results).map(result=>result[0].transcript.trim());sync();
    status.textContent='🔴 Listening — your words are appearing in Message. Tap Stop dictation when finished.';
    if(body.value.length>=5000)stopAnnouncementDictation();
  };
  speech.onerror=event=>{failure=event.error==='not-allowed'?'Microphone access was not allowed. Use your phone keyboard’s microphone, or allow microphone access in browser settings.':event.error==='no-speech'?'No speech detected. Tap Dictate message to try again, or use your phone keyboard’s microphone.':'Dictation was interrupted. Your captured words are kept. Tap Dictate message to continue, or use your keyboard microphone.';};
  speech.onend=()=>{if(announcementDictation!==speech)return;sync();announcementDictation=null;controls(false);status.textContent=failure||(segments.length?'Dictation stopped. Your words are saved in Message. Check them, then polish or publish.':'Dictation stopped without any words. Tap Dictate message to try again.');};
  try{speech.start();}catch{announcementDictation=null;controls(false);body.focus();status.textContent='Could not start dictation. Use the microphone on your phone keyboard.';}
}
async function polishAnnouncement(){
  if(announcementDictation){stopAnnouncementDictation();return;}
  const body=document.getElementById('ann-body'),button=document.getElementById('ann-polish'),status=document.getElementById('ann-writing-status');
  const original=body.value;if(!original.trim()){status.textContent='Type or dictate a message first.';return;}button.disabled=true;status.textContent='Polishing your draft…';
  try{const result=await authRequest('polishAnnouncement',{text:original});if(body.isConnected&&body.value===original){trackAnalytics('announcement:polish');announcementBeforePolish=original;body.value=result.text;announcementState.draft.body=result.text;updateAnnouncementPreview();status.textContent='Ready to review. Check names and times, then publish.';}else{status.textContent='Your draft changed while polishing. Your edits have been kept.';}}
  catch(error){status.textContent=error.message||'Could not polish. Your draft is unchanged.';}finally{button.disabled=false;}
}
function undoAnnouncementPolish(){if(!announcementBeforePolish)return;const body=document.getElementById('ann-body');body.value=announcementBeforePolish;announcementState.draft.body=announcementBeforePolish;announcementBeforePolish='';updateAnnouncementPreview();}
