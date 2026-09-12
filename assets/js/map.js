/* Leaflet map: clustered, color-coded incident markers with popups. */

const MapView = {
  map: null,
  clusterGroup: null,
  markersById: new Map(),

  init() {
    this.map = L.map("map", { scrollWheelZoom: true }).setView([20.7, -157.0], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(this.map);

    this.clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (cluster) => {
        const pal = currentPalette();
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background:${pal.categorical[0]};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${count}</div>`,
          className: "shark-cluster-icon",
          iconSize: [34, 34],
        });
      },
    });
    this.map.addLayer(this.clusterGroup);
  },

  render(records) {
    this.clusterGroup.clearLayers();
    this.markersById.clear();
    records.forEach((r) => {
      if (r.lat === null || r.lon === null || r.lat === undefined || r.lon === undefined) return;
      const color = outcomeColor(r.outcome);
      const marker = L.circleMarker([r.lat, r.lon], {
        radius: 8,
        weight: 2,
        color: "#ffffff",
        fillColor: color,
        fillOpacity: 0.95,
      });
      marker.bindPopup(this._popupHtml(r));
      marker.recordId = r.id;
      this.markersById.set(r.id, marker);
      this.clusterGroup.addLayer(marker);
    });
  },

  _popupHtml(r) {
    const meta = OUTCOME_META[r.outcome];
    const approx = r.location_is_approximate ? ' <span title="Approximate location">~</span>' : "";
    return `
      <div class="incident-popup">
        <div class="popup-date">${r.date}${r.hour !== null ? " &middot; " + formatHour(r.hour) : ""}</div>
        <div class="popup-outcome" style="color:${outcomeColor(r.outcome)}">${meta.icon} ${meta.label}</div>
        <div class="popup-place">${escapeHtml(r.place)}${approx}</div>
        <div class="popup-row"><strong>Activity:</strong> ${escapeHtml(r.activity)}</div>
        <div class="popup-row"><strong>Species:</strong> ${escapeHtml(r.species)}</div>
        <div class="popup-desc">${escapeHtml(r.description)}</div>
      </div>`;
  },

  focusRecord(id) {
    const marker = this.markersById.get(id);
    if (!marker) return;
    this.clusterGroup.zoomToShowLayer(marker, () => {
      marker.openPopup();
    });
  },
};
