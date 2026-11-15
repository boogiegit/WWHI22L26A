const OFFLINE_GUIDE_CACHE='wwhi22l26a-offline-guide-v1';
async function saveOfflineGuide(){
  const status=document.getElementById('offline-guide-status'),button=document.getElementById('offline-guide-save');
  if(!('serviceWorker' in navigator)||!('caches' in window)){status.textContent='Offline saving is unavailable in this browser. Please use Safari or Chrome over HTTPS.';return;}
  button.disabled=true;status.textContent='Saving the itinerary and hotel guide…';
  try{
    const response=await fetch('./offline-guide.html',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok||response.redirected||!(response.headers.get('Content-Type')||'').includes('text/html'))throw Error();
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(reject,15000))]);
    const cache=await caches.open(OFFLINE_GUIDE_CACHE);await cache.put(new URL('./offline-guide.html',location.href).href,response);
    status.textContent='Saved on this device. Open the app without internet to read the offline guide. Save again after trip updates.';
  }catch{status.textContent='Could not save the guide. Please connect to the internet and try again.';}
  finally{button.disabled=false;}
}
function offlineGuideCard(){return `<section class="offline-guide-card"><h2>Your trip, without internet</h2><p>Save all 12 days, hotel addresses and joining guidance on this device. This edition excludes live changes and announcements.</p><button class="tools-admin-btn" id="offline-guide-save" onclick="saveOfflineGuide()">Save offline guide</button> <a href="./offline-guide.html">View guide</a><p id="offline-guide-status" role="status">Save while online, then test once in flight mode. Clearing browser data removes saved guides.</p></section>`;}
