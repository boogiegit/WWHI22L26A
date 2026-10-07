function routeLabel(day) {
  if (!day) return "";
  return day.technical.routeSegments && day.technical.routeSegments.length
    ? day.technical.routeSegments.join(" → ")
    : day.technical.routeTitle;
}

function displayDayTitle(day) {
  return DAY_TITLE_OVERRIDES[day.number] || day.guest.title || day.technical.routeTitle;
}

function findOptionalByNeedle(day, needle) {
  const lowered = String(needle || "").toLowerCase();
  return (day.optionals || []).find((item) => String(item.title || "").toLowerCase().includes(lowered) || optionalTitleMatches(item.title, needle));
}

function optionalTitleTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(st|saint)\b/g, "saint")
    .replace(/['’]s\b/g, "s")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !["and", "the", "with", "for", "from", "into", "inside", "rome", "paris", "venice", "florence"].includes(token));
}

function optionalTitleMatches(optionalTitle, candidateTitle) {
  const optionalTokens = optionalTitleTokens(optionalTitle);
  const candidateTokens = optionalTitleTokens(cleanActivityTitle(candidateTitle));
  if (!optionalTokens.length || !candidateTokens.length) return false;
  const optionalSet = new Set(optionalTokens);
  const matched = candidateTokens.filter((token) => optionalSet.has(token)).length;
  return matched >= Math.min(candidateTokens.length, 2) || matched >= Math.ceil(candidateTokens.length * 0.65);
}

function scheduleOptionalHasRichCard(day, item) {
  if (itemCategory(item) !== "optional") return false;
  return (day.optionals || []).some((optional) => optional.description && optionalTitleMatches(optional.title, item.title));
}

function itemCategory(item) {
  const haystack = `${item && item.title || ""} ${item && item.note || ""}`.toLowerCase();
  if (haystack.includes("make travel matter") || haystack.includes("mtm") || haystack.includes("glassblowing") || haystack.includes("glass blowing") || haystack.includes("be my guest")) {
    return "special";
  }
  return inferItemKind(item);
}

function inferItemKind(item) {
  const rawKind = String(item && item.kind || "").toLowerCase();
  if (rawKind === "optional") return "optional";
  if (rawKind === "included") return "included";
  const haystack = `${item && item.title || ""} ${item && item.note || ""}`.toLowerCase();
  if (haystack.includes("optional experience")) return "optional";
  return "included";
}

function timelineIconConfig(item) {
  const text = `${item?.title || ""} ${item?.note || ""} ${item?.plainNote || ""} ${item?.kindLabel || ""}`.toLowerCase();
  const kind = inferItemKind(item);
  if (/\b(luggage|bags? out|suitcases?)\b/.test(text)) return { icon: "luggage", tone: "luggage" };
  if (/\b(breakfast|dinner|lunch|meal|restaurant|food|drinks|welcome dinner|reception dinner)\b/.test(text)) return { icon: "restaurant", tone: "meal" };
  if (/\b(service stop|services|rest stop|comfort stop|toilet|wc|bathroom)\b/.test(text)) return { icon: "local_cafe", tone: "service" };
  if (/\b(scafi|boat|boats|gondola|gondolas|cruise|lagoon|water taxi|water taxis|ferry|murano|burano|lido)\b/.test(text)) return { icon: "sailing", tone: "boat" };
  if (/\b(coach|depart|departure|transfer|airport|taxi|station|drive|boarding|return to hotel|back to hotel)\b/.test(text)) return { icon: "directions_bus", tone: "coach" };
  if (/\b(welcome meeting|hospitality desk|meet brendon|meet at the hospitality desk|tour documents|paperwork)\b/.test(text)) return { icon: "assignment", tone: "meeting" };
  if (/\b(walk|walking|orientation|guided tour|secrets|free time|meet group|meet at|meeting)\b/.test(text)) return { icon: "directions_walk", tone: /\bmeet|meeting\b/.test(text) ? "meeting" : "walk" };
  if (/\b(church|basilica|duomo|st\.? peter|santa maria|pantheon|cosmedin)\b/.test(text)) return { icon: "church", tone: "landmark" };
  if (/\b(museum|gallery|uffizi|accademia|palace|colosseum|monument|piazza|sightseeing|local specialist)\b/.test(text)) return { icon: "museum", tone: "landmark" };
  if (/\b(gold|leather|shopping|shop|shops|swarovski|gift|watches|chocolate)\b/.test(text)) return { icon: "shopping_bag", tone: "shopping" };
  if (/\b(check-?in|hotel check|arrive hotel|arrive to the hotel|arrive at hotel|overnight hotel)\b/.test(text)) return { icon: "hotel", tone: "hotel" };
  if (/\b(free evening|free afternoon|free morning|evening)\b/.test(text)) return { icon: "local_cafe", tone: "free" };
  if (kind === "optional") return { icon: "stars", tone: "experience" };
  return { icon: "event", tone: "landmark" };
}

function itineraryOptionalPeriod(day, optional) {
  if (optional?.period) return optional.period;
  const title = String(optional.title || "").toLowerCase();
  if (/cabaret|nouvelle eve/.test(title)) return "evening";
  const terms = String(optional.title || "").toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3);
  for (const item of day.schedule || []) {
    const haystack = `${item.title || ""} ${item.note || ""}`.toLowerCase();
    if (terms.some((term) => haystack.includes(term))) return periodForTime(item.time);
  }
  if (/dinner|cabaret|evening/.test(title)) return "evening";
  if (/lunch|cruise|capri|montmartre|versailles|piazzas|corniche|burano|titlis|lucerne/.test(title)) return "afternoon";
  return "afternoon";
}

function dayOverviewPills(day) {
  if (DAY_OVERVIEW_PILL_OVERRIDES[day.number]) return DAY_OVERVIEW_PILL_OVERRIDES[day.number];
  const pills = [];
  const seen = new Set();
  const add = (label, category) => {
    if (category !== 'optional' && (day.optionals || []).some((optional) => optional.description && optionalTitleMatches(optional.title, label))) return;
    const key = category + ':' + label;
    if (!label || seen.has(key)) return;
    seen.add(key);
    pills.push({ label, category });
  };

  for (const item of day.schedule || []) {
    if (scheduleOptionalHasRichCard(day, item)) continue;
    const label = cleanActivityTitle(item.title);
    if (!label || isLogisticsOnly(label)) continue;
    add(label, itemCategory(item));
    if (pills.length >= 5) break;
  }

  for (const optional of day.optionals || []) add(optional.title, 'optional');
  return pills;
}

function dayOverviewSummary(day) {
  const pills = dayOverviewPills(day);
  return [
    ...pills.filter((item) => item.category === "optional"),
    ...pills.filter((item) => item.category !== "optional")
  ].slice(0, 3).map((item) => item.label.replace(/: experience$/i, '')).join(' · ');
}
