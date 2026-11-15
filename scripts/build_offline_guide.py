#!/usr/bin/env python3
"""Generate a public, read-only fallback from this tour's bundled JSON only."""
from pathlib import Path
from html import escape
import json
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
def build():
    folder=ROOT/'tours/WWHI22L26A'
    read=lambda name:json.loads((folder/name).read_text())
    hotels={h['id']:h for h in read('hotels.json')['hotels']}
    days=read('itinerary.json')['days']
    faq=read('resources.json')['tools']['faq']
    out=['''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ce1126"><title>Xmas Whirl · Offline guide</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#222;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:22px}header{border-top:5px solid #ce1126}h1{font:700 34px Georgia,serif;line-height:1.2}h2{font-size:23px;line-height:1.3}h3{font-size:18px}article,aside{padding:20px;margin:20px 0;background:white;border:1px solid #dedbd4;border-radius:14px}.badge{color:#976f17;font-weight:800;letter-spacing:.1em;font-size:13px}a{color:#9e1020}nav{display:flex;gap:8px;flex-wrap:wrap}nav a{padding:8px 13px;background:#fff;border:1px solid #ddd;border-radius:20px}li{margin:12px 0}.note{color:#555;font-size:15px}.schedule{padding-left:0;list-style:none}.time{font-weight:800;color:#8c6816;margin-right:10px}summary{cursor:pointer;font-weight:700}footer{padding:30px 0}</style><main><header><p class="badge">WWHI22L26A · SAVED TRIP GUIDE</p><h1>Xmas Whirl 2026</h1><p>Itinerary, hotel details and London joining guidance.</p></header><aside><strong>This is the offline edition.</strong><p>It contains the bundled itinerary, not live admin changes or announcements. Confirm meeting times with Brendon. Maps, videos, weather and sending responses need internet.</p>''']
    out.append(f'<p class="note">Content edition: {date.today().strftime("%d %B %Y")}. Reconnect and save again before travelling.</p><a href="./app.html">Try the live app</a></aside><nav aria-label="Tour days">')
    out.extend(f'<a href="#day-{d["number"]}">Day {d["number"]}</a>' for d in days)
    out.append('<a href="#joining">Joining & FAQ</a></nav>')
    for d in days:
        e=lambda v:escape(str(v or ''))
        out.append(f'<article id="day-{d["number"]}"><p class="badge">DAY {d["number"]} · {e(d["weekday"])} {e(d["date"])}</p><h2>{e(d["guest"]["title"])}</h2><p>{e(d["guest"].get("narrative"))}</p><ul class="schedule">')
        for item in d.get('schedule',[]):
            out.append(f'<li><span class="time">{e(item.get("time") or "TBC")}</span>{e(item["title"])}'+(f'<div class="note">{e(item["note"])}</div>' if item.get('note') else '')+'</li>')
        out.append('</ul>')
        h=hotels.get(d.get('hotelId'))
        if h:out.append(f'<h3>Hotel · {e(h["name"])}</h3><p>{e(h.get("address"))}<br>{e(h.get("phone"))}</p>')
        out.append('</article>')
    out.append('<article id="joining"><h2>Joining & FAQ</h2>')
    for section in faq:
        out.append(f'<h3>{escape(section["title"])}</h3>')
        for item in section['items']:out.append(f'<details><summary>{escape(item["question"])}</summary><p>{escape(item["answer"])}</p></details>')
    out.append('</article><footer><a href="./app.html">Return to the live app when connected</a></footer></main></html>')
    (ROOT/'offline-guide.html').write_text(''.join(out))
if __name__=='__main__':build()
