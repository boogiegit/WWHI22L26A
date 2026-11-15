// One-way, public tour announcements. Only the existing administrator can publish.
const announcementState = { items: [], loaded: false, error: '', busy: false, photoBusy: false, message: '', pushAvailable: false, subscribed: false, delivery: null, draft: { title: '', body: '', photo: '', media: '', mediaName: '', requestId: '' } };
const ANNOUNCEMENT_READ_KEY = 'wwhi22l26a-announcements-read';
const ANNOUNCEMENT_TOKEN_KEY = 'wwhi22l26a-announcements-device';
function announcementReadId() { try { return Number(localStorage.getItem(ANNOUNCEMENT_READ_KEY)) || 0; } catch { return 0; } }
function announcementUnread() { return announcementState.items.filter(item => item.id > announcementReadId()).length; }
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
  if (!announcementState.items.length) return '<p class="ann-empty">No announcements yet. Updates from Brendon will appear here.</p>';
  return announcementState.items.map(item => `<article class="ann-card">
    <p class="ann-meta">BRENDON · <time datetime="${escapeHtml(item.created)}">${escapeHtml(new Date(item.created).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }))}</time></p>
    <h2>${escapeHtml(item.title)}</h2><div class="ann-body">${announcementText(item.body)}</div>
    ${item.photo && /^\.\/api\.php\?action=announcementPhoto&id=\d+$/.test(item.photo) ? `<a href="${escapeHtml(item.photo)}" target="_blank" rel="noopener"><img class="ann-photo" src="${escapeHtml(item.photo)}" alt="Photo from Brendon for ${escapeHtml(item.title)}" loading="lazy"></a>` : ''}
    ${announcementMediaPlayer(item)}
    ${ADMIN_MODE ? `<button class="ann-remove" onclick="deleteAnnouncement(${Number(item.id)})">Remove announcement</button>` : ''}
  </article>`).join('');
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
  return `<section class="ann-wrap"><p class="sec-label">FROM YOUR TRAVEL DIRECTOR</p><h1>Announcements</h1><p>Messages, meeting points and moments from Brendon. For everyone on this trip.</p>
    <div class="ann-alerts"><p id="ann-alert-hint">${escapeHtml(announcementAlertHint())}</p>
    <button class="tools-admin-btn secondary" onclick="toggleAnnouncementAlerts()" ${!USE_REMOTE_STORAGE ? 'disabled' : ''} id="ann-alert-button">${s.subscribed ? 'Turn alerts off' : 'Enable alerts'}</button></div>
    <p id="ann-status" role="status" aria-live="polite">${escapeHtml(s.message)}</p>
    ${ADMIN_MODE ? `<form class="ann-composer" onsubmit="event.preventDefault();publishAnnouncement()"><h2>New announcement</h2><p>Visible to everyone on this trip. Guests cannot reply.</p>
      <label for="ann-body">Message</label><textarea id="ann-body" maxlength="5000" rows="5" placeholder="Write your message. Paste YouTube, Google Maps or Apple Maps links here." oninput="announcementState.draft.body=this.value;updateAnnouncementPreview()">${escapeHtml(d.body)}</textarea>
<div class="ann-format-tools">      <button id="ann-publish" class="tools-admin-btn" type="submit" ${s.busy || s.photoBusy || announcementRecorder ? 'disabled' : ''}>${s.busy ? 'Publishing…' : 'Publish & alert everyone'}</button>      <button type="button" id="ann-record" onclick="toggleAnnouncementRecording()">${announcementRecorder?'Stop recording':'Record voice message'}</button></div>
<p class="ann-help">Type or use your keyboard microphone, then publish. Everything below is optional.</p>
<details><summary>Photos, video & formatting</summary>
      <details><summary>Add a heading (optional)</summary><label for="ann-title">Heading</label><input id="ann-title" maxlength="120" placeholder="Update from Brendon" value="${escapeHtml(d.title)}" oninput="announcementState.draft.title=this.value"></details>
      <div class="ann-format-tools"><button type="button" onclick="formatAnnouncement('*')"><strong>Bold</strong></button><button type="button" onclick="formatAnnouncement('_')"><em>Italic</em></button></div>
      <p class="ann-help">Use *bold*, _italic_ and emojis. To dictate text, tap the microphone on your phone keyboard.</p>
      <details class="ann-preview"><summary>Preview your message</summary><div id="ann-message-preview" class="ann-body">${announcementText(d.body)}</div></details>
      <label for="ann-upload">Add a photo (optional)</label><input id="ann-upload" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onchange="attachAnnouncementPhoto(this.files[0])" ${s.busy || s.photoBusy || announcementRecorder ? 'disabled' : ''}>
      <div id="ann-photo-draft">${announcementDraftPhoto()}</div>
      <label for="ann-media-upload">Add a video or voice clip (optional)</label><input id="ann-media-upload" type="file" accept="video/mp4,video/quicktime,video/webm,audio/mp4,audio/mpeg,audio/ogg,audio/webm,audio/wav,.m4a,.mov" onchange="attachAnnouncementMedia(this.files[0])" ${s.busy||s.photoBusy?'disabled':''}>
      <p class="ann-help">Up to 20 MB. MP4 is best across phones. For longer videos, paste a YouTube link. Clips are shared as uploaded, including any location metadata.</p>

      <div id="ann-media-draft">${announcementDraftMedia()}</div>

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
  if(activeTab==='announcements' && s.items.length) { try { localStorage.setItem(ANNOUNCEMENT_READ_KEY,String(Math.max(...s.items.map(item=>item.id)))); } catch {} }
  const feed=document.getElementById('ann-feed'); if(feed) feed.innerHTML=announcementCards();
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
  return `<${tag} class="ann-media" controls playsinline preload="none" src="${escapeHtml(item.media)}"></${tag}><a class="ann-media-link" href="${escapeHtml(item.media)}" target="_blank" rel="noopener">Open clip</a>`;
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
