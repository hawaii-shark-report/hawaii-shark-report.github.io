"""
Fallback live geocoder using OpenStreetMap Nominatim, used only when a
location doesn't match anything in geocode_lookup.py's static gazetteer.
Results are cached to data/geocode_cache.json (checked into the repo) so
repeat runs never re-request a place that's already been resolved, in
line with Nominatim's usage policy (max ~1 request/sec, identify your
app via User-Agent).
"""
import json
import os
import time
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "geocode_cache.json")
USER_AGENT = "hawaii-shark-dashboard/1.0 (github.com project; contact: rbajon@hawaii.edu)"
HAWAII_VIEWBOX = "-160.9,18.5,-154.5,22.6"  # lon_min,lat_min,lon_max,lat_max


def _load_cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False, sort_keys=True)


_cache = _load_cache()


def geocode(query: str):
    """Look up `query` (e.g. 'Waikiki, Oahu, Hawaii') via Nominatim, cached."""
    key = query.strip().lower()
    if key in _cache:
        return _cache[key]

    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "viewbox": HAWAII_VIEWBOX,
        "bounded": 1,
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    result = None
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data:
                result = {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    except Exception as e:
        print(f"  [geocode_live] failed for '{query}': {e}")
        result = None

    _cache[key] = result
    _save_cache(cache=_cache)
    time.sleep(1.1)  # respect Nominatim's ~1 req/sec policy
    return result
