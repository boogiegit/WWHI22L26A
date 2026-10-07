function traditionalEuropeExperiences() {
  const locationOverrides = {
    "mount stanserhorn": "Lucerne",
    "gondolas and grand canal": "Venice",
    "lagoon cruise to burano with lunch": "Venice",
    "florence's renaissance treasures": "Florence"
  };
  function experienceLocationLabel(location) {
    return String(location || "")
      .replace(/^Venezia Mestre$/i, "Venice")
      .replace(/^Paris\s*\/\s*La D[eé]fense$/i, "Paris");
  }
  function experienceDisplayTitle(title, location) {
    const rawTitle = String(title || "").trim();
    const rawLocation = String(location || "").trim();
    const match = rawTitle.match(/^(.+?)\s+-\s+(.+)$/);
    if (!match || !rawLocation) return rawTitle;
    const prefix = match[1].trim().toLowerCase();
    const locationParts = rawLocation
      .split(/\s*\/\s*|\s*,\s*/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    return locationParts.includes(prefix) ? match[2].trim() : rawTitle;
  }
  function experiencePriceLabel(optional) {
    return formatPrice(optional)
      .replace(/^€\s*/, "€")
      .replace(/^EUR\s*/i, "€")
      .replace(/^CHF\s*/i, "CHF ")
      .trim();
  }
  const seen = new Map();
  (tour.days || []).forEach((day) => {
    (day.optionals || []).forEach((optional) => {
      const key = String(optional.title || "").toLowerCase();
      if (key === "lake cruise") return;
      const location = locationOverrides[key] || currentCity(day) || day.technical?.routeTitle || tour.meta.name;
      if (!seen.has(key)) {
        seen.set(key, {
          location: experienceLocationLabel(location),
          price: experiencePriceLabel(optional),
          title: optional.title,
          displayTitle: experienceDisplayTitle(optional.title, experienceLocationLabel(location)),
          imageUrl: getOptionalImage(optional.title) || defaultOptionalImage(optional),
          description: normalizeOptionalDescription(optional.description || "")
        });
      }
    });
  });
  return Array.from(seen.values());
}

function renderExperiences() {
  const experiences = traditionalEuropeExperiences();
  const firstImage = experiences[0]?.imageUrl || 'https://brendonbush.com/images/seinecruiseandparisicons.jpg';
  return `
    <div class="prog-hero prog-hero--overlay prog-hero--experiences">
      ${firstImage ? `<img class="prog-hero-img" src="${firstImage}" alt="${escapeHtml(tour.meta.name)} experiences">` : ""}
      <div class="prog-hero-copy">
        <div class="prog-overline">Experiences</div>
        <div class="prog-hero-title">Make the<br>Magnificent<br>Happen.</div>
        <div class="prog-hero-sub">The experiences that turn ${escapeHtml(tour.meta.name || "this tour")} into the journey guests talk about for years.</div>
      </div>
    </div>
    <div class="prog-intro-card">
      <div class="prog-overline">Experiences</div>
      <div class="prog-intro-title">Make the Magnificent Happen</div>
      <div class="prog-intro-divider"></div>
      <div class="prog-intro-text">A great tour is about more than just the places you visit—it is about the connections you make and the moments that stay with you forever. Our Experiences are the essential extras that transform a normal trip into a magnificent one.</div>
      <div class="prog-intro-text">Imagine standing above Lucerne on Mount Pilatus, gliding through Venice on the Gondolas and Grand Canal, crossing the lagoon to colourful Burano, or seeing the sparkle of Paris by night. These are the experiences our guests talk about for years to come. Don't just see the world; immerse yourself in it.</div>
      <div class="experience-discount-note"><span class="material-symbols-outlined">family_restroom</span><span>Children 15 and under receive 25% off all experiences.</span></div>
      <div class="booking-note-inline"><strong>Ready to join?</strong> Confirm with your Travel Director on tour and pay by cash or card according to the normal ${escapeHtml(tour.meta.brand || "tour")} process.</div>
      ${builderReviewAddExperienceButton(dayByNumber(displayDayNumber()))}
    </div>
    <div class="exp-grid">
      ${experiences.map((experience) => `
        <div class="exp-card">
          <div class="exp-img-wrap${/versailles/i.test(experience.title || "") ? " exp-img-wrap--versailles" : ""}">
            <img class="${/mount pilatus/i.test(experience.title || "") ? "exp-img mount-pilatus-img" : "exp-img"}" src="${escapeHtml(experience.imageUrl)}" alt="${escapeHtml(experience.title)}" ${imageFallbackAttr(defaultOptionalImage(findOptionalByTitle(experience.title)))}>
            <div class="exp-overlay"></div>
            <div class="exp-meta-top">
              <span class="exp-meta-pill">${escapeHtml(experience.location)}</span>
              <span class="exp-meta-pill exp-price-pill">${escapeHtml(experience.price)}</span>
            </div>
            <div class="exp-img-title">${escapeHtml(experience.displayTitle || experience.title)}</div>
          </div>
          <div class="exp-body">
            <div class="exp-desc">${escapeHtml(experience.description)}</div>
          </div>
          ${builderReviewExperienceControlsByTitle(experience.title)}
          ${renderExperienceAdminEditor(findOptionalByTitle(experience.title))}
        </div>
      `).join("")}
    </div>
    <div class="full-spacer"></div>`;
}
