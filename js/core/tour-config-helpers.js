function fallbackTourRegistry() {
  return {
    defaultTour: DEFAULT_TOUR_CODE,
    tours: {
      [DEFAULT_TOUR_CODE]: {
        code: DEFAULT_TOUR_CODE,
        name: "Xmas Whirl 2026",
        dataUrls: [
          "./tour-data.json?v=154",
          "./data/tour-data.json?v=154",
          "./tour-data.json",
          "./data/tour-data.json"
        ],
        legacyStorageSlug: "xmas-whirl-2026"
      }
    }
  };
}

function normalizeTourCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function resolveCurrentTourConfig(registry) {
  const tours = registry?.tours || {};
  const requested = normalizeTourCode(URL_PARAMS.get("tour"));
  const fallback = normalizeTourCode(registry?.defaultTour) || DEFAULT_TOUR_CODE;
  if (requested && !tours[requested]) {
    throw new Error(`Unknown tour "${requested}". Check config/tours.json or remove the tour parameter to use the default tour.`);
  }
  const code = tours[requested] ? requested : fallback;
  return { code, ...(tours[code] || tours[DEFAULT_TOUR_CODE] || {}) };
}

function slug() {
  return tour.meta.slug;
}

function tourCode() {
  return CURRENT_TOUR_CODE || DEFAULT_TOUR_CODE;
}

function legacyStorageSlug() {
  return currentTourConfig?.legacyStorageSlug || tour?.meta?.slug || "";
}

function storageKey(name) {
  return `tour:${tourCode()}:${name}`;
}

function legacyStorageKey(name) {
  const legacy = legacyStorageSlug();
  return legacy ? `tour:${legacy}:${name}` : storageKey(name);
}

function sharedKey(name) {
  return storageKey(`shared:${name}`);
}

function legacySharedKey(name) {
  return legacyStorageKey(`shared:${name}`);
}

function tourDatesLabel() {
  const first = tour.days[0];
  const last = tour.days[tour.days.length - 1];
  if (!first || !last) return `${tour.meta.year || ""}`.trim();
  const start = new Date(`${first.date}T00:00:00`);
  const end = new Date(`${last.date}T00:00:00`);
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function toolsConfig() {
  return tour.tools || {};
}

function exchangeLinks() {
  return Array.isArray(toolsConfig().exchangeRates) ? toolsConfig().exchangeRates : [];
}

function host() {
  return tour.hostDefaults || {};
}

function displayName() {
  return host().displayName || "Travel Director";
}

function firstName() {
  return displayName().trim().split(/\s+/)[0] || "Director";
}

function navDirectorLabel() {
  return firstName().slice(0, 8);
}
