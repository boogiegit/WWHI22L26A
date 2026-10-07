function renderRewards() {
  const registerUrl = "https://form.jotform.com/243476608710156";
  return `
    <div class="rewards-screen">
      <div class="gtr-showcase">
        <div class="director-card-kicker">Travel Again · Global Tour Rewards</div>
        <div class="gtr-lead">Your next adventure awaits you with <span class="gold">Global Tour Rewards</span>.</div>
        <div class="gtr-copy">You are already a Global Tour Rewards member, with ongoing savings and guest benefits. While you are on tour, you can also register interest for an extra limited-time benefit on a future booking: if you reserve within 15 days, you can also receive a <strong>$100 voucher</strong> towards experiences, on top of the rest.</div>
        <div class="gtr-metric-grid">
          <div class="gtr-metric"><div class="gtr-metric-value">5%</div><div class="gtr-metric-label">Future tour saving</div></div>
          <div class="gtr-metric"><div class="gtr-metric-value">$100 Voucher</div><div class="gtr-metric-label">Towards experiences</div></div>
          <div class="gtr-metric"><div class="gtr-metric-value">Luxury Gold</div><div class="gtr-metric-label">Free hotel night</div></div>
          <div class="gtr-metric"><div class="gtr-metric-value">12 Months</div><div class="gtr-metric-label">To choose later</div></div>
        </div>
        <div class="gtr-15d">
          <div class="gtr-15d-badge">15D</div>
          <div class="gtr-15d-copy"><strong>Once your new reservation is made</strong>, pay the fully flexible deposit within 15 days to keep the extra on-tour benefit, including the $100 choice-experiences voucher. If not, the bonus is lost.</div>
        </div>
        <div class="gtr-cta-stack">
          <a class="button primary gtr-button" href="${registerUrl}" target="_blank" rel="noopener">Register Interest ↗</a>
          <a class="button secondary gtr-button" href="https://trafalgar.sjv.io/POgrj6" target="_blank" rel="noopener">Explore Future Trips ↗</a>
        </div>
        <div class="gtr-footnote">Register interest on tour, then pay the fully flexible deposit within 15 days once your reservation is made. That keeps the extra on-tour benefit, including the $100 voucher towards experiences.</div>
      </div>
      <div class="gtr-subpanel">
        <div class="director-card-kicker">Global Tour Rewards Program</div>
        <div class="gtr-subtitle">Your <em>exclusive member perks</em></div>
        <div class="gtr-subcopy">Everyone who travels with us is automatically enrolled in Global Tour Rewards. Access exclusive benefits across guided touring brands, with flexible deposits, member pricing and extra on-tour bonuses.</div>
        <div class="gtr-perks-grid">
          <div class="gtr-perk"><div class="gtr-perk-title">Members-only pricing</div><div class="gtr-perk-copy">Extra discount on guided tours</div></div>
          <div class="gtr-perk"><div class="gtr-perk-title">Worldwide access</div><div class="gtr-perk-copy">Tours across the TTC family</div></div>
          <div class="gtr-perk"><div class="gtr-perk-title">Priority first look</div><div class="gtr-perk-copy">New tours and special offers first</div></div>
          <div class="gtr-perk"><div class="gtr-perk-title">Flexible deposit</div><div class="gtr-perk-copy">15 days to lock it in · 12 months to choose</div></div>
        </div>
      </div>
      <div class="sec-label">Bushy's Recommended Trips</div>
      <div class="trip-feature-grid">
        ${DIRECTOR_RECOMMENDATIONS.map((item) => `
          <div class="trip-feature-card">
            <div class="trip-feature-image">
              <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" onerror="this.remove()">
              <div class="trip-feature-label">${escapeHtml(item.detail)}</div>
            </div>
            <div class="trip-feature-body">
              <div class="trip-feature-title">${escapeHtml(item.title)}</div>
              <div class="trip-feature-copy">${escapeHtml(item.copy)}</div>
              <div class="trip-feature-actions">
                ${item.viewUrl ? `<a class="button secondary" href="${escapeHtml(item.viewUrl)}" target="_blank" rel="noopener">View Trip</a>` : ""}
                ${item.videoUrl ? `<a class="button secondary video" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener">See Video</a>` : ""}
                ${item.bookUrl ? `<a class="button primary" href="${escapeHtml(item.bookUrl)}" target="_blank" rel="noopener">Book Now</a>` : ""}
              </div>
            </div>
          </div>`).join("")}
      </div>
      <div class="sec-label">What Guests Say</div>
      ${DIRECTOR_TESTIMONIALS.map((item) => `
        <div class="director-card">
          <div class="director-body">
            <div class="director-card-kicker">Guest review</div>
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
      <div class="full-spacer"></div>
    </div>`;
}
