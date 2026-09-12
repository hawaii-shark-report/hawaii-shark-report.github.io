/* Wiring: filters <-> data <-> map/charts/table/stat cards. */

// Apply any previously-saved theme choice immediately (before first paint
// of charts/map) so there's no flash of the wrong palette.
loadStoredTheme();

const state = { filters: defaultFilters(), records: [], filtered: [] };
let sortState = { key: "date", dir: "desc" };

function updateThemeToggleIcon() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.textContent = isDarkMode() ? "☀️" : "🌙";
}

function applyThemeSideEffects() {
  updateThemeToggleIcon();
  renderMapLegend();
  renderAllCharts(state.filtered);
  renderTable(state.filtered);
  MapView.render(state.filtered); // re-tint cluster bubbles + refresh basemap-independent marker colors
}

function setupThemeToggle() {
  updateThemeToggleIcon();
  document.getElementById("theme-toggle").addEventListener("click", () => {
    setTheme(isDarkMode() ? "light" : "dark");
    applyThemeSideEffects();
  });
}

function setupTimeColorToggle() {
  document.querySelectorAll("#time-color-controls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#time-color-controls button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      timeChartState.colorMode = btn.dataset.colorMode;
      renderTimeChartLegends(state.filtered);
      renderYearChart(state.filtered);
      renderMonthChart(state.filtered);
      renderHourChart(state.filtered);
    });
  });
}

function buildChipGroup(containerId, order, labelFn, selectedSet, onChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  order.forEach((value) => {
    const id = `${containerId}-${value.replace(/\s+/g, "_")}`;
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" id="${id}" checked><span>${labelFn(value)}</span>`;
    const input = label.querySelector("input");
    input.checked = selectedSet.has(value);
    input.addEventListener("change", () => {
      if (input.checked) selectedSet.add(value);
      else selectedSet.delete(value);
      onChange();
    });
    container.appendChild(label);
  });
}

function setupFilterControls() {
  const presentIslands = DataStore.islandsPresent();
  buildChipGroup("island-filters", presentIslands, (v) => ISLAND_LABELS[v], state.filters.islands, refresh);

  const presentActivityGroups = ACTIVITY_ORDER.filter((a) =>
    DataStore.all.some((r) => r.activityGroup === a)
  );
  buildChipGroup("activity-filters", presentActivityGroups, (v) => v, state.filters.activities, refresh);

  buildChipGroup(
    "outcome-filters",
    ["fatal", "injury", "no_injury"],
    (v) => `${OUTCOME_META[v].icon} ${OUTCOME_META[v].label}`,
    state.filters.outcomes,
    refresh
  );

  document.querySelectorAll("#range-controls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#range-controls button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filters.range = btn.dataset.range;
      document.getElementById("custom-range").hidden = state.filters.range !== "custom";
      refresh();
    });
  });

  document.getElementById("custom-start").addEventListener("change", (e) => {
    state.filters.customStart = e.target.value || null;
    refresh();
  });
  document.getElementById("custom-end").addEventListener("change", (e) => {
    state.filters.customEnd = e.target.value || null;
    refresh();
  });

  document.getElementById("confirmed-only").addEventListener("change", (e) => {
    state.filters.confirmedOnly = e.target.checked;
    refresh();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    state.filters = defaultFilters();
    document.getElementById("confirmed-only").checked = false;
    document.getElementById("custom-range").hidden = true;
    document.querySelectorAll("#range-controls button").forEach((b) => b.classList.toggle("active", b.dataset.range === "5y"));
    setupFilterControls();
    refresh();
  });

  document.querySelectorAll("#incident-table thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortState.key === key) sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      else sortState = { key, dir: "asc" };
      renderTable(state.filtered);
    });
  });
}

function renderMapLegend() {
  const legend = document.getElementById("map-legend");
  legend.innerHTML = ["fatal", "injury", "no_injury"]
    .map((k) => `<span class="legend-item"><span class="dot" style="background:${outcomeColor(k)}"></span>${OUTCOME_META[k].icon} ${OUTCOME_META[k].label}</span>`)
    .join("");
}

function renderStats(records) {
  const total = records.length;
  const fatal = records.filter((r) => r.outcome === "fatal").length;
  const activityCounts = countBy(records, (r) => r.activityGroup);
  let topActivity = "—";
  let topActivityCount = 0;
  activityCounts.forEach((count, activity) => {
    if (count > topActivityCount) {
      topActivity = activity;
      topActivityCount = count;
    }
  });
  const islandCounts = countBy(records, (r) => r.island);
  let topIsland = "—";
  let topIslandCount = 0;
  islandCounts.forEach((count, island) => {
    if (count > topIslandCount) {
      topIsland = ISLAND_LABELS[island] || island;
      topIslandCount = count;
    }
  });

  const cards = [
    { label: "Incidents (filtered)", value: total },
    { label: "Fatal", value: fatal },
    { label: "Most common activity", value: topActivity, sub: topActivityCount ? `${topActivityCount} incident(s)` : "" },
    { label: "Most active island", value: topIsland, sub: topIslandCount ? `${topIslandCount} incident(s)` : "" },
  ];
  document.getElementById("stats").innerHTML = cards
    .map(
      (c) => `<div class="stat-card"><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div>${c.sub ? `<div class="stat-sub">${c.sub}</div>` : ""}</div>`
    )
    .join("");
}

function sortRecords(records) {
  const { key, dir } = sortState;
  const mult = dir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    let av = a[key];
    let bv = b[key];
    if (key === "date") {
      av = a.dateObj;
      bv = b.dateObj;
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });
}

function renderTable(records) {
  document.getElementById("table-count").textContent = records.length;
  const sorted = sortRecords(records);
  const body = document.getElementById("table-body");
  body.innerHTML = sorted
    .map((r) => {
      const meta = OUTCOME_META[r.outcome];
      return `<tr data-id="${r.id}">
        <td>${r.date}</td>
        <td>${ISLAND_LABELS[r.island] || r.island}</td>
        <td>${escapeHtml(r.place)}</td>
        <td>${escapeHtml(r.activity)}</td>
        <td>${escapeHtml(r.species)}</td>
        <td><span class="outcome-tag" style="color:${outcomeColor(r.outcome)}">${meta.icon} ${meta.label}</span></td>
      </tr>`;
    })
    .join("");
  body.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      MapView.focusRecord(tr.dataset.id);
      document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function refresh() {
  state.filtered = applyFilters(DataStore.all, state.filters);
  renderStats(state.filtered);
  MapView.render(state.filtered);
  renderAllCharts(state.filtered);
  renderTable(state.filtered);
}

function setLastUpdated() {
  const el = document.getElementById("last-updated");
  if (DataStore.meta && DataStore.meta.last_updated_utc) {
    const d = new Date(DataStore.meta.last_updated_utc);
    el.textContent = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } else {
    el.textContent = "unknown";
  }
}

async function init() {
  MapView.init();
  renderMapLegend();
  setupThemeToggle();
  await DataStore.load();
  setupFilterControls();
  setupTimeColorToggle();
  setLastUpdated();
  refresh();

  if (window.matchMedia) {
    // Only follow the OS setting when the person hasn't explicitly picked
    // light/dark with the toggle (that sets data-theme, which isDarkMode()
    // always prefers over the OS setting).
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyThemeSideEffects();
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
