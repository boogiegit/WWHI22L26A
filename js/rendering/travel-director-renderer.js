function renderDirector() {
  const profileStats = [
    { value: "30", label: "Years on road" },
    { value: "10k+", label: "Guests" },
    { value: "95%", label: "Excellent ratings" }
  ];
  const aboutParagraphs = [
    host().profileIntro,
    host().profileStory,
    host().profileWelcome
  ].filter(Boolean);
  const profileHighlights = Array.isArray(host().profileHighlights) ? host().profileHighlights : [];
  return `
    ${renderHostAdminEditor()}
    <div class="director-hero-card">
      ${host().portraitUrl ? `<img class="director-hero-photo" src="${escapeHtml(host().portraitUrl)}" alt="${escapeHtml(displayName())}">` : ""}
      <div class="director-hero-content">
        <div class="director-hero-kicker">Travel Director · ${escapeHtml(tour.meta.brand || "Tour")}</div>
        <div class="director-hero-name">${escapeHtml(displayName())}</div>
        <div class="director-hero-years">30 years on the road</div>
        <div class="director-hero-region">Italy and all of Europe</div>
      </div>
      <div class="director-hero-actions">
        ${host().whatsAppUrl ? `<a class="director-hero-btn whatsapp" href="${escapeHtml(host().whatsAppUrl)}" target="_blank" rel="noopener">Message me</a>` : ""}
        ${host().phone ? `<a class="director-hero-btn" href="${escapeHtml(telHref(host().phone))}">Call me</a>` : ""}
        <a class="director-hero-btn website" href="https://brendonbush.com" target="_blank" rel="noopener">brendonbush.com</a>
      </div>
    </div>
    <div class="director-stats">
      ${profileStats.map((item) => `
        <div class="director-stat">
          <div class="director-stat-value">${escapeHtml(item.value || "")}</div>
          <div class="director-stat-label">${escapeHtml(item.label || "")}</div>
        </div>`).join("")}
    </div>
    <div class="director-card">
      <div class="director-body">
        <div class="director-card-kicker">About Brendon</div>
        <div class="director-card-title">${escapeHtml(host().profileTitle || "Europe changed my life. Now I get to share that properly.")}</div>
        <div class="director-copy-stack">
          ${aboutParagraphs.map((paragraph) => `<div class="copy">${escapeHtml(paragraph)}</div>`).join("")}
        </div>
        <div class="director-list">
          ${host().secondaryHost ? `<div class="director-list-item"><strong>Also on tour</strong>${escapeHtml(host().secondaryHostLabel || host().secondaryHost)}${host().secondaryHostBio ? `<span class="director-list-copy">${escapeHtml(host().secondaryHostBio)}</span>` : ""}</div>` : ""}
          <div class="director-list-item"><strong>Contact preference</strong>${escapeHtml(host().contactPreference || "WhatsApp for quick questions, call for urgent matters.")}</div>
          <div class="director-list-item"><strong>Tour operating brand</strong>${escapeHtml(tour.meta.brand || "Trafalgar")}${tour.meta.operatorLabel ? ` · ${escapeHtml(tour.meta.operatorLabel)}` : ""}</div>
        </div>
      </div>
    </div>
    ${profileHighlights.length ? `
      <div class="director-card">
        <div class="director-body">
          <div class="director-card-kicker">On The Road</div>
          <div class="director-card-title">${escapeHtml(host().profileHighlightsTitle || "The days I love most are the ones that feel local, personal and easy for guests to enjoy.")}</div>
          <div class="director-focus-list">
            ${profileHighlights.map((item) => `
              <div class="director-focus-item">
                <div class="director-focus-dot">•</div>
                <div class="director-focus-copy">
                  <strong>${escapeHtml(item.title || "")}</strong>
                  <div class="copy">${escapeHtml(item.copy || "")}</div>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </div>` : ""}
    <div class="sec-label">What Guests Say</div>
    ${DIRECTOR_TESTIMONIALS.map((item) => `
      <div class="director-card">
        <div class="director-body">
          <div class="director-card-kicker">Guest review</div>
          ${item.rating ? `<div class="review-stars">${escapeHtml(item.rating)}</div>` : ""}
          <div class="director-card-title review-quote-title">“${escapeHtml(item.quote)}”</div>
          <div class="copy">Source: ${escapeHtml(item.source)}</div>
        </div>
      </div>`).join("")}
    <div class="sec-label">About ${escapeHtml(tour.meta.brand || "the tour brand")}</div>
    <div class="director-card">
      <div class="director-body">
          <div class="director-card-kicker">${escapeHtml(tour.meta.brand || "Tour")}</div>
        <div class="director-card-title about-trafalgar-title">Guided travel with local knowledge, practical support and the right balance of structure and freedom.</div>
        ${brandAboutCopy().map((paragraph) => `<div class="copy" style="margin-top:10px">${escapeHtml(paragraph)}</div>`).join("")}
      </div>
    </div>
    <div class="full-spacer"></div>`;
}
