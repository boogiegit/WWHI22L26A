const BUILDER_PREVIEW_TABS = new Set(["today", "programme", "experiences", "announcements", "tools", "director", "rewards", "contacts"]);
let moreNavOpen = false;
let activeTab = (location.pathname.endsWith("/admin.php") || new URLSearchParams(location.search).get("tab") === "announcements") ? "announcements" : typeof URL_PARAMS !== "undefined" && URL_PARAMS.get("builderPreview") === "1" && BUILDER_PREVIEW_TABS.has(URL_PARAMS.get("previewTab")) ? URL_PARAMS.get("previewTab") : "today";

function setTab(tab) {
  if(typeof announcementDictation!=='undefined' && announcementDictation)stopAnnouncementDictation();
  moreNavOpen = false;
  if (tab === "programme") activeProgrammeTab = "days";
  if (tab === "experiences") activeProgrammeTab = "optionals";
  activeTab = tab;
  normalizeActiveTabForNav();
  if (typeof trackAnalytics === "function") trackAnalytics(`tab:${activeTab}`);
  renderApp();
  if (tab === "experiences") refreshInterest();
  if (tab === "announcements") { syncAnnouncementView(); refreshAnnouncements(); }
}

function rewardsNavActive() {
  return displayDayNumber() >= 5;
}

function normalizeActiveTabForNav() {

  if (activeTab === "rewards" && !rewardsNavActive()) activeTab = "director";
}

function renderFullNav() {
  const showRewards = rewardsNavActive();
  return `
    <nav class="bnav">
      <button class="ni ${activeTab === "today" ? "active" : ""}" onclick="setTab('today')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Today</span>
      </button>
      <button class="ni ${activeTab === "programme" ? "active" : ""}" onclick="setTab('programme')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span>Itinerary</span>
      </button>
      <button class="ni ${activeTab === "experiences" ? "active" : ""}" onclick="setTab('experiences')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 2-4L12 7z"/><path d="M12 7h4.5a2.5 2.5 0 1 0-2-4L12 7z"/></svg>
        <span>Experiences</span>
      </button>
      <button class="ni ${activeTab === "announcements" ? "active" : ""}" onclick="setTab('announcements')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
        <span>Announcements</span><b id="ann-badge" class="ann-badge" ${typeof announcementUnread !== 'function' || !announcementUnread() ? 'hidden' : ''}>${typeof announcementUnread === 'function' ? announcementUnread() : ''}</b>
      </button>
      <button class="ni ${activeTab === "tools" ? "active" : ""}" onclick="setTab('tools')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
        <span>Tools</span>
      </button>
      ${!showRewards ? `<button class="ni ${activeTab === "director" ? "active" : ""}" onclick="setTab('director')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <span>${escapeHtml(navDirectorLabel())}</span>
      </button>` : `<button class="ni ${activeTab === "rewards" ? "active" : ""}" onclick="setTab('rewards')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M17 5h3a2 2 0 0 1 0 4h-3"/><path d="M7 5H4a2 2 0 0 0 0 4h3"/></svg>
        <span>Where Next</span>
      </button>`}
      <button class="ni ${activeTab === "contacts" ? "active" : ""}" onclick="setTab('contacts')">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Contacts</span>
      </button>
    </nav>`;
}

function toggleMoreNav(){if(!moreNavOpen)trackAnalytics('nav:more');moreNavOpen=!moreNavOpen;renderApp({preserveScroll:true});}
function renderNav(){
  // Reuse the established icons and unread badge, with five phone-sized controls.
  const all=renderFullNav();
  const buttons=Array.from(all.matchAll(/<button class="ni [\s\S]*?<\/button>/g),m=>m[0]);
  const find=tab=>buttons.find(button=>button.includes(`setTab('${tab}')`))||'';
  const extra=['programme','contacts','director','rewards'].includes(activeTab);
  return `${moreNavOpen?`<div class="more-panel" aria-label="More sections"><button onclick="setTab('programme')">Itinerary</button><button onclick="setTab('contacts')">Contacts & hotels</button><button onclick="setTab('director')">${escapeHtml(navDirectorLabel())}</button>${rewardsNavActive()?`<button onclick="setTab('rewards')">Where Next</button>`:''}<button onclick="toggleMoreNav()">Close</button></div>`:''}<nav class="bnav">${['today','announcements','experiences','tools'].map(find).join('')}<button class="ni ${extra||moreNavOpen?'active':''}" aria-expanded="${moreNavOpen}" onclick="toggleMoreNav()"><svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path d="m5 9 7 7 7-7"/></svg><span>More</span></button></nav>`;
}
