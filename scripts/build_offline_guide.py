#!/usr/bin/env python3
"""Generate a public, read-only fallback from this tour's bundled JSON only."""
from pathlib import Path
from html import escape
import json
import os, shutil, subprocess, re
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
def build():
    folder=ROOT/'tours/WWHI22L26A'
    read=lambda name:json.loads((folder/name).read_text())
    hotels={h['id']:h for h in read('hotels.json')['hotels']}
    days=read('itinerary.json')['days']
    data=read('data.json')
    experiences=read('experiences.json')['days']
    faq=read('resources.json')['tools']['faq']
    out=['''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ce1126"><title>Xmas Whirl · Offline guide</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#222;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:22px}header{border-top:5px solid #ce1126}h1{font:700 34px Georgia,serif;line-height:1.2}h2{font-size:23px;line-height:1.3}h3{font-size:18px}article,aside{padding:20px;margin:20px 0;background:white;border:1px solid #dedbd4;border-radius:14px}.badge{color:#976f17;font-weight:800;letter-spacing:.1em;font-size:13px}a{color:#9e1020}nav{display:flex;gap:8px;flex-wrap:wrap}nav a{padding:8px 13px;background:#fff;border:1px solid #ddd;border-radius:20px}li{margin:12px 0}.note{color:#555;font-size:15px}.schedule{padding-left:0;list-style:none}.time{font-weight:800;color:#8c6816;margin-right:10px}details{padding:14px 0;border-bottom:1px solid #eee}summary{cursor:pointer;font-weight:700}footer{padding:30px 0}.gtr-lead,.gtr-subtitle,.trip-feature-title,.director-card-title{font-weight:750;font-size:20px;margin:16px 0 8px}.gtr-metric-grid,.gtr-perks-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.gtr-metric-value,.gtr-perk-title{font-weight:700}.trip-feature-card,.gtr-subpanel,.director-card{border-top:1px solid #ddd;margin-top:20px;padding-top:14px}.trip-feature-actions,.gtr-cta-stack{display:flex;gap:14px;flex-wrap:wrap}.gtr-footnote{font-size:15px}.director-card-kicker,.trip-feature-label{color:#806117;font-weight:700}</style><main><header><p class="badge">WWHI22L26A · SAVED TRIP GUIDE</p><h1>Xmas Whirl 2026</h1><p>Itinerary overviews, experiences, hotels, contacts and Where Next.</p></header><aside><strong>This is the offline edition.</strong><p>It contains trip overviews, not live admin changes or announcements. Today’s detailed schedules are not saved here: view them online from 4 p.m. the day before. Maps, videos and sending responses need internet.</p>''']
    out.append(f'<p class="note">Content edition: {date.today().strftime("%d %B %Y")}. Reconnect and save again before travelling.</p><a href="./app.html">Try the live app</a></aside><nav aria-label="Tour days">')
    out.append('<a href="#itinerary">Itinerary</a><a href="#experiences">Experiences</a><a href="#hotels">Hotels</a><a href="#contacts">Contacts</a><a href="#joining">Joining & FAQ</a><a href="#where-next">Where Next</a></nav>')
    e=lambda v:escape(str(v or ''))
    out.append('<article id="itinerary"><h2>Itinerary overview</h2>')
    for d in days:
        out.append(f'<details id="day-{d["number"]}"><summary>Day {d["number"]} · {e(d["guest"]["title"])}</summary><p class="badge">{e(d["weekday"])} {e(d["date"])}</p><p>{e(d["guest"].get("narrative"))}</p></details>')
    out.append('</article><article id="experiences"><h2>Experiences</h2><p id="offline-interest-note" class="note">You’re viewing offline. Connect to the internet to show or change your interest.</p>')
    seen=set()
    for day in experiences:
        for item in day.get('optionals',[]):
            key=item.get('experienceId',item['title'])
            if key in seen:continue
            seen.add(key)
            price=item.get('price',{})
            out.append(f'<details><summary>{e(item["title"])}</summary><p>{e(price.get("currency"))} {e(price.get("amount"))}</p><p>{e(item.get("description"))}</p><a data-interest-id="{e(key)}" class="interest-guide" href="./app.html?tab=experiences">I’m interested</a><small class="interest-guide-help"></small></details>')
    out.append('</article><article id="hotels"><h2>Hotels</h2>')
    for h in hotels.values():
        out.append(f'<details><summary>{e(h.get("city"))} · {e(h["name"])}</summary><p>{e(h.get("address"))}<br>{e(h.get("phone"))}</p></details>')
    host=data['hostDefaults']
    out.append(f'</article><article id="contacts"><h2>Contacts</h2><h3>{e(host["displayName"])}</h3><p>{e(host.get("phone"))}<br>{e(host.get("emailLabel"))}</p>')
    for contact in data['contacts'].get('operatorSupport',[]):
        out.append(f'<h3>{e(contact["label"])}</h3><p>{e(contact.get("phone"))}</p>')
    out.append('<p>European emergency number: 112</p><p class="note">Contact details are saved for reference. Calls need phone service; online messaging needs internet.</p></article>')
    node = os.environ.get('NODE_BINARY') or shutil.which('node')
    if not node:
        bundled = Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
        if bundled.is_file(): node = str(bundled)
    if not node: raise RuntimeError('Node.js is required to render Where Next. Set NODE_BINARY to its path.')
    rewards = subprocess.check_output([node, str(ROOT/'scripts/render_offline_rewards.mjs')], text=True)
    # The saved guide is self-contained; remote photos and videos are not downloaded.
    rewards = re.sub(r'<img\b[^>]*>', '', rewards)
    out.append('<article id="where-next"><h2>Where Next</h2><p class="note">Saved information from the app. Videos, trip websites and registration links require internet. Reconnect to check current offers before booking.</p>'+rewards+'</article>')
    out.append('<article id="joining"><h2>Joining & FAQ</h2>')
    for section in faq:
        out.append(f'<h3>{escape(section["title"])}</h3>')
        for item in section['items']:
            links=''.join(f'<p><a href="{escape(link["url"], quote=True)}">{escape(link["label"])}</a></p>' for link in item.get('links',[]) if link['url'].startswith(('https://','tel:','mailto:')))
            out.append(f'<details><summary>{escape(item["question"])}</summary><p>{escape(item["answer"])}</p>{links}</details>')
    out.append("""<style>.interest-guide{display:inline-block;padding:10px 16px;border-radius:12px;background:#16863c;color:white;font-weight:700;text-decoration:none}.interest-guide[aria-disabled=true]{background:#666;cursor:default}.interest-guide-help{display:block;color:#555}</style><script>
function updateOfflineInterest(){
 let saved=[];try{saved=JSON.parse(localStorage.getItem('wwhi22l26a-interest-saved')||'[]');if(!Array.isArray(saved))saved=[];}catch{}
 const offline=navigator.onLine===false;
 document.getElementById('offline-interest-note').textContent=offline?'You’re viewing offline. Connect to the internet to show or change your interest.':'You’re viewing your saved guide. Open the live app to show or change your interest.';
 document.querySelectorAll('[data-interest-id]').forEach(button=>{
  const interested=saved.some(item=>item.experience===button.dataset.interestId && Number(item.people)>0);
  button.textContent=interested?'✓ You’re interested':offline?'Connect to show interest':'I’m interested';
  button.setAttribute('aria-disabled',String(offline));
  if(offline){button.removeAttribute('href');button.setAttribute('role','button');}else{button.href='./app.html?tab=experiences';button.removeAttribute('role');}
  button.nextElementSibling.textContent=interested?(offline?'Last saved on this device. Changes available when connected.':'Open the live app to view or change your interest.'):'';
 });
}
updateOfflineInterest();window.addEventListener('online',updateOfflineInterest);window.addEventListener('offline',updateOfflineInterest);window.addEventListener('pageshow',updateOfflineInterest);window.addEventListener('storage',updateOfflineInterest);
</script>""")
    out.append('</article><footer><a href="./app.html">Return to the live app when connected</a></footer></main></html>')
    (ROOT/'offline-guide.html').write_text('\n'.join(line.rstrip() for line in ''.join(out).splitlines()))
if __name__=='__main__':build()
