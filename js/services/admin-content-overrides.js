function applyDayContent(day, config) {
  if (!day || !config) return;
  day.guest = day.guest || {};
  day.technical = day.technical || {};
  if (config.title != null) day.guest.title = String(config.title);
  if (config.narrative != null) day.guest.narrative = String(config.narrative);
  if (Array.isArray(config.meals)) day.guest.meals = config.meals.filter(Boolean);
  if (config.routeTitle != null) day.technical.routeTitle = String(config.routeTitle);
  if (Array.isArray(config.routeSegments)) day.technical.routeSegments = config.routeSegments.filter(Boolean);
  if (Array.isArray(config.schedule)) {
    const existingSchedule = Array.isArray(day.schedule) ? day.schedule : [];
    day.schedule = config.schedule.map((item, index) => {
      const existing = existingSchedule[index] || {};
      return {
        time: item.time || "",
        title: item.title || "",
        plainNote: item.plainNote == null ? (existing.plainNote || "") : item.plainNote,
        note: item.note || "",
        alertNote: item.alertNote == null ? (existing.alertNote || "") : item.alertNote,
        infoBox: item.infoBox == null ? (existing.infoBox || "") : item.infoBox,
        kind: item.kind === "optional" ? "optional" : "included",
        hideKindChip: item.hideKindChip == null ? !!existing.hideKindChip : !!item.hideKindChip,
        showMyMap: item.showMyMap == null ? !!existing.showMyMap : !!item.showMyMap,
        myMapUrl: item.myMapUrl == null ? (existing.myMapUrl || "") : item.myMapUrl,
        myMapLabel: item.myMapLabel == null ? (existing.myMapLabel || "") : item.myMapLabel,
        meetingPoint: item.meetingPoint == null ? (existing.meetingPoint || null) : item.meetingPoint,
        disableMeetingPoint: item.disableMeetingPoint == null ? !!existing.disableMeetingPoint : !!item.disableMeetingPoint
      };
    }).filter((item) => item.time || item.title || item.plainNote || item.note || item.alertNote || item.infoBox);
  }
}

function applyOptionalContent(optional, config) {
  if (!optional || !config) return;
  if (config.description != null) optional.description = String(config.description);
  if (config.imageUrl != null) optional.imageUrl = String(config.imageUrl);
  if (config.price && typeof config.price === "object") {
    optional.price = {
      currency: config.price.currency || optional.price?.currency || "€",
      amount: config.price.amount === "" || config.price.amount == null ? optional.price?.amount : Number(config.price.amount)
    };
  }
}

function applyHostContent(config) {
  if (!config) return;
  tour.hostDefaults = tour.hostDefaults || {};
  if (config.secondaryHost != null) tour.hostDefaults.secondaryHost = String(config.secondaryHost);
  if (config.secondaryHostLabel != null) tour.hostDefaults.secondaryHostLabel = String(config.secondaryHostLabel);
  if (config.secondaryHostBio != null) tour.hostDefaults.secondaryHostBio = String(config.secondaryHostBio);
}

function applyAdminContentOverrides() {
  applyHostContent(getHostContentConfig());
  (tour.days || []).forEach((day) => {
    applyDayContent(day, getDayContentConfig(day.number));
    applyOctoberScheduleUpdates(day, getDayContentConfig(day.number)?.scheduleRevision);
    (day.optionals || []).forEach((optional) => {
      applyOptionalContent(optional, getOptionalContentConfig(optional.title));
      if (optional.experienceId==='piazzas-and-fountains-of-rome' && getOptionalContentConfig(optional.title)?.contentRevision!=='20261002-details' && optional.price?.amount===55) optional.price.amount=57;
    });
  });
}
