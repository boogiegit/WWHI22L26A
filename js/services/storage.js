const noteCache = new Map();
const todayBriefCache = new Map();
const optionalImageCache = new Map();
const dayContentCache = new Map();
const optionalContentCache = new Map();
const meetingPointConfigCache = new Map();
const hostContentCache = new Map();
const dayResourceCache = new Map();
const cityGuideCache = new Map();
const pendingSaves = new Map();

async function hydrateLiveData() {
  if (!USE_REMOTE_STORAGE) return;
  await Promise.all([
    hydrateSharedPrefix("admin-note:"),
    hydrateSharedPrefix("admin-brief:"),
    hydrateSharedPrefix("admin-day-content:"),
    hydrateSharedPrefix("optional-content:"),
    hydrateSharedPrefix("optional-image:"),
    hydrateSharedPrefix("meeting-points:"),
    hydrateSharedPrefix("day-resource-links:"),
    hydrateSharedPrefix("city-guide-links:"),
    hydrateSharedPrefix("host-content")
  ]);
}

async function hydrateSharedPrefix(name) {
  const primary = sharedKey(name);
  await hydratePrefix(primary);
  const legacy = legacySharedKey(name);
  if (legacy !== primary) await hydratePrefix(legacy, primary);
}

async function hydratePrefix(prefix, targetPrefix = prefix) {
  const list = await remoteList(prefix);
  if (!list.length) return;
  const entries = await Promise.all(list.map((keyName) => remoteGet(keyName).then((value) => [keyName, value])));
  entries.forEach(([keyName, value]) => {
    if (value == null) return;
    const targetKeyName = targetPrefix + keyName.slice(prefix.length);
    if (targetKeyName.includes(":admin-note:")) {
      noteCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":admin-brief:")) {
      todayBriefCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":admin-day-content:")) {
      dayContentCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":optional-content:")) {
      optionalContentCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":optional-image:")) {
      optionalImageCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":meeting-points:")) {
      meetingPointConfigCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":day-resource-links:")) {
      dayResourceCache.set(targetKeyName, value);
    } else if (targetKeyName.endsWith(":host-content")) {
      hostContentCache.set(targetKeyName, value);
    } else if (targetKeyName.includes(":city-guide-links:")) {
      cityGuideCache.set(targetKeyName, value);
    }
  });
}

async function remoteList(prefix) {
  try {
    const r = await fetch(`${API_URL}?action=list&shared=1&prefix=${encodeURIComponent(prefix)}`, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.keys) ? data.keys : [];
  } catch (error) {
    return [];
  }
}

async function remoteGet(keyName) {
  try {
    const r = await fetch(`${API_URL}?action=get&shared=1&key=${encodeURIComponent(keyName)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    return data && typeof data.value === "string" ? data.value : null;
  } catch (error) {
    return null;
  }
}

function queueRemoteSave(action, keyName, value) {
  if (!USE_REMOTE_STORAGE) return Promise.resolve({ ok: true, localOnly: true });
  const saveKey = `${action}:${keyName}`;
  if (pendingSaves.has(saveKey)) {
    pendingSaves.get(saveKey).abort();
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  pendingSaves.set(saveKey, controller);
  return fetch(API_URL, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": authState.csrfToken },
    body: JSON.stringify({
      action,
      key: keyName,
      value,
      shared: 1
    }),
    signal: controller.signal
  }).then(async (response) => {
    if (!response.ok) {
      let message = `Upload failed (${response.status})`;
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch (error) {}
      throw new Error(message);
    }
    return response.json().catch(() => ({ ok: true }));
  }).finally(() => {
    clearTimeout(timer);
    if (pendingSaves.get(saveKey) === controller) {
      pendingSaves.delete(saveKey);
    }
  });
}

function getJsonConfig(keyName, cache) {
  const raw = cache.has(keyName) ? cache.get(keyName) : (() => {
    try { return sessionStorage.getItem(keyName) || ""; } catch (error) { return ""; }
  })();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (error) { return null; }
}

function saveJsonConfig(keyName, cache, value) {
  const raw = JSON.stringify(value || {});
  cache.set(keyName, raw);
  try { sessionStorage.setItem(keyName, raw); } catch (error) {}
  return queueRemoteSave("set", keyName, raw);
}

function deleteJsonConfig(keyName, cache) {
  cache.delete(keyName);
  try { sessionStorage.removeItem(keyName); } catch (error) {}
  queueRemoteSave("delete", keyName, "");
}

function ensureToolStorage() {
  if (window.storage && window.storage.__bushTools) return window.storage;
  window.storage = {
    __bushTools: true,
    async get(key, shared = false) {
      const fullKey = shared ? sharedKey(`tool:${key}`) : storageKey(`tool:${key}`);
      if (shared && USE_REMOTE_STORAGE) {
        const remoteValue = await remoteGet(fullKey);
        return remoteValue;
      }
      try { return sessionStorage.getItem(fullKey); } catch (error) { return null; }
    },
    async set(key, value, shared = false, syncRemote = true) {
      const fullKey = shared ? sharedKey(`tool:${key}`) : storageKey(`tool:${key}`);
      const str = typeof value === "string" ? value : JSON.stringify(value);
      if (shared && USE_REMOTE_STORAGE && syncRemote) await queueRemoteSave("set", fullKey, str);
      else { try { sessionStorage.setItem(fullKey, str); } catch (error) {} }
      return true;
    },
    async delete(key, shared = false) {
      const fullKey = shared ? sharedKey(`tool:${key}`) : storageKey(`tool:${key}`);
      try { sessionStorage.removeItem(fullKey); } catch (error) {}
      if (shared && USE_REMOTE_STORAGE) await queueRemoteSave("delete", fullKey, "");
      return true;
    },
    async list(prefix, shared = false) {
      const basePrefix = shared ? sharedKey("tool:") : storageKey("tool:");
      const fullPrefix = shared ? sharedKey(`tool:${prefix}`) : storageKey(`tool:${prefix}`);
      let localKeys = [];
      try {
        localKeys = Object.keys(sessionStorage).filter((key) => key.startsWith(fullPrefix)).map((key) => key.replace(basePrefix, ""));
      } catch (error) {}
      if (shared && USE_REMOTE_STORAGE) {
        const keys = await remoteList(fullPrefix);
        return keys.map((key) => key.replace(basePrefix, ""));
      }
      return localKeys;
    }
  };
  return window.storage;
}
