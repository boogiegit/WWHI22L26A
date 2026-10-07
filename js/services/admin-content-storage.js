function dayNoteKey(dayNumber) {
  return sharedKey(`admin-note:${dayNumber}`);
}

function dayBriefKey(dayNumber) {
  return sharedKey(`admin-brief:${dayNumber}`);
}

function dayContentKey(dayNumber) {
  return sharedKey(`admin-day-content:${dayNumber}`);
}

function hostContentKey() {
  return sharedKey("host-content");
}

function optionalContentKey(optionalTitle) {
  return sharedKey(`optional-content:${slugify(optionalTitle)}`);
}

function dayMeetingPointKey(dayNumber) {
  return sharedKey(`meeting-points:${dayNumber}`);
}

function dayResourceLinksKey(dayNumber) {
  return sharedKey(`day-resource-links:${dayNumber}`);
}

function cityGuideLinksKey(dayNumber) {
  return sharedKey(`city-guide-links:${dayNumber}`);
}

function getDayMeetingPointConfig(dayNumber) {
  const keyName = dayMeetingPointKey(dayNumber);
  const fallback = defaultDayMeetingPointConfig(dayNumber);
  const raw = meetingPointConfigCache.has(keyName) ? meetingPointConfigCache.get(keyName) : (() => {
    try { return sessionStorage.getItem(keyName) || ""; } catch (error) { return ""; }
  })();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      ...(fallback || {}),
      ...parsed,
      items: {
        ...((fallback && fallback.items) || {}),
        ...((parsed && parsed.items) || {})
      }
    };
  } catch (error) {
    return fallback;
  }
}

function saveDayMeetingPointConfig(dayNumber, value) {
  const keyName = dayMeetingPointKey(dayNumber);
  const raw = JSON.stringify(value || { items: {} });
  meetingPointConfigCache.set(keyName, raw);
  try { sessionStorage.setItem(keyName, raw); } catch (error) {}
  queueRemoteSave("set", keyName, raw);
}

function deleteDayMeetingPointConfig(dayNumber) {
  const keyName = dayMeetingPointKey(dayNumber);
  meetingPointConfigCache.delete(keyName);
  try { sessionStorage.removeItem(keyName); } catch (error) {}
  queueRemoteSave("delete", keyName, "");
}

function getDayNote(dayNumber) {
  const keyName = dayNoteKey(dayNumber);
  if (noteCache.has(keyName)) return noteCache.get(keyName) || "";
  try {
    return sessionStorage.getItem(keyName) || "";
  } catch (error) {
    return "";
  }
}

function saveDayNote(dayNumber, value) {
  const keyName = dayNoteKey(dayNumber);
  noteCache.set(keyName, value);
  try {
    sessionStorage.setItem(keyName, value);
  } catch (error) {}
  queueRemoteSave("set", keyName, value);
}

function getDayBriefConfig(dayNumber) {
  const keyName = dayBriefKey(dayNumber);
  const raw = todayBriefCache.has(keyName) ? todayBriefCache.get(keyName) : (() => {
    try { return sessionStorage.getItem(keyName) || ""; } catch (error) { return ""; }
  })();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (error) { return null; }
}

function saveDayBriefConfig(dayNumber, value) {
  const keyName = dayBriefKey(dayNumber);
  const raw = JSON.stringify(value);
  todayBriefCache.set(keyName, raw);
  try { sessionStorage.setItem(keyName, raw); } catch (error) {}
  queueRemoteSave("set", keyName, raw);
}

function deleteDayBriefConfig(dayNumber) {
  const keyName = dayBriefKey(dayNumber);
  todayBriefCache.delete(keyName);
  try { sessionStorage.removeItem(keyName); } catch (error) {}
  queueRemoteSave("delete", keyName, "");
}

function getDayContentConfig(dayNumber) {
  return getJsonConfig(dayContentKey(dayNumber), dayContentCache);
}

function saveDayContentConfig(dayNumber, value) {
  return saveJsonConfig(dayContentKey(dayNumber), dayContentCache, {...value,scheduleRevision:'20261006-fixes'});
}

function deleteDayContentConfig(dayNumber) {
  deleteJsonConfig(dayContentKey(dayNumber), dayContentCache);
}

function getDayResourceLinks(dayNumber) {
  const config = getJsonConfig(dayResourceLinksKey(dayNumber), dayResourceCache);
  if (Array.isArray(config?.items)) return config.items;
  const bundled = toolsConfig().dayResources?.[dayNumber]?.links;
  return Array.isArray(bundled) ? bundled : [];
}

async function saveDayResourceLinks(dayNumber, items) {
  if(!ADMIN_MODE || !USE_REMOTE_STORAGE)throw Error('Server administrator access is required.');
  const key=dayResourceLinksKey(dayNumber),raw=JSON.stringify({items:Array.isArray(items)?items:[]});
  await queueRemoteSave('set',key,raw);
  dayResourceCache.set(key,raw);
  try {sessionStorage.setItem(key,raw);}catch{}
}

function getCityGuideLinks(dayNumber) {
  const config = getJsonConfig(cityGuideLinksKey(dayNumber), cityGuideCache);
  return Array.isArray(config?.items) ? config.items : [];
}

function saveCityGuideLinks(dayNumber, items) {
  saveJsonConfig(cityGuideLinksKey(dayNumber), cityGuideCache, {
    items: Array.isArray(items) ? items : []
  });
}

function getHostContentConfig() {
  return getJsonConfig(hostContentKey(), hostContentCache);
}

function saveHostContentConfig(value) {
  saveJsonConfig(hostContentKey(), hostContentCache, value);
}

function deleteHostContentConfig() {
  deleteJsonConfig(hostContentKey(), hostContentCache);
}

function getOptionalContentConfig(optionalTitle) {
  return getJsonConfig(optionalContentKey(optionalTitle), optionalContentCache);
}

function saveOptionalContentConfig(optionalTitle, value) {
  saveJsonConfig(optionalContentKey(optionalTitle), optionalContentCache, {...value,contentRevision:'20261002-details'});
}

function deleteOptionalContentConfig(optionalTitle) {
  deleteJsonConfig(optionalContentKey(optionalTitle), optionalContentCache);
}
