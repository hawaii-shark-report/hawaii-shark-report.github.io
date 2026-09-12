/* Small shared helpers used by both map.js and charts.js. */

function formatHour(h) {
  if (h === null || h === undefined) return "";
  return h === 0 ? "12am" : h < 12 ? h + "am" : h === 12 ? "12pm" : h - 12 + "pm";
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function groupRecords(records, keyFn) {
  const map = new Map();
  records.forEach((r) => {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}
