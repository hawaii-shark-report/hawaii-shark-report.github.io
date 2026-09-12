/* Shared color roles, light + dark, from the validated default data-viz palette.
   Never cycle these — each entity (island / activity bucket / outcome) keeps
   the same slot regardless of sort order or which filters are active. */
// The activity set is the shipped default 8-hue categorical palette (validated
// adjacent + first-3-slots-all-pairs in both modes). Islands get their OWN
// 6-hue set so the two dimensions never share a color: reusing the same 8
// slots for both was the bug (Oʻahu and Surfing were literally the same
// hex). Cramming 8 + 6 = 14 mutually-distinct hues onto one wheel isn't
// achievable at the CVD-safe target (the validator confirms even the
// activity 8 can't all-pairs past 3 slots) - so the island set is validated
// for what it actually needs: adjacent bars in the "by island" chart PASS
// cleanly in both modes; the all-pairs case (the unit charts' "color by
// island" toggle) keeps a couple of closer pairs, same class of limit the
// activity set already has there, mitigated by the always-visible color
// legend + shape-by-outcome + hover list text.
const PALETTE = {
  light: {
    surface: "#fcfcfb",
    page: "#f9f9f7",
    ink: "#0b0b0b",
    inkSecondary: "#52514e",
    inkMuted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    categorical: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    islandCategorical: ["#00b6f4", "#ac6ae1", "#9db23d", "#8e9cff", "#a31655", "#9d5000"],
    status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
  },
  dark: {
    surface: "#1a1a19",
    page: "#0d0d0d",
    ink: "#ffffff",
    inkSecondary: "#c3c2b7",
    inkMuted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
    categorical: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
    islandCategorical: ["#0066c1", "#953789", "#728500", "#656fce", "#c94074", "#ab7900"],
    status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
  },
};

function isDarkMode() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function currentPalette() {
  return isDarkMode() ? PALETTE.dark : PALETTE.light;
}

// Fixed entity -> categorical slot index assignments (never reassigned by sort/filter).
const ISLAND_ORDER = ["Oahu", "Maui", "Hawaii", "Kauai", "Molokai", "Lanai"];
const ISLAND_LABELS = { Oahu: "Oʻahu", Maui: "Maui", Hawaii: "Hawaiʻi (Big Island)", Kauai: "Kauaʻi", Molokai: "Molokaʻi", Lanai: "Lānaʻi" };
const ACTIVITY_ORDER = ["Surfing", "Swimming", "Snorkeling", "Stand-up paddleboarding", "Spearfishing", "Body boarding", "Swimming with sharks", "Other"];
const ACTIVITY_GROUP_SET = new Set(ACTIVITY_ORDER.slice(0, -1));

function groupActivity(raw) {
  return ACTIVITY_GROUP_SET.has(raw) ? raw : "Other";
}

function islandColor(island) {
  const idx = ISLAND_ORDER.indexOf(island);
  const pal = currentPalette();
  return pal.islandCategorical[idx >= 0 ? idx : pal.islandCategorical.length - 1];
}

function activityColor(activityGroup) {
  const idx = ACTIVITY_ORDER.indexOf(activityGroup);
  const pal = currentPalette();
  return pal.categorical[idx >= 0 ? idx : pal.categorical.length - 1];
}

function outcomeOf(record) {
  if (record.fatal) return "fatal";
  if (record.no_injury) return "no_injury";
  return "injury";
}

const OUTCOME_META = {
  fatal: { label: "Fatal", icon: "☠", statusKey: "critical" },
  injury: { label: "Injury", icon: "⚠", statusKey: "serious" },
  no_injury: { label: "No injury", icon: "✓", statusKey: "good" },
};

function outcomeColor(outcomeKey) {
  return currentPalette().status[OUTCOME_META[outcomeKey].statusKey];
}

// Marker shapes for the unit charts (time-of/per axes) — shape carries
// outcome, color carries the activity/island dimension, so neither is
// encoded by color alone.
const OUTCOME_SYMBOL = { no_injury: "circle", injury: "triangle-up", fatal: "diamond" };

function setTheme(mode) {
  // mode: 'light' | 'dark' | null (null clears the override and follows the OS)
  if (mode === "light" || mode === "dark") {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("shark-dashboard-theme", mode);
    } catch (e) {
      /* ignore (private browsing, storage disabled, etc.) */
    }
  } else {
    document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.removeItem("shark-dashboard-theme");
    } catch (e) {
      /* ignore */
    }
  }
}

function loadStoredTheme() {
  try {
    const stored = localStorage.getItem("shark-dashboard-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {
    /* ignore */
  }
}
