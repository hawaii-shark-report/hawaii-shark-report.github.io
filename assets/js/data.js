/* Data loading + filtering for the shark incident dashboard. */

const DataStore = {
  all: [],
  meta: null,

  async load() {
    const [records, meta] = await Promise.all([
      fetch("data/shark_incidents.json").then((r) => r.json()),
      fetch("data/meta.json").then((r) => r.json()).catch(() => null),
    ]);
    records.forEach((r) => {
      r.dateObj = new Date(r.date + "T00:00:00Z");
      r.activityGroup = groupActivity(r.activity);
      r.outcome = outcomeOf(r);
    });
    this.all = records;
    this.meta = meta;
    return records;
  },

  islandsPresent() {
    const set = new Set(this.all.map((r) => r.island));
    return ISLAND_ORDER.filter((i) => set.has(i));
  },
};

/** Default filter state. */
function defaultFilters() {
  return {
    range: "5y", // '1y' | '5y' | 'all' | 'custom'
    customStart: null,
    customEnd: null,
    islands: new Set(ISLAND_ORDER),
    activities: new Set(ACTIVITY_ORDER),
    outcomes: new Set(["fatal", "injury", "no_injury"]),
    confirmedOnly: false,
  };
}

function rangeBounds(filters, now) {
  now = now || new Date();
  if (filters.range === "all") return [null, null];
  if (filters.range === "1y") {
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return [start, now];
  }
  if (filters.range === "5y") {
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - 5);
    return [start, now];
  }
  if (filters.range === "custom") {
    const start = filters.customStart ? new Date(filters.customStart + "T00:00:00Z") : null;
    const end = filters.customEnd ? new Date(filters.customEnd + "T23:59:59Z") : now;
    return [start, end];
  }
  return [null, null];
}

function applyFilters(records, filters) {
  const [start, end] = rangeBounds(filters);
  return records.filter((r) => {
    if (start && r.dateObj < start) return false;
    if (end && r.dateObj > end) return false;
    if (!filters.islands.has(r.island)) return false;
    if (!filters.activities.has(r.activityGroup)) return false;
    if (!filters.outcomes.has(r.outcome)) return false;
    if (filters.confirmedOnly && !r.confirmed) return false;
    return true;
  });
}
