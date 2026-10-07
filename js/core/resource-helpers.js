function seatingPlanVariants(url) {
  if (!url) return [];
  const set = new Set();
  const push = (value) => { if (value) set.add(value); };
  push(url);
  push(url.replace(/seating-plans/g, 'seating plans'));
  push(url.replace(/seating plans/g, 'seating-plans'));
  push(url.replace(/-/g, ' '));
  push(url.replace(/ /g, '-'));
  push(url.replace(/seating-plans/g, 'seating plans').replace(/-/g, ' '));
  push(url.replace(/seating plans/g, 'seating-plans').replace(/ /g, '-'));
  return Array.from(set);
}

function resourceHref(url) {
  try {
    return new URL(url, location.href).href;
  } catch (error) {
    return url || "";
  }
}

function normalizeResourceInputUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|mailto:|tel:|\.?\/)/i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) return `https://${raw}`;
  return raw;
}

function resourceDomain(url) {
  try {
    return new URL(resourceHref(url)).hostname.replace(/^www\./, "");
  } catch (error) {
    return "Document";
  }
}

function titleFromUrl(url) {
  const domain = resourceDomain(url);
  try {
    const path = new URL(resourceHref(url)).pathname.split("/").filter(Boolean).pop() || domain;
    return decodeURIComponent(path).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || domain;
  } catch (error) {
    return domain;
  }
}

function fallbackPreviewForResource(url, kind = "link") {
  const domain = resourceDomain(url);
  return {
    title: kind === "document" ? titleFromUrl(url) : domain,
    description: "",
    image: "",
    publisher: domain
  };
}
