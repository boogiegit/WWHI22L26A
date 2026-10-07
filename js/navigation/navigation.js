const BUILDER_PREVIEW_TABS = new Set(["today", "programme", "experiences", "tools", "director", "rewards", "contacts"]);
let activeTab = typeof URL_PARAMS !== "undefined" && URL_PARAMS.get("builderPreview") === "1" && BUILDER_PREVIEW_TABS.has(URL_PARAMS.get("previewTab")) ? URL_PARAMS.get("previewTab") : "today";

function setTab(tab) {
  if (tab === "programme") activeProgrammeTab = "days";
  if (tab === "experiences") activeProgrammeTab = "optionals";
  activeTab = tab;
  normalizeActiveTabForNav();
  if (typeof trackAnalytics === "function") trackAnalytics(`tab:${activeTab}`);
  renderApp();
}

function rewardsNavActive() {
  return displayDayNumber() >= 5;
}

function normalizeActiveTabForNav() {
  if (activeTab === "director" && rewardsNavActive()) activeTab = "rewards";
  if (activeTab === "rewards" && !rewardsNavActive()) activeTab = "director";
}

function renderNav() {
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
