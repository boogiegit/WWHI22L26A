function renderTravelImpact() {
  return `
    <div class="prog-hero prog-hero--overlay prog-hero--impact">
      <img class="prog-hero-img" src="https://sasharojnik.com/images/venice-murano-mtm.jpg" alt="Make Travel Matter">
      <div class="prog-hero-copy">
        <div class="prog-overline">${escapeHtml(tour.meta.brand || "Tour")} · ${escapeHtml(`${tour.meta.name || "Tour"} ${tour.meta.year || ""}`.trim())}</div>
        <div class="prog-hero-title">Make<br>Travel<br>Matter®</div>
        <div class="prog-hero-sub">Responsible travel, real people, and the places on this tour where your visit leaves something positive behind.</div>
      </div>
    </div>
    <div class="mtm-panel-card">
      <div class="mtm-panel-kicker">What is Make Travel Matter®?</div>
      <p class="mtm-panel-copy">Make Travel Matter® Experiences are conscious travel experiences available across The Travel Corporation's family of brands. Each experience is chosen for the <strong style="color:var(--text)">positive social or environmental impact</strong> it has on its community. Using a proprietary assessment tool developed exclusively for TTC, every experience is assessed against criteria directly tied to the <strong style="color:var(--text)">UN Global Goals for Sustainable Development.</strong></p>
      <a href="https://ttc.com/mtm-experiences/" target="_blank" class="mtm-panel-link">Learn more at TTC.com</a>
    </div>
    <div class="mtm-story">
      <div class="mtm-story-kicker">Make Travel Matter® Experience · Day 7</div>
      <div class="mtm-story-title">Glassblowing on Murano · CAM</div>
      <div class="mtm-story-body">In 1291, the Doge of Venice ordered every furnace moved from the city to the island of Murano — to protect Venice's wooden buildings from fire. Isolated on the island, the master glassblowers spent centuries refining secret mineral recipes that remain unrivalled. The techniques are still passed from father to son, apprentice to master, in workshops that haven't fundamentally changed since the Renaissance.</div>
      <div class="mtm-story-body">That tradition is now under threat from cheap imported imitations sold across Venice. <strong style="color:var(--text)">Our visit to CAM directly supports the authentic artisans.</strong> When you carry a piece of Murano glass home, you aren't buying a souvenir — you're helping keep a living craft alive.</div>
    </div>
    <div class="sec-label" style="padding-top:8px">How we Make Travel Matter on this tour</div>
    <div class="mtm-story">
      <div class="mtm-story-kicker">Family Business</div>
      <div class="mtm-story-title">Mario &amp; Michele — the Fishermen of Burano</div>
      <div class="mtm-story-body">Our dinner on Burano is not at a tourist restaurant. Mario and Michele are our family fishermen — their catch, their restaurant, their island. The Lagoon Cruise to Burano directly supports a small family business on one of the most beautiful and overlooked corners of the Venetian lagoon.</div>
    </div>
    <div class="mtm-story">
      <div class="mtm-story-kicker">Local Expertise</div>
      <div class="mtm-story-title">Local Specialists — Born in the City</div>
      <div class="mtm-story-body">Every Local Specialist on this tour — in Rome, Florence, Venice, Lucerne and Paris — is a resident or expert of the place they guide. Your booking supports people who have spent their lives learning and sharing the history of where they live.</div>
    </div>
    <div class="mtm-story mtm-story--brand">
      <div class="mtm-story-kicker">The Travel Corporation</div>
      <div class="mtm-story-title">A wider commitment to responsible travel</div>
      <div class="mtm-story-body">Make Travel Matter® is part of TTC's global commitment to responsible travel across all its brands — from Trafalgar to Insight Vacations, Contiki to Uniworld. Every experience is assessed against the UN Global Goals.</div>
      <a href="https://ttc.com/mtm-experiences/" target="_blank" class="mtm-story-link">Explore Make Travel Matter® at TTC.com</a>
    </div>
    <div class="full-spacer"></div>
  `;
}
