#!/usr/bin/env python3
"""
Fetches the official Hawaii DLNR shark incidents list, parses it into
structured records, geocodes each location, and writes:
  data/shark_incidents.json  (used by the web dashboard)
  data/shark_incidents.csv   (same data, spreadsheet-friendly)
  data/meta.json             (last-updated timestamp + record count)

Run with no arguments in production (fetches the live page). For local
testing without network access, pass --fixture <path> to parse a
tab-separated text dump with the same 8 columns as the DLNR table
(Date and Time, Location, Activity, Water Clarity, Water Depth, Victim,
Description, Shark).
"""
import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from geocode_lookup import lookup_place, normalize_island, ISLAND_CENTROIDS  # noqa: E402
import geocode_live  # noqa: E402

SOURCE_URL = "https://dlnr.hawaii.gov/sharks/shark-incidents/incidents-list/"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def fetch_live_rows():
    """Fetch and parse the live DLNR table. Requires `requests` + `bs4`."""
    import requests
    from bs4 import BeautifulSoup

    resp = requests.get(
        SOURCE_URL,
        headers={"User-Agent": "hawaii-shark-dashboard/1.0 (contact: rbajon@hawaii.edu)"},
        timeout=30,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table", id=re.compile(r"tablepress"))
    if table is None:
        table = soup.find("table")
    if table is None:
        raise RuntimeError("Could not find the incidents table on the DLNR page")

    body = table.find("tbody") or table
    rows = []
    for tr in body.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) < 8:
            continue
        values = [c.get_text(" ", strip=True) for c in cells[:8]]
        rows.append(tuple(values))
    return rows


def fetch_fixture_rows(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 8:
                continue
            rows.append(tuple(parts[:8]))
    return rows


DATE_RE = re.compile(r"(\d{4})/(\d{1,2})/(\d{1,2})")
TIME_RE = re.compile(r"(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?", re.IGNORECASE)


def parse_date_time(raw):
    date_match = DATE_RE.search(raw)
    if not date_match:
        return None, None, None, None, None
    year, month, day = (int(x) for x in date_match.groups())
    try:
        date_obj = datetime(year, month, day)
    except ValueError:
        return None, None, None, None, None
    iso_date = date_obj.strftime("%Y-%m-%d")

    hour = None
    time_match = TIME_RE.search(raw)
    if time_match:
        h = int(time_match.group(1))
        ampm = (time_match.group(3) or "").lower().replace(".", "")
        if ampm == "pm" and h != 12:
            h += 12
        if ampm == "am" and h == 12:
            h = 0
        hour = h
    return iso_date, year, month, MONTH_NAMES[month - 1], hour


def parse_island_and_place(raw_location):
    parts = raw_location.split(",", 1)
    island_raw = parts[0].strip()
    place_raw = parts[1].strip() if len(parts) > 1 else island_raw
    island = normalize_island(island_raw)
    return island, place_raw


def parse_severity(description, activity):
    desc_l = description.lower()
    fatal = "fatal" in desc_l
    no_injury = "no injury" in desc_l or "no  injury" in desc_l
    provoked = "provoked" in desc_l
    return fatal, no_injury, provoked


SPECIES_CANON = [
    "Tiger shark", "Galapagos shark", "Blacktip reef shark", "Blacktip shark",
    "Whitetip reef shark", "Gray reef shark", "Cookiecutter shark",
    "Requiem shark", "White shark", "Sandbar shark",
]


def parse_species(shark_raw):
    for name in SPECIES_CANON:
        if name.lower() in shark_raw.lower():
            return name
    if "unknown" in shark_raw.lower() or "unidentified" in shark_raw.lower() or "insufficient" in shark_raw.lower():
        return "Unknown"
    return shark_raw.split(",")[0].strip() or "Unknown"


LENGTH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(ft|feet|foot|in|inch|inches)", re.IGNORECASE)


def parse_length_ft(shark_raw):
    match = LENGTH_RE.search(shark_raw)
    if not match:
        return None
    low = float(match.group(1))
    high = float(match.group(2)) if match.group(2) else low
    unit = match.group(3).lower()
    avg = (low + high) / 2
    if unit.startswith("in"):
        avg = avg / 12.0
    return round(avg, 1)


def geocode_record(island, place_raw):
    hit = lookup_place(place_raw, island)
    if hit:
        lat, lon, source = hit
        return lat, lon, source, False
    live = geocode_live.geocode(f"{place_raw}, {island}, Hawaii")
    if live:
        return live["lat"], live["lon"], "nominatim", False
    lat, lon = ISLAND_CENTROIDS.get(island, ISLAND_CENTROIDS["Oahu"])
    return lat, lon, "island_centroid", True


def build_records(rows):
    records = []
    for idx, row in enumerate(rows):
        date_raw, location_raw, activity, clarity, depth, victim, description, shark_raw = row
        iso_date, year, month_num, month_name, hour = parse_date_time(date_raw)
        if iso_date is None:
            continue
        island, place_raw = parse_island_and_place(location_raw)
        fatal, no_injury, provoked = parse_severity(description, activity)
        species = parse_species(shark_raw)
        length_ft = parse_length_ft(shark_raw)
        lat, lon, geo_source, is_approx = geocode_record(island, place_raw)

        records.append({
            "id": f"{iso_date}-{idx}",
            "date": iso_date,
            "year": year,
            "month": month_num,
            "month_name": month_name,
            "hour": hour,
            "island": island,
            "location": location_raw,
            "place": place_raw,
            "lat": lat,
            "lon": lon,
            "geocode_source": geo_source,
            "location_is_approximate": is_approx,
            "activity": activity,
            "water_clarity": clarity,
            "water_depth": depth,
            "victim": victim,
            "description": description,
            "species": species,
            "shark_raw": shark_raw,
            "length_ft": length_ft,
            "fatal": fatal,
            "no_injury": no_injury,
            "provoked": provoked,
            "confirmed": "not confirmed" not in description.lower() and "data insufficient" not in shark_raw.lower(),
        })
    records.sort(key=lambda r: r["date"], reverse=True)
    return records


def write_outputs(records):
    os.makedirs(DATA_DIR, exist_ok=True)

    json_path = os.path.join(DATA_DIR, "shark_incidents.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    csv_path = os.path.join(DATA_DIR, "shark_incidents.csv")
    fieldnames = list(records[0].keys()) if records else []
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    meta = {
        "source_url": SOURCE_URL,
        "last_updated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "record_count": len(records),
        "years_covered": [min(r["year"] for r in records), max(r["year"] for r in records)] if records else None,
    }
    with open(os.path.join(DATA_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Wrote {len(records)} records to {json_path}")
    print(f"Approximate/centroid-only locations: {sum(1 for r in records if r['location_is_approximate'])}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", help="Path to a local tab-separated fixture file (for offline testing)")
    args = parser.parse_args()

    if args.fixture:
        rows = fetch_fixture_rows(args.fixture)
    else:
        rows = fetch_live_rows()

    records = build_records(rows)
    write_outputs(records)


if __name__ == "__main__":
    main()
