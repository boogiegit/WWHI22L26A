function toolCardMeta() {
  const current = dayByNumber(displayDayNumber());
  const hotel = hotelForDay(current);
  return {
    weather: { kicker: "Live", title: "Weather", sub: hotel ? "Current stop and upcoming route weather." : "Forecasts across the route.", icon: "partly_cloudy_day" },
    rates: { kicker: "Money", title: "Rates", sub: "Currency converter.", icon: "currency_exchange" },
    map: { kicker: "Route", title: "Map", sub: "Route, hotels, meeting points, and today pins.", icon: "map" },
    essentials: { kicker: "Nearby", title: "Nearby", sub: "Food, essentials, and useful places around you.", icon: "location_on" },
    translate: { kicker: "Language", title: "Translate", sub: "Useful words and phrases.", icon: "translate" },
    photos: { kicker: "Shared", title: "Group Photos", sub: "Today and previous days.", icon: "photo_library" },
    tips: { kicker: "Good to know", title: "Tipping", sub: "Local guidance and suggestions.", icon: "payments" },
    packing: { kicker: "Prep", title: "Packing", sub: "Checklist for the journey.", icon: "inventory_2" },
    faq: { kicker: "Answers", title: "FAQ", sub: "Quick answers and practical details.", icon: "help" },
    spotify: { kicker: "Listen", title: "Playlist", sub: "Music for the coach and free time.", icon: "play_circle" },
    photomap: { kicker: "Gallery", title: "Photo map", sub: "See geotagged memories if photos include GPS.", icon: "travel_explore" },
    memory: { kicker: "Story", title: "Memory book", sub: "A simple recap built from the tour timeline.", icon: "auto_stories", wide: true },
    group: { kicker: "People", title: "Meet the group", sub: "Shared introductions for the current tour slug.", icon: "groups", wide: true },
    quiz: { kicker: "Fun", title: "Europe quiz", sub: "A lightweight route-themed quiz for guests.", icon: "quiz" },
    share: { kicker: "Handy", title: "Share today", sub: "Copy a clean guest-facing schedule text.", icon: "share", wide: true }
  };
}

function renderToolCard(id) {
  const meta = toolCardMeta()[id];
  if (!meta) return "";
  const reorderClass = toolsReorderMode ? " reorder-on" : "";
  const selectedClass = selectedToolMoveSource === id ? " reorder-selected" : "";
  return `
    <button class="best-tool-card ${meta.wide ? "wide" : ""}${reorderClass}${selectedClass}" onclick="handleToolCardClick('${id}')" data-tool-id="${id}">
      <div class="best-tool-arrow"><span class="material-symbols-outlined">chevron_right</span></div>
      <div class="best-tool-kicker">${escapeHtml(meta.kicker)}</div>
      <div class="best-tool-icon"><span class="material-symbols-outlined">${escapeHtml(meta.icon)}</span></div>
      <div class="best-tool-title ${meta.wide ? "serif" : ""}">${escapeHtml(meta.title)}</div>
      <div class="best-tool-sub">${escapeHtml(meta.sub)}</div>
    </button>`;
}

function renderToolGroups() {
  const ordered = loadToolsOrder().filter(id => ADMIN_MODE || !['photos', 'photomap', 'group'].includes(id));
  const seen = new Set();
  const groups = TOOL_GROUPS.map((group) => {
    const items = group.items.filter((id) => ordered.includes(id));
    items.forEach((id) => seen.add(id));
    return { ...group, items };
  }).filter((group) => group.items.length);
  const leftovers = ordered.filter((id) => !seen.has(id));
  if (leftovers.length) {
    groups.push({ title: "More", kicker: "Other", copy: "Additional tour tools.", items: leftovers });
  }
  return `<div class="tool-group-list">${groups.map((group) => `
    <section class="tool-group-section">
      <div class="tool-group-head">
        <div>
          <div class="tool-group-kicker">${escapeHtml(group.kicker)}</div>
          <div class="tool-group-title">${escapeHtml(group.title)}</div>
        </div>
        <div class="tool-group-copy">${escapeHtml(group.copy)}</div>
      </div>
      <div class="tool-group-grid">${group.items.map(renderToolCard).join("")}</div>
    </section>`).join("")}</div>`;
}

function renderTools() {
  loadToolsOrder();
  const current = dayByNumber(displayDayNumber());
  const currentHotel = hotelForDay(current);
  const adminState = toolsReorderMode
    ? (selectedToolMoveSource ? "Tap another card to move the selected tool before it." : "Tap a tool card, then tap where you want it to move.")
    : (USE_REMOTE_STORAGE ? "Shared tools use the same API and stay namespaced under this tour slug." : "Local preview mode keeps shared-style tools on this device until hosted.");
  return `
    <div class="ed-header">
      <div class="ed-kicker">${escapeHtml(tour.meta.name)} · ${escapeHtml(String(tour.meta.year || ""))}</div>
      <div class="ed-title">Your tour.<br>Your tools.</div>
      <div class="ed-rule"></div>
      <div class="best-tool-hero-copy">Fast practical help for weather, maps, packing, questions and the little things that make each tour day easier.</div>
      <div class="hero-chips"><span class="hero-chip">${BEST_TOOL_DEFAULT_ORDER.length} tools</span><span class="hero-chip">${escapeHtml(tour.meta.countries.join(" · "))}</span>${currentHotel ? `<span class="hero-chip">Tonight · ${escapeHtml(currentHotel.city)}</span>` : ""}</div>
    </div>
    ${renderToolsAdminAccess(adminState)}
    ${toolsReorderMode ? `<div class="best-tools-grid">${toolOrder.map(renderToolCard).join("")}</div>` : renderToolGroups()}
    ${renderToolPanel()}
    <div class="full-spacer"></div>`;
}
