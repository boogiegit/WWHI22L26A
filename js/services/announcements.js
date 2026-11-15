// One-way, public tour announcements. Only the existing administrator can publish.
const announcementState = { items: [], loaded: false, error: '', busy: false, photoBusy: false, message: '', pushAvailable: false, subscribed: false, delivery: null, draft: { title: '', body: '', photo: '', requestId: '' } };
const ANNOUNCEMENT_READ_KEY = 'wwhi22l26a-announcements-read';
const ANNOUNCEMENT_TOKEN_KEY = 'wwhi22l26a-announcements-device';
function announcementReadId() { try { return Number(localStorage.getItem(ANNOUNCEMENT_READ_KEY)) || 0; } catch { return 0; } }
function announcementUnread() { return announcementState.items.filter(item => item.id > announcementReadId()).length; }
function announcementRandom(bytes) { return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, '0')).join(''); }
function announcementText(text) {
  return String(text).split(/(https?:\/\/[^\s<>]+)/gi).map(part => {
    if (!/^https?:\/\//i.test(part)) return escapeHtml(part);
    try {
      const url = new URL(part);
      if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return escapeHtml(part);
      const label = /(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname) ? 'Watch on YouTube' : /(^|\.)(google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/.test(url.hostname) ? 'Open Google Maps / link' : part;
      return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    } catch { return escapeHtml(part); }
  }).join('');
}
function announcementCards() {
  if (!announcementState.loaded) return `<p class="ann-empty">${escapeHtml(announcementState.error || 'Loading announcements…')}</p>`;
  if (!announcementState.items.length) return '<p class="ann-empty">No announcements yet. Updates from Brendon will appear here.</p>';
  return announcementState.items.map(item => `<article class="ann-card">
    <p class="ann-meta">BRENDON · <time datetime="${escapeHtml(item.created)}">${escapeHtml(new Date(item.created).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }))}</time></p>
    <h2>${escapeHtml(item.title)}</h2><div class="ann-body">${announcementText(item.body)}</div>
    ${item.photo && /^\.\/api\.php\?action=announcementPhoto&id=\d+$/.test(item.photo) ? `<a href="${escapeHtml(item.photo)}" target="_blank" rel="noopener"><img class="ann-photo" src="${escapeHtml(item.photo)}" alt="Photo from Brendon for ${escapeHtml(item.title)}" loading="lazy"></a>` : ''}
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
      <label for="ann-title">Title</label><input id="ann-title" maxlength="120" required placeholder="A quick update for everyone" value="${escapeHtml(d.title)}" oninput="announcementState.draft.title=this.value">
      <label for="ann-body">Message</label><textarea id="ann-body" maxlength="5000" rows="5" required placeholder="Write your message. Paste YouTube or Google Maps links here." oninput="announcementState.draft.body=this.value">${escapeHtml(d.body)}</textarea>
      <label for="ann-upload">Add a photo (optional)</label><input id="ann-upload" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onchange="attachAnnouncementPhoto(this.files[0])" ${s.busy || s.photoBusy ? 'disabled' : ''}>
      <div id="ann-photo-draft">${announcementDraftPhoto()}</div>
      <button id="ann-publish" class="tools-admin-btn" type="submit" ${s.busy || s.photoBusy ? 'disabled' : ''}>${s.busy ? 'Publishing…' : 'Publish & alert everyone'}</button>
      <p id="ann-delivery" class="ann-meta">${escapeHtml(announcementDeliveryText())}</p>
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
  if(!ADMIN_MODE || s.busy || s.photoBusy) return;
  if(!s.draft.title.trim() || !s.draft.body.trim()) { announcementStatus('Add a title and message first.'); return; }
  s.draft.requestId ||= announcementRandom(16); s.busy=true;
  for(const control of document.querySelectorAll('.ann-composer input,.ann-composer textarea,.ann-composer button')) control.disabled=true;
  announcementStatus('Publishing your announcement…');
  try {
    const result=await authRequest('announcementPublish',{...s.draft}); s.delivery=result.delivery;
    s.draft={title:'',body:'',photo:'',requestId:''};
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
