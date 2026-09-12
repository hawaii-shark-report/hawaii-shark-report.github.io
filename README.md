# Hawaiʻi Shark Incidents Report

An interactive, single-page dashboard of documented shark-bite incidents in
Hawaiʻi — a Leaflet map, six filterable charts, and a sortable incident log —
built entirely from the State of Hawaiʻi DLNR's own [Shark Incidents
List](https://dlnr.hawaii.gov/sharks/shark-incidents/incidents-list/). 

## Disclaimer

This dashboard is for informational purposes only. While we strive for accuracy, the data is sourced from the State of Hawaiʻi DLNR and may contain errors or omissions. Users should not rely solely on this dashboard for safety decisions regarding shark encounters.

The creators of this dashboard disclaim any liability for decisions made based on the information presented herein. Always exercise caution and follow official guidance when engaging in water activities in Hawaiʻi.

## Data notes & limitations

- Scope follows DLNR's own methodology: excludes encounters where a shark
  didn't actually bite a person or board, and incidents ISAF classifies as
  boat attacks, scavenge, or doubtful. A couple of "not confirmed" incidents
  are kept in the data (flagged `confirmed: false`) but excluded by the
  dashboard's "Confirmed shark bites only" filter when enabled.
- **Locations are approximate.** DLNR publishes place names, not GPS
  coordinates; geocoded positions are beach/break-level, not the literal bite
  location.
- Shark lengths are estimates as reported by DLNR/witnesses.
- For incidents before 1995, DLNR points to Balazs, G.H., *"Annotated list of
  shark attack cases in the Hawaiian Islands 1779–1996"* — not included here.

## Credits

Data: [Hawaiʻi DLNR, Division of Aquatic Resources](https://dlnr.hawaii.gov/sharks/shark-incidents/incidents-list/).
Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
Built with [Leaflet](https://leafletjs.com/), [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster), and [Plotly.js](https://plotly.com/javascript/).
