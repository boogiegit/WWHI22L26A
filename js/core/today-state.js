function currentTourDay() {
  const today = new Date();
  const start = new Date(`${tour.meta.startDate}T00:00:00`);
  const diff = Math.floor((today - start) / 86400000) + 1;
  if (diff < 1) return 1;
  return Math.min(diff, tour.meta.dayCount);
}

function builderPreviewMode() {
  return new URLSearchParams(location.search).get("builderPreview") === "1";
}

function builderPreviewDayNumber() {
  if (!builderPreviewMode()) return null;
  const value = Number(new URLSearchParams(location.search).get("previewDay"));
  if (!Number.isInteger(value) || value < 1 || value > Number(tour?.meta?.dayCount || 0)) return null;
  return value;
}

function localTodayPreviewMode() {
  return LOCAL_HOSTS.has(location.hostname) && new URLSearchParams(location.search).get("preview") === "1";
}

function displayDayNumber() {
  const previewDay = builderPreviewDayNumber();
  if (previewDay) return previewDay;
  return (ADMIN_MODE || localTodayPreviewMode()) ? (adminSelectedDay || 1) : currentTourDay();
}

function isDisplayedDayToday(day) {
  if (builderPreviewDayNumber()) return !!day && day.number === displayDayNumber();
  return !!day && day.number === currentTourDay();
}

function upcomingDay() {
  return dayByNumber(Math.min(displayDayNumber() + 1, tour.meta.dayCount));
}

const NEXT_UP_LATE_GRACE_MINUTES = 10;
const NEXT_UP_SOON_THRESHOLD_SECONDS = 10 * 60;

function nextUpTimedItems(day) {
  return (day?.schedule || [])
    .map((item, index) => ({ item, index, mins: parseScheduleTime(item?.time) }))
    .filter((entry) => entry.mins !== null)
    .sort((a, b) => a.mins - b.mins);
}

function nextUpIsPassiveItem(item) {
  const text = `${item?.title || ""} ${item?.note || ""} ${item?.kind || ""}`.toLowerCase();
  if (/\b(breakfast|luggage|suitcases?|bags?|souvenirs?)\b/.test(text)) return true;
  if (/\b(arrive|arrival|check[- ]?in|comfort break|lunch stop|service stop|free time)\b/.test(text)) return true;
  if (/\bdinner\b/.test(text) && !/\b(depart|departure|meet|meeting|transfer|pickup)\b/.test(text)) return true;
  return false;
}

function nextUpIsUrgentItem(item) {
  if (item?.requiresPresence === true) return true;
  if (item?.requiresPresence === false || nextUpIsPassiveItem(item)) return false;
  const text = `${item?.title || ""} ${item?.note || ""} ${item?.kind || ""}`.toLowerCase();
  return /\b(depart|departure|transfer|pickup|board|boarding|coach opens|coach loading|leave hotel|leaving|meet at|meeting point|welcome meeting|taxi boats?|scafi|motoscafo)\b|ferry departs?|boat departs?|prompt departure/.test(text);
}

function nextUpIsDisplayItem(item) {
  if (nextUpIsPassiveItem(item)) return false;
  return nextUpIsUrgentItem(item) || inferItemKind(item) === "optional" || /\b(ticket|coach|meeting|experience)\b/i.test(`${item?.title || ""} ${item?.note || ""}`);
}

function nextUpState(day) {
  const timedItems = nextUpTimedItems(day);
  if (!timedItems.length) return { status: "empty", item: null, following: null, index: -1 };
  const displayItems = timedItems.filter((entry) => nextUpIsDisplayItem(entry.item));
  const candidates = displayItems.length ? displayItems : timedItems;
  if (!isDisplayedDayToday(day)) {
    const first = candidates[0] || null;
    return { status: "normal", item: first?.item || null, following: null, index: first?.index ?? -1 };
  }
  const now = new Date();
  const dayStart = new Date(`${day.date}T00:00:00`);
  if (now < dayStart) {
    const first = candidates[0] || null;
    return { status: "normal", item: first?.item || null, following: null, index: first?.index ?? -1 };
  }
  const nowMins = (now.getHours() * 60) + now.getMinutes();
  const late = [...timedItems].reverse().find((entry) => {
    return nextUpIsUrgentItem(entry.item) && nowMins >= entry.mins && nowMins < entry.mins + NEXT_UP_LATE_GRACE_MINUTES;
  });
  if (late) {
    const following = timedItems.find((entry) => entry.mins > nowMins);
    return { status: "late", item: late.item, following: following?.item || null, index: late.index };
  }
  const upcoming = candidates.find((entry) => entry.mins > nowMins);
  if (upcoming) {
    const diffSeconds = Math.max(0, Math.floor((upcoming.mins * 60) - ((now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds())));
    const status = nextUpIsUrgentItem(upcoming.item)
      ? (diffSeconds <= NEXT_UP_SOON_THRESHOLD_SECONDS ? "soon" : "ready")
      : "normal";
    return { status, item: upcoming.item, following: null, index: upcoming.index };
  }
  const last = timedItems[timedItems.length - 1];
  return { status: "complete", item: last?.item || null, following: null, index: last?.index ?? -1 };
}

function nextUpCountdownText(day, item) {
  const mins = parseScheduleTime(item?.time);
  if (!day || mins === null) return "";
  const target = new Date(`${day.date}T00:00:00`);
  target.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Now";
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
