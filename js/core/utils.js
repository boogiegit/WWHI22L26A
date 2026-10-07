function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateLong(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function dateShort(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short"
  });
}

function parseScheduleTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function formatScheduleMins(mins) {
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function periodForTime(value) {
  if (/^(evening|eve)$/i.test(String(value || "").trim())) return "evening";
  const minutes = timeToMinutes(value);
  if (minutes == null) return "afternoon";
  if (minutes < 720) return "morning";
  if (minutes < 1020) return "afternoon";
  return "evening";
}

function periodLabel(period) {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

function periodIcon(period) {
  if (period === "morning") return "☼";
  if (period === "afternoon") return "☁";
  return "☾";
}

function monthShortUpper(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
}

function weekdayShortUpper(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
}

function cleanActivityTitle(value) {
  return String(value || "")
    .replace(/^Optional Experience[:\s-]*/i, "")
    .replace(/^MTM[:\s-]*/i, "")
    .replace(/^Make Travel Matter[:\s-]*/i, "")
    .replace(/^Be My Guest[:\s-]*/i, "")
    .replace(/^Depart hotel for\s+/i, "")
    .replace(/^Depart (hotel|for|on coach|Tronchetto on coach|Montmartre for Hotel)\s*/i, "")
    .replace(/^Arrive\s+([A-Za-z /-]+)\s+-\s+Free time.*$/i, "Arrive $1")
    .replace(/^Arrive (for|to|at)\s*/i, "")
    .replace(/^Meet (group|guests|Local Specialists?)\s*/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionalDescription(value) {
  return String(value || "")
    .replace(/\bexciti ng\b/gi, "exciting")
    .replace(/\bloc al\b/gi, "local")
    .replace(/\bru ral\b/gi, "rural")
    .replace(/you[’'] ll/gi, "you’ll")
    .replace(/\bsma ll\b/gi, "small")
    .replace(/\bbea utiful\b/gi, "beautiful")
    .replace(/\bst ories\b/gi, "stories")
    .replace(/\bcui sine\b/gi, "cuisine")
    .replace(/\bnat ional\b/gi, "national")
    .replace(/\bavailabilit y\b/gi, "availability")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isLogisticsOnly(title) {
  const value = String(title || "").toLowerCase();
  return /^hotel$|^tronchetto$|^for tronchetto$|^free time$|^included\s+|breakfast|wake up|bags|luggage|depart|services|comfort stop|service stop|wc stop|toilet stop|pick up|pickup|pick-up|relief coach|driver|walk back|walk to coach|city pick up|free evening|arrive hotel|hotel check-in|check-in|return to (the )?hotel|port of dover|ferry (departs|arrive)|motoscafo back|drop off|shopping/.test(value);
}

function normalizeNarrativeText(value) {
  return String(value || "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/Later\s+,/gi, "Later,")
    .replace(/cru\s+ise/gi, "cruise")
    .replace(/na\s+vigate/gi, "navigate")
    .replace(/a\s+nd/gi, "and")
    .replace(/spir\s+es/gi, "spires")
    .replace(/th\s+e/gi, "the")
    .replace(/li\s+ned/gi, "lined")
    .replace(/en\s+r\s+oute/gi, "en route")
    .replace(/Engelber\s+g/gi, "Engelberg")
    .replace(/th\s+en/gi, "then")
    .replace(/Princi\s+pality/gi, "Principality")
    .replace(/\bV\s+aduz\b/gi, "Vaduz")
    .replace(/Snow-\s+capped/gi, "Snow-capped")
    .replace(/st\s+unning/gi, "stunning")
    .replace(/cou\s+ntryside/gi, "countryside")
    .replace(/Admi\s+re/gi, "Admire")
    .replace(/pr\s+ecious/gi, "precious")
    .replace(/almos\s+t/gi, "almost")
    .replace(/\bB\s+renner\b/gi, "Brenner")
    .replace(/eveni\s+ng/gi, "evening")
    .replace(/enjoy\s+ing/gi, "enjoying")
    .replace(/sun\s+set/gi, "sunset")
    .replace(/gla\s+ssmaking/gi, "glassmaking")
    .replace(/\bw\s+hich\b/gi, "which")
    .replace(/glassblow\s+ing/gi, "glassblowing")
    .replace(/fore\s+fathers/gi, "forefathers")
    .replace(/\ba\s+dorn\b/gi, "adorn")
    .replace(/\bMa\s+rk's\b/gi, "Mark's")
    .replace(/\bPa\s+lace\b/gi, "Palace")
    .replace(/explo\s+ring/gi, "exploring")
    .replace(/\ba\s+round\b/gi, "around")
    .replace(/st\s+reet/gi, "street")
    .replace(/\be\s+vening\b/gi, "evening")
    .replace(/\bo\s+r\b/gi, "or")
    .replace(/\bin\s+to\b/gi, "into")
    .replace(/spectato\s+rs/gi, "spectators")
    .replace(/\br\s+aces\b/gi, "races")
    .replace(/\bs\s+ights\b/gi, "sights")
    .replace(/vi\s+neyards/gi, "vineyards")
    .replace(/encha\s+nting/gi, "enchanting")
    .replace(/funicu\s+lar/gi, "funicular")
    .replace(/walki\s+ng/gi, "walking")
    .replace(/retrea\s+t/gi, "retreat")
    .replace(/centu\s+ries/gi, "centuries")
    .replace(/Trav\s+elling/gi, "Travelling")
    .replace(/journe\s+y/gi, "journey")
    .replace(/pa\s+inters/gi, "painters")
    .replace(/\bF\s+lorence\b/gi, "Florence")
    .replace(/art\s+,/gi, "art,")
    .replace(/wor\s+kmanship/gi, "workmanship")
    .replace(/Leavi\s+ng/gi, "Leaving")
    .replace(/\bp\s+layground\b/gi, "playground")
    .replace(/befor\s+e/gi, "before")
    .replace(/medieva\s+l/gi, "medieval")
    .replace(/Saint-\s+Paul/gi, "Saint-Paul")
    .replace(/le\s+isure/gi, "leisure")
    .replace(/Eu\s+rope/gi, "Europe")
    .replace(/Frag\s+onard/gi, "Fragonard")
    .replace(/tryi\s+ng/gi, "trying")
    .replace(/res\s+taurant/gi, "restaurant")
    .replace(/Pont d'A\s+vignon/gi, "Pont d'Avignon")
    .replace(/strat\s+egic/gi, "strategic")
    .replace(/\bsur\s+e\b/gi, "sure")
    .replace(/\bo\s+n\b/gi, "on")
    .replace(/arri\s+val/gi, "arrival")
    .replace(/arch ac\s+ross/gi, "arch across")
    .replace(/neighbou\s+rhood/gi, "neighbourhood")
    .replace(/travell\s+ers/gi, "travellers")
    .replace(/perspect\s+ive/gi, "perspective")
    .replace(/rive\s+r/gi, "river")
    .replace(/Trave\s+l Director/gi, "Travel Director")
    .replace(/17\s+-century/gi, "17th-century")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizePhone(value) {
  return String(value || "")
    .replace(/^\[\+/, "+")
    .replace(/\]/g, "")
    .replace(/\(0\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^39\s/, "+39 ")
    .replace(/^33\s/, "+33 ")
    .replace(/^49\s/, "+49 ")
    .replace(/^41\s/, "+41 ")
    .trim();
}

function telHref(value) {
  const phone = normalizePhone(value).replace(/[^+\d]/g, "");
  return phone ? "tel:" + phone : "";
}

function formatArrivalDate(value) {
  if (!value) return "";
  return new Date(value + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function mapUrlForQuery(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function weatherUrlForQuery(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(`weather ${query}`)}`;
}

function celsiusToFahrenheit(value) {
  return Math.round((Number(value) * 9 / 5) + 32);
}

function fileNameFromUrl(url) {
  try {
    const pathname = new URL(url, location.href).pathname || "";
    return decodeURIComponent(pathname.split("/").pop() || "");
  } catch (error) {
    return "";
  }
}

function normalizeLookupText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatPrice(optional) {
  if (!optional || !optional.price || optional.price.amount == null) return "Price to confirm";
  const currency = optional.price.currency || "";
  return `${currency} ${optional.price.amount}`;
}

function scheduleNoteTone(item) {
  const text = `${item?.title || ""} ${item?.note || ""}`.toLowerCase();
  return /passport|pickpocket|scammer|valuables|safe deposit|bags unattended|belongings|church dress|vox|dress in layers|dress sharp/.test(text) ? "alert" : "";
}

function scheduleNoteText(item) {
  const note = String(item?.note || "").trim();
  if (!note) return "";
  const title = String(item?.title || "").trim();
  if (note.toLowerCase() === title.toLowerCase()) return "";
  if (/^experience\.?$/i.test(note)) return "";
  return note;
}
