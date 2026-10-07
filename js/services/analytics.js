// Fixed aggregate counters only; no guest identities, raw user agents or form values.
const SAFE_ANALYTICS_EVENTS = new Set(["visit", "open:load", "open:resume", "open:restore", "mode:web", "mode:installed-app", "button:click", "link:open", "input:change", "form:submit", "section:open", "section:close", "resource:open", "document:open", "community:open", "start-info:open", "onward:open", "onward:submitted", "onward:failed", "onward:export", "tab:today", "tab:programme", "tab:itinerary", "tab:experiences", "tab:tools", "tab:director", "tab:rewards", "tab:contacts", "tab:travel-impact", "programme:days", "programme:optionals", "programme:shopping", "programme:mtm", "tool:weather", "tool:rates", "tool:map", "tool:essentials", "tool:translate", "tool:photos", "tool:tips", "tool:packing", "tool:faq", "tool:movies", "tool:spotify", "tool:photomap", "tool:memory", "tool:group", "tool:quiz", "tool:share", "tool:analytics", "tool:onward", "interaction:today", "interaction:programme", "interaction:itinerary", "interaction:experiences", "interaction:tools", "interaction:director", "interaction:rewards", "interaction:contacts", "interaction:travel-impact", "itinerary:day:1", "itinerary:day:2", "itinerary:day:3", "itinerary:day:4", "itinerary:day:5", "itinerary:day:6", "itinerary:day:7", "itinerary:day:8", "itinerary:day:9", "itinerary:day:10", "itinerary:day:11", "itinerary:day:12", "recap:day:1", "recap:day:2", "recap:day:3", "recap:day:4", "recap:day:5", "recap:day:6", "recap:day:7", "recap:day:8", "recap:day:9", "recap:day:10", "recap:day:11", "recap:day:12"]);
let remoteAnalyticsCache = null;
let interactionAnalyticsBound = false;
function analyticsDisplayMode() {
  return navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches ? 'installed-app' : 'web';
}
function trackAnalytics(event) {
  if (!USE_REMOTE_STORAGE || !authState.csrfToken || !authState.config?.analyticsEnabled || !SAFE_ANALYTICS_EVENTS.has(event)) return;
  fetch(API_URL, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': authState.csrfToken },
    body: JSON.stringify({ action: 'trackAnalytics', event }), keepalive: true
  }).catch(() => {});
}
function recordAnalyticsVisit() {
  normalizeActiveTabForNav();
  trackAnalytics(`tab:${activeTab}`);
  trackAnalytics('visit');
  trackAnalytics('open:load');
  trackAnalytics(`mode:${analyticsDisplayMode()}`);
}
function setupInteractionAnalytics() {
  if (interactionAnalyticsBound) return;
  interactionAnalyticsBound = true;
  let wasHidden = document.visibilityState === 'hidden';
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden')wasHidden=true;
    else if(wasHidden){wasHidden=false;trackAnalytics('open:resume');}
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)trackAnalytics('open:restore');});
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('button,a,[role="button"]');if(!target)return;
    trackAnalytics(target.tagName === 'A' ? 'link:open' : 'button:click');
    trackAnalytics('interaction:'+activeTab);
  });
  document.addEventListener('change',event=>{if(event.target.matches?.('input,select,textarea'))trackAnalytics('input:change');});
  document.addEventListener('submit',()=>trackAnalytics('form:submit'));
  document.addEventListener('toggle',event=>{
    if(!event.target.matches?.('details'))return;
    trackAnalytics(event.target.open?'section:open':'section:close');
    if(event.target.open && event.target.dataset.recapDay)trackAnalytics('recap:day:'+event.target.dataset.recapDay);
  },true);
}
async function loadRemoteAnalytics() {
  if (!ADMIN_MODE || !USE_REMOTE_STORAGE) return null;
  try { remoteAnalyticsCache = await authRequest('analyticsSummary'); }
  catch (error) { remoteAnalyticsCache = { error: error.message }; }
  return remoteAnalyticsCache;
}
function refreshUsageAnalytics() {
  loadRemoteAnalytics().then(() => { if (activeToolPanel === 'analytics') renderApp(); });
}
function renderAnalyticsPanel() {
  const rows = remoteAnalyticsCache?.events || [];
  const onward = remoteAnalyticsCache?.onward;
  const labels = {'tab:today':'Today','tab:programme':'Itinerary','tab:experiences':'Experiences','tab:director':'Brendon','tab:rewards':'Where Next','tab:tools':'Tools','tab:contacts':'Contacts'};
  const counts = new Map(rows.map(row=>[row.label,Number(row.count)||0]));
  const ranked = [...SAFE_ANALYTICS_EVENTS].filter(event=>labels[event] || event.startsWith('tool:')).map(label=>({label,count:counts.get(label)||0})).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label));
  const list = entries=>entries.map(row=>`<div class="analytics-list-row"><span>${escapeHtml(labels[row.label] || row.label)}</span><strong>${Number(row.count)||0}</strong></div>`).join('');
  const breakdown = remoteAnalyticsCache?.breakdown || [];

  return `<div class="analytics-panel"><div class="analytics-title">Tour activity</div>
    <div class="tool-card"><div class="tool-body"><div class="analytics-title">Onward travel forms completed</div>
      <div class="analytics-list-row"><span>Saved forms</span><strong data-onward-completed>${onward ? Number(onward.total) || 0 : 'Unavailable'}</strong></div>
      ${onward ? `<p>${Number(onward.flying) || 0} flying from Paris · ${Number(onward.eurostar) || 0} Eurostar · ${Number(onward.staying) || 0} staying in Paris.</p>` : ''}
      <p>${remoteAnalyticsCache?.onwardPeople != null ? `${Number(remoteAnalyticsCache.onwardPeople)} people represented. ` : ''}Counts currently saved forms, including guests staying in Paris. Updating the same form counts once. Separate submissions from another device may count again. This total is independent of the 90-day activity history.</p>
      <button class="button primary" type="button" onclick="openToolPanel('onward')">Generate onward travel Excel</button>
    </div></div>
    <p>When enabled, this counts public app opens, returns, tabs, itinerary days, tools, buttons, links, field changes, resource views, recaps and onward submissions. Administrator activity is labelled separately. Device types and server-provided country codes are counted in aggregate. No guest names, device identifiers, raw IP addresses, raw browser details, document names or form contents are stored in analytics. Country is Unknown when trusted server geolocation is unavailable. These figures cannot identify who opened the app or an exact phone model. Counts are retained for up to 90 days of active collection. Categories overlap: one action can count as a button click and a tool open. These are activity counts, not unique people. Offline use, blocked requests and activity while the service is unavailable are not fully captured.</p>
    ${!authState.config?.analyticsEnabled ? '<p>Analytics collection is disabled.</p>' : ''}
    ${remoteAnalyticsCache?.error ? `<p>${escapeHtml(remoteAnalyticsCache.error)}</p>` : ''}
    <h3>Guest tabs and tools — most to least opened</h3>${list(ranked)}
    <h3>Device types and countries (new activity)</h3>
    <p>Counts app loads and returns, not unique people. Administrator activity is separate. Earlier activity has no device/country breakdown.</p>
    ${list(breakdown)}
    <h3>All activity counters</h3>
    ${rows.length ? rows.map(row => `<div class="analytics-list-row"><span>${escapeHtml(row.label)}</span><span>${Number(row.count) || 0}</span></div>`).join('') : '<p>No activity counts available.</p>'}
    <button class="button secondary" type="button" onclick="refreshUsageAnalytics()">Refresh analytics</button></div>`;
}
