// Session cookies are HttpOnly. Only the per-session CSRF token reaches JavaScript.
let authState = { role: null, csrfToken: '', config: null };

async function authRequest(action, payload) {
  const response = await fetch(payload === undefined ? `${API_URL}?action=${action}` : API_URL, {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', cache: 'no-store',
    headers: payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': authState.csrfToken },
    body: payload === undefined ? undefined : JSON.stringify({ ...payload, action })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Sign-in service unavailable.');
  return data;
}
function acceptSession(data) {
  authState = data;
  ADMIN_MODE = data.role === 'admin';
  FULL_ADMIN_UI = ADMIN_MODE && URL_PARAMS.get('fullAdmin') === '1';
  WHATSAPP_COMMUNITY_URL = data.config?.whatsappCommunityUrl || '';
  TOMTOM_KEY = data.config?.tomTomBrowserKey || '';
}
function clearPrivateBrowserState() {
  // Remove legacy recovered-app data as well as this departure's data on sign-out.
  for (const store of [localStorage, sessionStorage]) {
    for (const key of Object.keys(store)) if (['tour:WWHI22L26A:', 'tour:xmas-whirl:', 'tour:xmas-whirl-2026:'].some(prefix => key.startsWith(prefix))) store.removeItem(key);
  }
}
async function initializeSession() {
  // Preview is explicitly requested on a local machine; it never grants server privileges.
  if (location.protocol === 'file:' || (LOCAL_HOSTS.has(location.hostname) && URL_PARAMS.get('preview') === '1')) {
    USE_REMOTE_STORAGE = false;
    return;
  }
  try {
    acceptSession(await authRequest('session'));
    // An explicit admin link always requires a fresh server-verified unlock.
    if (URL_PARAMS.get('admin') === '1') {
      if (ADMIN_MODE) acceptSession(await authRequest('lockAdmin', {}));
      adminUnlockOpen = true;
    }
    if (!authState.role) clearPrivateBrowserState();
  } catch (error) {
    // The public itinerary remains usable even before server setup or during an outage.
    // Disabling remote writes does not grant local administrator privileges.
    acceptSession({ role: null, csrfToken: '', config: null });
    USE_REMOTE_STORAGE = false;
    clearPrivateBrowserState();
    if (URL_PARAMS.get('admin') === '1') adminUnlockOpen = true;
  }
}
