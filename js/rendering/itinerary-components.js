function tagMarkup(day) {
  const tags = [];
  if ((day.guest.meals || []).length) tags.push(`<span class="i-tag">${escapeHtml(day.guest.meals.join(", "))}</span>`);
  if ((day.optionals || []).length) tags.push(`<span class="i-tag">${day.optionals.length} experiences</span>`);
  const hotel = hotelForDay(day);
  if (hotel) tags.push(`<span class="i-tag">${escapeHtml(hotel.city)}</span>`);
  return tags.join("");
}

function overviewPillMarkup(label, category = "included") {
  return `<span class="overview-pill ${category}">${escapeHtml(label)}</span>`;
}

function itineraryDayBadge(day) {
  return `
    <span class="i-n">${String(day.number).padStart(2, "0")}</span>
    <span class="i-d">${escapeHtml(weekdayShortUpper(day.date))}<br>${String(new Date(`${day.date}T00:00:00`).getDate()).padStart(2, "0")}<br>${escapeHtml(monthShortUpper(day.date))}</span>`;
}

function itineraryPeriodHeadingMarkup(bucket) {
  return `
            <div class="i-period-head">
	              <div class="i-period-icon ${bucket.period}">${periodIcon(bucket.period)}</div>
	              <div>
	                <div class="i-period">${periodLabel(bucket.period)}</div>
	                ${bucket.text ? `<div class="i-period-copy">${escapeHtml(bucket.text)}</div>` : ""}
	              </div>
	            </div>`;
}

function itinerarySpotlightRowMarkup(pill, ticketMarkup = "") {
  return `
              <div class="i-spotlight ${pill.category === "special" ? "special" : ""}">
                <div class="i-spotlight-kicker">${pill.category === "special" ? "Included" : "Experience"}</div>
                <div class="i-spotlight-title">${escapeHtml(pill.label)}</div>
                ${pill.copy ? `<div class="i-spotlight-copy">${escapeHtml(pill.copy)}</div>` : ""}
                ${ticketMarkup}
              </div>`;
}

function itineraryPeriodPillFallbackMarkup(bucket) {
  return bucket.pills.length && !bucket.highlights.length ? `<div class="i-period-pills">${bucket.pills.map((pill) => overviewPillMarkup(pill.label, pill.category)).join("")}</div>` : "";
}

function itinerarySummaryRowMarkup(contentMarkup = "") {
  return `
        <div class="i-summary-row">
          <div>
            ${contentMarkup}
          </div>
        </div>`;
}
