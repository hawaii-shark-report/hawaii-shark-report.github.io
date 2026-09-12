/* Plotly chart rendering. Every render call uses Plotly.react so updates on
   filter change are smooth, and colors are assigned per fixed entity slot
   (never re-cycled when the filtered set changes). Hovering a bar/unit shows
   the total count plus a scrollable list of the actual incidents in that
   bin, rendered in an HTML panel under the chart. */

function basePlotlyLayout(extra) {
  const pal = currentPalette();
  return Object.assign(
    {
      paper_bgcolor: pal.surface,
      plot_bgcolor: pal.surface,
      font: { family: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: pal.inkSecondary, size: 12 },
      margin: { l: 44, r: 16, t: 8, b: 36 },
      xaxis: { gridcolor: pal.grid, zerolinecolor: pal.axis, linecolor: pal.axis, tickfont: { color: pal.inkMuted } },
      yaxis: { gridcolor: pal.grid, zerolinecolor: pal.axis, linecolor: pal.axis, tickfont: { color: pal.inkMuted }, rangemode: "tozero" },
      showlegend: false,
      bargap: 0.25,
      hoverlabel: { bgcolor: pal.surface, bordercolor: pal.axis, font: { color: pal.ink } },
    },
    extra || {}
  );
}

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true };

function countBy(records, keyFn) {
  const map = new Map();
  records.forEach((r) => {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + 1);
  });
  return map;
}

/* Shared "color the time charts by activity or island" toggle state. */
const timeChartState = { colorMode: "activity" };

function timeChartCategoryMeta() {
  if (timeChartState.colorMode === "island") {
    return { order: ISLAND_ORDER, colorFn: islandColor, labelFn: (c) => ISLAND_LABELS[c], keyFn: (r) => r.island };
  }
  return { order: ACTIVITY_ORDER, colorFn: activityColor, labelFn: (c) => c, keyFn: (r) => r.activityGroup };
}

/* --- Hover-list wiring ------------------------------------------------ */
/* One entry per chart: the records grouped by bin label (the x value used
   on that chart), a label formatter, and whether the Plotly event listeners
   have been attached yet (attach once; Plotly.react reuses the same DOM
   node so re-attaching on every render would stack duplicate listeners). */
const CHART_HOVER_STATE = {
  year: { groups: new Map(), listId: "hoverlist-year", attached: false, clearTimer: null },
  month: { groups: new Map(), listId: "hoverlist-month", attached: false, clearTimer: null },
  hour: { groups: new Map(), listId: "hoverlist-hour", attached: false, clearTimer: null },
  island: { groups: new Map(), listId: "hoverlist-island", attached: false, clearTimer: null },
  activity: { groups: new Map(), listId: "hoverlist-activity", attached: false, clearTimer: null },
  outcome: { groups: new Map(), listId: "hoverlist-outcome", attached: false, clearTimer: null },
};

/* Short grace period between leaving the chart and clearing its list, so a
   mouse moving straight down off the chart toward the list underneath it
   doesn't get cut off mid-transit. */
const HOVER_LIST_CLEAR_DELAY_MS = 200;

function cancelScheduledClear(state) {
  if (state.clearTimer) {
    clearTimeout(state.clearTimer);
    state.clearTimer = null;
  }
}

function scheduleHoverListClear(state) {
  cancelScheduledClear(state);
  state.clearTimer = setTimeout(() => {
    clearHoverList(state.listId);
    state.clearTimer = null;
  }, HOVER_LIST_CLEAR_DELAY_MS);
}

const HOVER_LIST_MAX_ITEMS = 25;

function renderHoverList(listId, label, records) {
  const el = document.getElementById(listId);
  if (!el) return;
  if (!records || records.length === 0) {
    el.innerHTML = `<div class="hoverlist-placeholder">${escapeHtml(String(label))}: no incidents in the current filters.</div>`;
    return;
  }
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  const shown = sorted.slice(0, HOVER_LIST_MAX_ITEMS);
  const items = shown
    .map((r) => {
      const meta = OUTCOME_META[r.outcome];
      return `<li><span class="hoverlist-outcome" style="color:${outcomeColor(r.outcome)}">${meta.icon}</span> <span class="hoverlist-date">${r.date}</span> — ${escapeHtml(r.place)} <span class="hoverlist-activity">(${escapeHtml(r.activity)})</span></li>`;
    })
    .join("");
  const more = sorted.length > HOVER_LIST_MAX_ITEMS ? `<li class="hoverlist-more">+ ${sorted.length - HOVER_LIST_MAX_ITEMS} more — see the incident log below</li>` : "";
  el.innerHTML = `<div class="hoverlist-header"><strong>${escapeHtml(String(label))}</strong> — ${records.length} incident(s)</div><ul class="hoverlist-items">${items}${more}</ul>`;
}

function clearHoverList(listId) {
  const el = document.getElementById(listId);
  if (!el) return;
  el.innerHTML = `<div class="hoverlist-placeholder">Hover (or tap) a bar to list its incidents.</div>`;
}

/* `axis` says which point coordinate carries the bin label: 'x' for the
   unit/dot-stack charts and for plain vertical bars (bin on the x-axis), 'y'
   for the horizontal bar charts (activity/outcome), where the bin is on the
   y-axis and x is the numeric count instead - using 'x' there was the bug
   that kept those two lists from ever populating: the looked-up key was a
   count, not a category, so it never matched anything in `state.groups`.

   The list clears a beat after the mouse leaves the chart - not instantly,
   and not never. Clearing on plotly_unhover the moment the cursor left the
   chart used to cut the list off the instant it was needed: the trip from
   the chart down to the list (to scroll a long one) crossed that boundary
   too. Never clearing at all had the opposite problem: hover chart A, then
   move on to read something else, and A's list just sits there. So leaving
   the chart schedules a clear a short delay out; entering the list itself
   cancels that clear (you're still using it); leaving the list clears
   immediately, since there's nowhere left to be going but away. */
function attachHoverList(chartId, stateKey, axis) {
  const state = CHART_HOVER_STATE[stateKey];
  const el = document.getElementById(chartId);
  if (!el || typeof el.on !== "function") return;
  const coord = axis === "y" ? "y" : "x";
  const show = (evt) => {
    if (!evt || !evt.points || !evt.points.length) return;
    cancelScheduledClear(state);
    const key = evt.points[0][coord];
    const records = state.groups.get(key) || [];
    renderHoverList(state.listId, key, records);
  };
  if (state.attached) return;
  el.on("plotly_hover", show);
  el.on("plotly_click", show);
  el.on("plotly_unhover", () => scheduleHoverListClear(state));
  const listEl = document.getElementById(state.listId);
  if (listEl) {
    listEl.addEventListener("mouseenter", () => cancelScheduledClear(state));
    listEl.addEventListener("mouseleave", () => scheduleHoverListClear(state));
  }
  clearHoverList(state.listId);
  state.attached = true;
}

/* --- Shared HTML legends for the 3 unit charts ------------------------- */

function renderTimeChartLegends(records) {
  const meta = timeChartCategoryMeta();
  const present = meta.order.filter((c) => records.some((r) => meta.keyFn(r) === c));
  const colorLegendEl = document.getElementById("time-chart-color-legend");
  if (colorLegendEl) {
    colorLegendEl.innerHTML = present
      .map((c) => `<span class="legend-item"><span class="dot" style="background:${meta.colorFn(c)}"></span>${escapeHtml(meta.labelFn(c))}</span>`)
      .join("");
  }
}

/* --- Unit ("dot-stack") charts: year / month / hour --------------------
   Each incident is drawn as one marker, colored by activity or island
   (toggle) and shaped by outcome, stacked within its time bin so the
   column height still reads as a normal magnitude bar chart. */

function buildUnitTraces(records, binKeyFn, binOrder) {
  const meta = timeChartCategoryMeta();
  const presentCats = meta.order.filter((c) => records.some((r) => meta.keyFn(r) === c));
  const perCat = new Map(presentCats.map((c) => [c, { x: [], y: [], customdata: [], symbol: [] }]));
  const binIndex = new Map(binOrder.map((b, i) => [b, i]));

  const byBin = groupRecords(records, binKeyFn);
  binOrder.forEach((bin) => {
    const recs = (byBin.get(bin) || []).slice().sort((a, b) => {
      const ci = meta.order.indexOf(meta.keyFn(a)) - meta.order.indexOf(meta.keyFn(b));
      if (ci !== 0) return ci;
      return a.date < b.date ? -1 : 1;
    });
    recs.forEach((r, i) => {
      const cat = meta.keyFn(r);
      const bucket = perCat.get(cat);
      if (!bucket) return;
      bucket.x.push(bin);
      bucket.y.push(i + 1);
      bucket.customdata.push(r.id);
      bucket.symbol.push(OUTCOME_SYMBOL[r.outcome]);
    });
  });

  const maxStack = Math.max(1, ...binOrder.map((b) => (byBin.get(b) || []).length));
  const markerSize = Math.max(5, Math.min(13, Math.round(120 / maxStack)));
  const pal = currentPalette();

  const traces = presentCats.map((cat) => {
    const bucket = perCat.get(cat);
    return {
      name: meta.labelFn(cat),
      x: bucket.x,
      y: bucket.y,
      customdata: bucket.customdata,
      mode: "markers",
      type: "scatter",
      marker: {
        color: meta.colorFn(cat),
        symbol: bucket.symbol,
        size: markerSize,
        line: { width: 1, color: pal.surface },
      },
      hovertemplate: "%{x}<extra></extra>",
      showlegend: false,
    };
  });
  return { traces, maxStack };
}

function unitChartLayout(binOrder, maxStack, extra) {
  const pal = currentPalette();
  // With a tall stack, labeling every integer (dtick:1) turns into a wall of
  // tick text — space ticks out as the max grows so they stay legible.
  const yDtick = maxStack <= 10 ? 1 : maxStack <= 20 ? 2 : maxStack <= 40 ? 5 : 10;
  return basePlotlyLayout(
    Object.assign(
      {
        xaxis: {
          type: "category",
          categoryarray: binOrder,
          categoryorder: "array",
          gridcolor: pal.grid,
          linecolor: pal.axis,
          tickfont: { color: pal.inkMuted },
        },
        yaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted }, rangemode: "tozero", dtick: yDtick, title: { text: "incidents", font: { size: 10, color: pal.inkMuted } } },
      },
      extra || {}
    )
  );
}

function renderYearChart(records) {
  const years = Array.from(new Set(records.map((r) => r.year))).sort((a, b) => a - b);
  const binOrder = years.map(String);
  const { traces, maxStack } = buildUnitTraces(records, (r) => String(r.year), binOrder);
  Plotly.react("chart-year", traces, unitChartLayout(binOrder, maxStack), PLOTLY_CONFIG);
  CHART_HOVER_STATE.year.groups = groupRecords(records, (r) => String(r.year));
  attachHoverList("chart-year", "year");
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderMonthChart(records) {
  const binOrder = MONTH_NAMES_SHORT;
  const { traces, maxStack } = buildUnitTraces(records, (r) => MONTH_NAMES_SHORT[r.month - 1], binOrder);
  Plotly.react("chart-month", traces, unitChartLayout(binOrder, maxStack), PLOTLY_CONFIG);
  CHART_HOVER_STATE.month.groups = groupRecords(records, (r) => MONTH_NAMES_SHORT[r.month - 1]);
  attachHoverList("chart-month", "month");
}

function renderHourChart(records) {
  const withHour = records.filter((r) => r.hour !== null && r.hour !== undefined);
  const hourLabel = (h) => (h === 0 ? "12am" : h < 12 ? h + "am" : h === 12 ? "12pm" : h - 12 + "pm");
  const binOrder = Array.from({ length: 24 }, (_, h) => hourLabel(h));
  const { traces, maxStack } = buildUnitTraces(withHour, (r) => hourLabel(r.hour), binOrder);
  Plotly.react(
    "chart-hour",
    traces,
    unitChartLayout(binOrder, maxStack, { xaxis: { type: "category", categoryarray: binOrder, categoryorder: "array", tickangle: -45 } }),
    PLOTLY_CONFIG
  );
  CHART_HOVER_STATE.hour.groups = groupRecords(withHour, (r) => hourLabel(r.hour));
  attachHoverList("chart-hour", "hour");
}

/* --- Plain bar charts: island / activity / outcome ---------------------- */

function renderIslandChart(records) {
  const groups = groupRecords(records, (r) => r.island);
  const islands = ISLAND_ORDER.filter((i) => groups.has(i));
  const values = islands.map((i) => groups.get(i).length);
  const colors = islands.map((i) => islandColor(i));
  const labels = islands.map((i) => ISLAND_LABELS[i]);
  const pal = currentPalette();
  Plotly.react(
    "chart-island",
    [{ x: labels, y: values, type: "bar", marker: { color: colors }, hovertemplate: "%{x}: %{y} incident(s)<extra></extra>" }],
    basePlotlyLayout({ xaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted } } }),
    PLOTLY_CONFIG
  );
  CHART_HOVER_STATE.island.groups = new Map(islands.map((i, idx) => [labels[idx], groups.get(i)]));
  attachHoverList("chart-island", "island");
}

function renderActivityChart(records) {
  const groups = groupRecords(records, (r) => r.activityGroup);
  const activities = ACTIVITY_ORDER.filter((a) => groups.has(a));
  const values = activities.map((a) => groups.get(a).length);
  const colors = activities.map((a) => activityColor(a));
  const pal = currentPalette();
  Plotly.react(
    "chart-activity",
    [
      {
        y: activities,
        x: values,
        type: "bar",
        orientation: "h",
        marker: { color: colors },
        hovertemplate: "%{y}: %{x} incident(s)<extra></extra>",
      },
    ],
    basePlotlyLayout({
      margin: { l: 150, r: 16, t: 8, b: 36 },
      yaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted }, autorange: "reversed" },
      xaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted } },
    }),
    PLOTLY_CONFIG
  );
  CHART_HOVER_STATE.activity.groups = groups;
  attachHoverList("chart-activity", "activity", "y");
}

function renderOutcomeChart(records) {
  const order = ["fatal", "injury", "no_injury"];
  const groups = groupRecords(records, (r) => r.outcome);
  const labels = order.map((k) => `${OUTCOME_META[k].icon} ${OUTCOME_META[k].label}`);
  const values = order.map((k) => (groups.get(k) || []).length);
  const colors = order.map((k) => outcomeColor(k));
  const pal = currentPalette();
  Plotly.react(
    "chart-outcome",
    [
      {
        y: labels,
        x: values,
        type: "bar",
        orientation: "h",
        marker: { color: colors },
        hovertemplate: "%{y}: %{x} incident(s)<extra></extra>",
      },
    ],
    basePlotlyLayout({
      margin: { l: 100, r: 16, t: 8, b: 36 },
      yaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted } },
      xaxis: { gridcolor: pal.grid, linecolor: pal.axis, tickfont: { color: pal.inkMuted } },
    }),
    PLOTLY_CONFIG
  );
  CHART_HOVER_STATE.outcome.groups = new Map(order.map((k, i) => [labels[i], groups.get(k) || []]));
  attachHoverList("chart-outcome", "outcome", "y");
}

function renderAllCharts(records) {
  renderTimeChartLegends(records);
  renderYearChart(records);
  renderMonthChart(records);
  renderHourChart(records);
  renderIslandChart(records);
  renderActivityChart(records);
  renderOutcomeChart(records);
}
