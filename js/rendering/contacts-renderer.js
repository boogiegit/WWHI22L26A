function renderContacts() {
  const website = (tour.contacts.specialLinks || []).find((item) => item.url);
  const personalWebsiteUrl = website?.url || "https://brendonbush.com";
  const personalWebsiteLabel = "brendonbush.com";
  return `
    <div class="contacts-hero">
      ${hostPortraitMarkup("contacts-hero-avatar")}
      <div class="contacts-hero-name">${escapeHtml(displayName())}</div>
      <div class="contacts-hero-role">${escapeHtml(host().roleLabel || "Travel Director")} · ${escapeHtml(tour.meta.brand || "Trafalgar")}</div>
      <div class="contacts-hero-tour">${escapeHtml(`${tour.meta.name} ${tour.meta.year || ""}`)}</div>
    </div>
    <div class="contacts-actions">
      ${host().whatsAppUrl ? `
        <a class="contact-quick whatsapp" href="${escapeHtml(host().whatsAppUrl)}" target="_blank" rel="noopener">
          <span class="contact-quick-icon">W</span>
          <span class="contact-quick-label">WhatsApp</span>
          <span class="contact-quick-sub">Message Brendon directly during the tour</span>
        </a>` : ""}
      ${host().phone ? `
        <a class="contact-quick call" href="${escapeHtml(telHref(host().phone))}">
          <span class="contact-quick-icon">☎</span>
          <span class="contact-quick-label">Call</span>
          <span class="contact-quick-sub">Direct number for urgent contact</span>
        </a>` : ""}
      ${host().email ? `
        <a class="contact-quick" href="${escapeHtml(host().email)}">
          <span class="contact-quick-label">Email</span>
          <span class="contact-quick-sub">${escapeHtml(host().emailLabel || host().email.replace(/^mailto:/, ""))}</span>
        </a>` : ""}
      <a class="contact-quick website" href="${escapeHtml(personalWebsiteUrl)}" target="_blank" rel="noopener">
        <span class="contact-quick-icon">↗</span>
        <span class="contact-quick-label">Website</span>
        <span class="contact-quick-sub">${escapeHtml(personalWebsiteLabel)}</span>
      </a>
    </div>
    <div class="sec-label">Contact Details</div>
    <div class="contact-group">
      ${host().whatsAppUrl ? `
        <a class="contact-info-row" href="${escapeHtml(host().whatsAppUrl)}" target="_blank" rel="noopener">
          <div class="contact-info-badge whatsapp">W</div>
          <div class="contact-info-meta">
            <div class="contact-info-label">WhatsApp</div>
            <div class="contact-info-value">${escapeHtml(normalizePhone(host().phone) || "Open chat")}</div>
            <div class="contact-info-sub">The fastest way to reach Brendon during the tour</div>
          </div>
          <div class="contact-info-trailing">Open</div>
        </a>` : ""}
      ${host().phone ? `
        <a class="contact-info-row" href="${escapeHtml(telHref(host().phone))}">
          <div class="contact-info-badge phone">☎</div>
          <div class="contact-info-meta">
            <div class="contact-info-label">Mobile</div>
            <div class="contact-info-value">${escapeHtml(normalizePhone(host().phone))}</div>
            <div class="contact-info-sub">Call directly if you need a quicker reply</div>
          </div>
          <div class="contact-info-trailing">Call</div>
        </a>` : ""}
      ${host().email ? `
        <a class="contact-info-row" href="${escapeHtml(host().email)}">
          <div class="contact-info-badge mail">✉</div>
          <div class="contact-info-meta">
            <div class="contact-info-label">Email</div>
            <div class="contact-info-value">${escapeHtml(host().emailLabel || host().email.replace(/^mailto:/, ""))}</div>
            <div class="contact-info-sub">Useful when you need something written down</div>
          </div>
          <div class="contact-info-trailing">Email</div>
        </a>` : ""}
      ${website ? `
        <a class="contact-info-row" href="${escapeHtml(website.url)}" target="_blank" rel="noopener">
          <div class="contact-info-badge web">↗</div>
          <div class="contact-info-meta">
            <div class="contact-info-label">${escapeHtml(website.label || "Website")}</div>
            <div class="contact-info-value">${escapeHtml(website.url)}</div>
            <div class="contact-info-sub">Tour-specific link</div>
          </div>
          <div class="contact-info-trailing">Visit</div>
        </a>` : ""}
    </div>
    <div class="contact-note">${escapeHtml(host().contactPreference || "For most tour questions, WhatsApp is usually the fastest way to get a reply.")}</div>
    <div class="sec-label">Hotels - All Nights</div>
    <div class="contact-grid">
      ${tour.hotels.map((hotel) => `
        <div class="hotel-card">
          <div class="hotel-hdr">
            <div class="hotel-icon">🛏</div>
            <div class="hotel-copy">
              <div class="hotel-badge">${escapeHtml(hotel.city)} · Day ${hotel.arrivalDay} · ${escapeHtml(formatArrivalDate(hotel.arrivalDate))}</div>
              <div class="hotel-name">${escapeHtml(hotel.name)}</div>
              <div class="hotel-addr">${escapeHtml(hotel.address)}</div>
              ${hotel.phone ? `<div class="hotel-addr" style="margin-top:6px">${escapeHtml(normalizePhone(hotel.phone))}</div>` : ""}
            </div>
          </div>
          <div class="hotel-actions">
            ${hotel.phone ? `<a class="hotel-action" href="${escapeHtml(telHref(hotel.phone))}">☎ Call</a>` : ""}
            <a class="hotel-action primary" href="${escapeHtml(mapUrlForQuery(`${hotel.name} ${hotel.address}`))}" target="_blank" rel="noopener">↱ Directions</a>
          </div>
        </div>`).join("")}
    </div>
    <div class="sec-label">Guest Services & Emergency</div>
    <div class="emerg-card">
      <div class="emerg-country">${escapeHtml(tour.meta.brand || "Tour")} Guest Services</div>
      <div class="emerg-row">
        <span class="emerg-svc">European Guest Services</span>
        <a class="emerg-num" href="tel:+442076208900">+44 207 620 8900</a>
      </div>
    </div>
    <div class="emerg-card">
      <div class="emerg-country">Europe - Emergency Numbers</div>
      <div class="emerg-row">
        <span class="emerg-svc">Emergency</span>
        <a class="emerg-num" href="tel:112">112</a>
      </div>
      <div class="emerg-row">
        <span class="emerg-svc">Police</span>
        <a class="emerg-num" href="tel:113">113</a>
      </div>
      <div class="emerg-row">
        <span class="emerg-svc">Ambulance</span>
        <a class="emerg-num" href="tel:118">118</a>
      </div>
      <div class="emerg-row">
        <span class="emerg-svc">Fire</span>
        <a class="emerg-num" href="tel:115">115</a>
      </div>
    </div>
    <div class="full-spacer"></div>`;
}
