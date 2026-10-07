let activeDocumentViewer = null;

function openDocumentViewer(url, title = "Coach Seating") {
  if (!url) return false;
  if (typeof trackAnalytics === "function") trackAnalytics('document:open');
  const resolvedUrl = resourceHref(url);
  const isImage = /\.(png|jpe?g|webp|gif|avif)($|\?)/i.test(resolvedUrl);
  activeDocumentViewer = {
    url: resolvedUrl,
    kind: isImage ? "image" : "document",
    title
  };
  renderApp();
  return false;
}

function closeDocumentViewer() {
  if (!activeDocumentViewer) return;
  activeDocumentViewer = null;
  renderApp();
}

function renderDocumentViewer() {
  if (!activeDocumentViewer?.url) return "";
  const isImage = activeDocumentViewer.kind === "image";
  return `
    <div class="doc-viewer-overlay open" onclick="if (event.target === this) closeDocumentViewer()">
      <div class="doc-viewer">
        <div class="doc-viewer-hdr">
          <div class="doc-viewer-meta">
            <div class="doc-viewer-kicker">Seating plan</div>
            <div class="doc-viewer-title">${escapeHtml(activeDocumentViewer.title || "Coach Seating")}</div>
          </div>
          <div class="doc-viewer-actions">
            ${isImage ? "" : `<a class="doc-viewer-link" href="${escapeHtml(activeDocumentViewer.url)}" target="_blank" rel="noopener">Open PDF</a>`}
            <button class="doc-viewer-close" type="button" onclick="closeDocumentViewer()">Back</button>
          </div>
        </div>
        <div class="doc-viewer-body">
          ${isImage ? `
            <div class="doc-viewer-image-wrap">
              <img class="doc-viewer-image" src="${escapeHtml(activeDocumentViewer.url)}" alt="${escapeHtml(activeDocumentViewer.title || "Coach Seating")}" loading="lazy">
            </div>` : `
            <div class="doc-viewer-frame-wrap">
              <iframe class="doc-viewer-frame" src="${escapeHtml(activeDocumentViewer.url)}#toolbar=0&navpanes=0&view=FitH" title="${escapeHtml(activeDocumentViewer.title || "Coach Seating")}" loading="lazy"></iframe>
            </div>`}
        </div>
      </div>
    </div>`;
}
