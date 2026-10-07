let toolRouteMap = null;
let toolRouteMapLayer = null;
let toolRouteUserMarker = null;
let toolRouteUserWatchId = null;
let toolRouteSelection = "all";

function buildRouteMapSegments() {
  const packageSegments = (tour?.days || []).map((day) => {
    const points = Array.isArray(day?.technical?.routeSegments)
      ? day.technical.routeSegments.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    if (!points.length) return null;
    return {
      id: String(day.number),
      label: `${points[points.length - 1]} (${day.number})`,
      title: `Day ${day.number} · ${day?.guest?.title || day?.technical?.routeTitle || points.join(" - ")}`,
      points
    };
  }).filter(Boolean);
  const sourceSegments = packageSegments.length ? packageSegments : TOOL_ROUTE_SEGMENTS;
  return sourceSegments.map((segment) => {
    const coords = segment.points.map(resolveRoutePoint).filter(Boolean);
    return { ...segment, coords };
  }).filter((segment) => segment.coords.length);
}

function renderRouteMapPanel(current, hotel) {
  const segments = buildRouteMapSegments();
  return `
    <div class="tool-stack">
      <div class="tool-card"><div class="tool-body"><div class="brief-hdr">Current route</div><div class="brief-lead">${escapeHtml(current.guest.title || current.technical.routeTitle)}</div><div class="tool-route-copy">${escapeHtml(routeLabel(current))}</div><div class="button-row">${hotel ? `<a class="button secondary" target="_blank" rel="noopener" href="${escapeHtml(mapUrlForQuery(hotel.address))}">Tonight's hotel</a>` : ""}${currentCity(current) ? `<a class="button secondary" target="_blank" rel="noopener" href="${escapeHtml(mapUrlForQuery(currentCity(current)))}">Current city</a>` : ""}</div></div></div>
      <div class="tool-card tool-route-map-wrap">
        <div class="tool-body">
          <div class="brief-hdr">Tour map</div>
          <div class="tool-route-copy">Follow the full ${escapeHtml(tour.meta.name || "tour")} route or jump to each travel day and coach stage.</div>
          <div class="button-row"><button class="button secondary" type="button" onclick="startRouteMapLocation(true)">Show my live location</button></div>
          <div class="tool-route-location-note" id="tool-route-location-note">Tap the button to show a red dot for your current position on the map.</div>
          <div class="tool-route-map-pills">
            <button class="map-pill ${toolRouteSelection === "all" ? "active" : ""}" onclick="setRouteMapSelection('all', this)" type="button">Full route</button>
            ${segments.map((segment) => `<button class="map-pill ${String(toolRouteSelection) === String(segment.id) ? "active" : ""}" onclick="setRouteMapSelection('${segment.id}', this)" type="button">${escapeHtml(segment.label)}</button>`).join("")}
          </div>
        </div>
        <div id="tool-route-map" class="tool-map-box tool-route-map"></div>
      </div>
      <div class="tool-route-list">${tour.hotels.map((item) => `<div class="tool-route-item"><div class="tool-route-body"><div class="tool-meta"><span class="pill">Day ${item.arrivalDay}</span><span class="pill">${escapeHtml(item.city)}</span></div><div class="tool-title">${escapeHtml(item.name)}</div><div class="copy">${escapeHtml(item.address)}</div><div class="button-row"><a class="button secondary" target="_blank" rel="noopener" href="${escapeHtml(mapUrlForQuery(item.address))}">Open map</a></div></div></div>`).join("")}</div>
    </div>`;
}

async function fetchRoadRoute(coords) {
  const points = coords.map(([lat, lon]) => `${lon},${lat}`).join(";");
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=geojson`);
    const json = await response.json();
    if (json.code === "Ok" && json.routes?.[0]?.geometry?.coordinates) {
      return json.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    }
  } catch (error) {}
  return null;
}

async function loadRouteMapTool() {
  const mapEl = document.getElementById("tool-route-map");
  if (!mapEl || !window.L) return;
  const segments = buildRouteMapSegments();
  if (!segments.length) return;
  if (toolRouteMap && toolRouteMap.getContainer && toolRouteMap.getContainer() !== mapEl) {
    toolRouteMap.remove();
    toolRouteMap = null;
    toolRouteMapLayer = null;
    toolRouteUserMarker = null;
  }
  if (!toolRouteMap) {
    toolRouteMap = L.map(mapEl, { zoomControl: true }).setView(segments[0].coords[0], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19
    }).addTo(toolRouteMap);
    toolRouteMapLayer = L.layerGroup().addTo(toolRouteMap);
  } else {
    toolRouteMap.invalidateSize();
  }
  await drawTraditionalRouteMap(toolRouteSelection);
}

function updateRouteLocationNote(message) {
  const note = document.getElementById("tool-route-location-note");
  if (note) note.textContent = message;
}

function updateRouteUserLocation(position) {
  if (!toolRouteMap || !window.L || !position?.coords) return;
  const coords = [position.coords.latitude, position.coords.longitude];
  const accuracy = Math.round(position.coords.accuracy || 0);
  const icon = L.divIcon({ className: "", html: '<div class="route-user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  if (!toolRouteUserMarker) {
    toolRouteUserMarker = L.marker(coords, { icon, zIndexOffset: 1000 }).addTo(toolRouteMap);
  } else {
    toolRouteUserMarker.setLatLng(coords);
  }
  toolRouteUserMarker.bindPopup(`<strong>You are here</strong>${accuracy ? `<br><span style="font-size:12px;color:#666">Approx. ${accuracy}m accuracy</span>` : ""}`);
  updateRouteLocationNote("Live location is on: look for the red dot on the map.");
}

function startRouteMapLocation(forcePrompt = false) {
  if (!navigator.geolocation || !toolRouteMap) {
    updateRouteLocationNote("Live location is not available in this browser.");
    return;
  }
  if (toolRouteUserWatchId !== null) return;
  const onError = (error) => {
    if (forcePrompt) updateRouteLocationNote(error?.code === 1 ? "Location permission was not allowed. Turn it on in your browser settings to show the red dot." : "Could not get your live location right now.");
  };
  toolRouteUserWatchId = navigator.geolocation.watchPosition(updateRouteUserLocation, onError, {
    enableHighAccuracy: true,
    maximumAge: 15000,
    timeout: forcePrompt ? 15000 : 5000
  });
}

function setRouteMapSelection(value, element) {
  toolRouteSelection = value;
  document.querySelectorAll(".tool-route-map-pills .map-pill").forEach((pill) => pill.classList.remove("active"));
  if (element) element.classList.add("active");
  drawTraditionalRouteMap(value);
}

async function drawTraditionalRouteMap(selection) {
  if (!toolRouteMap || !toolRouteMapLayer) return;
  const segments = buildRouteMapSegments();
  if (!segments.length) return;
  toolRouteMapLayer.clearLayers();
  const activeSegments = selection === "all" ? segments : segments.filter((segment) => String(segment.id) === String(selection));
  const focusSegments = activeSegments.length ? activeSegments : segments;
  const routeCoords = (selection === "all"
    ? focusSegments.flatMap((segment) => segment.coords)
    : focusSegments[0].coords
  ).filter((coords, index, list) => index === 0 || coords[0] !== list[index - 1][0] || coords[1] !== list[index - 1][1]);
  if (routeCoords.length > 1) {
    const roadCoords = selection === "all" ? null : await fetchRoadRoute(routeCoords);
    L.polyline(roadCoords || routeCoords, {
      color: "#ce1126",
      weight: selection === "all" ? 3 : 4,
      opacity: 0.82,
      dashArray: selection === "all" ? "8,6" : null
    }).addTo(toolRouteMapLayer);
  }
  const selectedRoute = focusSegments[0];
  routeCoords.forEach((coords, index) => {
    const isFirst = index === 0;
    const isLast = index === routeCoords.length - 1;
    const marker = L.circleMarker(coords, {
      radius: selection === "all" ? (isLast ? 7 : 5) : (isFirst || isLast ? 8 : 5),
      color: "#ce1126",
      weight: 3,
      fillColor: isLast || selection !== "all" ? "#ce1126" : "#ffffff",
      fillOpacity: 1
    }).addTo(toolRouteMapLayer);
    const pointLabel = selectedRoute?.points?.[index] || "";
    if (pointLabel) {
      marker.bindPopup(`<strong>${escapeHtml(pointLabel)}</strong>${selection === "all" ? "" : `<br><span style="font-size:12px;color:#666">${escapeHtml(selectedRoute.title)}</span>`}`);
    }
  });
  if (routeCoords.length > 1) {
    toolRouteMap.fitBounds(L.latLngBounds(routeCoords), { padding: [28, 28], maxZoom: selection === "all" ? 6 : 9 });
  } else if (routeCoords[0]) {
    toolRouteMap.setView(routeCoords[0], 9);
  }
}
