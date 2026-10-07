function renderWelcomeLinksCard() {
  return `
    <section class="welcome-links-card">
      <div class="welcome-links-kicker">Start Here</div>
      <div class="welcome-links-copy">The welcome screen has the Tell me about yourself questions, the WhatsApp community link, and tour start details.</div>
      <button class="welcome-link-btn" type="button" onclick="openIntroLauncher()">Reopen welcome screen</button>
    </section>`;
}

function renderDayOneSafetyCard() {
  return `
    <section class="safety-card">
      <div class="safety-kicker">Day 1 Safety</div>
      <div class="safety-title">Coach Safety</div>
      <div class="safety-copy">Watch the coach safety video and keep the TTC safety card available on your phone.</div>
    <a class="safety-video-link" href="https://youtu.be/mvRVGluqxHo?si=UMdRCeL6J5OpHypb" target="_blank" rel="noopener">
      <span class="safety-icon" aria-hidden="true"><span class="material-symbols-outlined">play_circle</span></span>
      <span>
        <span class="safety-media-title">Watch Safety Video</span>
        <span class="safety-doc-sub">Opens the coach safety video on YouTube.</span>
      </span>
    </a>
      <button class="safety-doc-link" type="button" onclick="return openDocumentViewer('assets/safety/ttc-safety-card-trafalgar-phone-v2.pdf', 'TTC Safety Card')">
        <span class="safety-icon" aria-hidden="true"><span class="material-symbols-outlined">picture_as_pdf</span></span>
        <span>
          <span class="safety-doc-title">Safety Card</span>
          <span class="safety-doc-sub">Open the TTC safety card PDF.</span>
        </span>
      </button>
    </section>`;
}

function renderTodayActionItem({ tone = "", label = "Action", title = "", sub = "", buttons = "" }) {
  return `
    <div class="today-action-item ${escapeHtml(tone)}">
      <div class="today-action-label">${escapeHtml(label)}</div>
      <div>
        <div class="today-action-title">${escapeHtml(title)}</div>
        ${sub ? `<div class="today-action-sub">${escapeHtml(sub)}</div>` : ""}
      </div>
      ${buttons ? `<div class="today-action-buttons">${buttons}</div>` : ""}
    </div>`;
}

function renderTodayNotes(day, note) {
  const items = [];
  if (note) {
    items.push(`
      <div class="brief-note">
        <div class="brief-note-title">Travel Director note</div>
        <div class="brief-note-body">${escapeHtml(note)}</div>
      </div>`);
  }
  todayBriefState(day).reminders.forEach((item) => {
    items.push(`
      <div class="brief-note ${escapeHtml(item.tone || "")}">
        <div class="brief-note-title">${escapeHtml(item.title)}</div>
        <div class="brief-note-body">${escapeHtml(item.body)}</div>
      </div>`);
  });
  return items.length ? `<div class="brief-notes">${items.join("")}</div>` : "";
}

function afterScheduleReminderCard(day) {
  if (!day || !day.afterScheduleReminder) return "";
  return `
    <section class="today-reminder-card">
      <div class="today-reminder-title">${escapeHtml(day.afterScheduleReminder.title || "Reminder")}</div>
      <div class="today-reminder-body">${escapeHtml(day.afterScheduleReminder.body || "")}</div>
    </section>`;
}
