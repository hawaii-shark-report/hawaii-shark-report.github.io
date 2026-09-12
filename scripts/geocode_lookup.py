"""
Static gazetteer of Hawaii place / beach / surf-break names used by the
DLNR shark incident list, mapped to approximate lat/lon coordinates.

Many locations in the DLNR list are informal surf-break nicknames
("Leftovers", "Alligators", "Old Man's") that do not exist in any general
geocoding service, so a hand-built lookup gives far better accuracy than
calling a geocoder for this dataset. Keys are normalized (lowercase,
diacritics stripped) place fragments; matching tries the longest/most
specific fragment first. Unmatched locations fall back to geocode_live.py
(Nominatim) and finally to an island centroid.
"""
import unicodedata

ISLAND_CENTROIDS = {
    "Oahu": (21.4389, -158.0001),
    "Maui": (20.7984, -156.3319),
    "Kauai": (22.0964, -159.5261),
    "Hawaii": (19.5429, -155.6659),  # Big Island
    "Molokai": (21.1444, -157.0226),
    "Lanai": (20.8283, -156.9200),
}

# key -> (lat, lon, island)
PLACES = {
    # Oahu
    "ala moana beach park": (21.2891, -157.8497, "Oahu"),
    "cromwell": (21.2626, -157.8129, "Oahu"),
    "kaikoo": (21.2626, -157.8129, "Oahu"),
    "makapuu": (21.3103, -157.6592, "Oahu"),
    "haleiwa": (21.5944, -158.1044, "Oahu"),
    "malaekahana": (21.6494, -157.9236, "Oahu"),
    "laie": (21.6494, -157.9236, "Oahu"),
    "waikiki": (21.2793, -157.8294, "Oahu"),
    "old mans": (21.2793, -157.8294, "Oahu"),
    "kualoa": (21.5241, -157.8386, "Oahu"),
    "kaaawa": (21.5537, -157.8467, "Oahu"),
    "razorbacks": (21.5537, -157.8467, "Oahu"),
    "makaua": (21.5537, -157.8467, "Oahu"),
    "kewalo": (21.2917, -157.8590, "Oahu"),
    "kaneohe": (21.4547, -157.8036, "Oahu"),
    "north beach": (21.4547, -157.8036, "Oahu"),
    "makaha": (21.4708, -158.2183, "Oahu"),
    "makaha beach": (21.4708, -158.2183, "Oahu"),
    "kaiwi channel": (21.2900, -157.6900, "Oahu"),
    "sandy beach": (21.2843, -157.6714, "Oahu"),
    "koko head": (21.2757, -157.6944, "Oahu"),
    "kawailoa": (21.6339, -158.0847, "Oahu"),
    "hultons": (21.6339, -158.0847, "Oahu"),
    "leftovers": (21.6339, -158.0847, "Oahu"),
    "alligators": (21.6339, -158.0847, "Oahu"),
    "marijuanas": (21.6339, -158.0847, "Oahu"),
    "kalaeloa": (21.2965, -158.0672, "Oahu"),
    "white plains": (21.2965, -158.0672, "Oahu"),
    "nimitz beach": (21.3049, -158.0916, "Oahu"),
    "sunset beach": (21.6706, -158.0408, "Oahu"),
    "rocky point": (21.6706, -158.0408, "Oahu"),
    "mokuleia": (21.5762, -158.1508, "Oahu"),
    "silvas channel": (21.5762, -158.1508, "Oahu"),
    "waimanalo": (21.3378, -157.7134, "Oahu"),
    "bellows": (21.3378, -157.7134, "Oahu"),
    "kahala": (21.2725, -157.7887, "Oahu"),
    "ewa beach": (21.3156, -158.0072, "Oahu"),
    "mokulua": (21.3936, -157.7133, "Oahu"),
    "kailua": (21.3928, -157.7159, "Oahu"),
    "lanikai": (21.3936, -157.7133, "Oahu"),
    "kaiaka": (21.5967, -158.1067, "Oahu"),
    "makua": (21.5406, -158.2261, "Oahu"),

    # Maui
    "olowalu": (20.8144, -156.6197, "Maui"),
    "waiehu": (20.9187, -156.4737, "Maui"),
    "sand piles": (20.9187, -156.4737, "Maui"),
    "kaehu": (20.9247, -156.4844, "Maui"),
    "lahaina": (20.8783, -156.6825, "Maui"),
    "mala wharf": (20.8794, -156.6825, "Maui"),
    "paia bay": (20.9101, -156.3711, "Maui"),
    "mantokuji": (20.9101, -156.3711, "Maui"),
    "kuau": (20.9174, -156.3556, "Maui"),
    "paia": (20.9174, -156.3556, "Maui"),
    "hookipa": (20.9339, -156.3572, "Maui"),
    "hamakuapoko": (20.9138, -156.3639, "Maui"),
    "kihei": (20.7644, -156.4450, "Maui"),
    "welakahao": (20.7500, -156.4472, "Maui"),
    "keawakapu": (20.7241, -156.4453, "Maui"),
    "wailea beach point": (20.6839, -156.4384, "Maui"),
    "wailea beach": (20.6890, -156.4408, "Maui"),
    "ulua beach": (20.6949, -156.4415, "Maui"),
    "wailea": (20.6890, -156.4408, "Maui"),
    "kahekili": (20.9339, -156.6944, "Maui"),
    "honolua": (20.9995, -156.6403, "Maui"),
    "honokowai": (20.9445, -156.6837, "Maui"),
    "kamaole": (20.7350, -156.4470, "Maui"),
    "kalama beach park": (20.7492, -156.4462, "Maui"),
    "kalama": (20.7492, -156.4462, "Maui"),
    "ahihi": (20.6314, -156.4269, "Maui"),
    "kanahena": (20.6314, -156.4269, "Maui"),
    "pali scenic lookout": (20.8235, -156.5636, "Maui"),
    "kahului harbor": (20.8963, -156.4675, "Maui"),
    "trenches": (20.8963, -156.4675, "Maui"),
    "kahului": (20.8947, -156.4700, "Maui"),
    "maalaea": (20.7897, -156.5111, "Maui"),
    "punaluu": (19.1378, -155.5064, "Hawaii"),  # Big Island Punaluu (only usage in this list)
    "makena landing": (20.6516, -156.4444, "Maui"),
    "palauea": (20.6614, -156.4419, "Maui"),
    "makena": (20.6390, -156.4453, "Maui"),
    "kaanapali": (20.9297, -156.6944, "Maui"),
    "kanaha": (20.9053, -156.4315, "Maui"),
    "kaa point": (20.9053, -156.4315, "Maui"),
    "spreckelsville": (20.9016, -156.3899, "Maui"),
    "baldwin": (20.9016, -156.3899, "Maui"),
    "kahana": (20.9713, -156.6811, "Maui"),
    "pohaku": (20.9713, -156.6811, "Maui"),
    "kapalua": (20.9976, -156.6636, "Maui"),
    "napili": (20.9958, -156.6706, "Maui"),
    "paukukalo": (20.9013, -156.4859, "Maui"),
    "waipuilani": (20.7276, -156.4499, "Maui"),

    # Kauai
    "hanalei": (22.2064, -159.5000, "Kauai"),
    "middles": (22.2064, -159.5000, "Kauai"),
    "the bowl": (22.2064, -159.5000, "Kauai"),
    "black pot": (22.2064, -159.5000, "Kauai"),
    "poipu": (21.8722, -159.4394, "Kauai"),
    "shipwreck": (21.8722, -159.4394, "Kauai"),
    "brenneckes": (21.8735, -159.4517, "Kauai"),
    "mahaulepu": (21.8834, -159.4183, "Kauai"),
    "kekaha": (21.9700, -159.7186, "Kauai"),
    "davidson": (21.9700, -159.7186, "Kauai"),
    "lihue": (21.9639, -159.3444, "Kauai"),
    "kalapaki": (21.9639, -159.3444, "Kauai"),
    "mana": (21.9636, -159.7719, "Kauai"),
    "waiokapua": (21.9636, -159.7719, "Kauai"),
    "pilaa": (22.2181, -159.4147, "Kauai"),
    "pakala": (21.9075, -159.7628, "Kauai"),
    "haena": (22.2242, -159.5811, "Kauai"),
    "tunnels": (22.2242, -159.5811, "Kauai"),
    "kalihiwai": (22.2214, -159.4147, "Kauai"),
    "princeville": (22.2214, -159.4794, "Kauai"),
    "hideaways": (22.2214, -159.4794, "Kauai"),
    "anini": (22.2231, -159.4147, "Kauai"),

    # Hawaii (Big Island)
    "kaalualu": (18.9291, -155.5814, "Hawaii"),
    "anaehoomalu": (19.9186, -155.8858, "Hawaii"),
    "kailua-kona": (19.6400, -155.9969, "Hawaii"),
    "keahole": (19.7333, -156.0500, "Hawaii"),
    "kahaluu beach": (19.5713, -155.9683, "Hawaii"),
    "banyans": (19.5793, -155.9633, "Hawaii"),
    "lyman beach": (19.6297, -155.9836, "Hawaii"),
    "kukio": (19.8215, -155.9425, "Hawaii"),
    "waikoloa": (19.9219, -155.8797, "Hawaii"),
    "makaiwa": (19.9219, -155.8797, "Hawaii"),
    "puako": (19.9575, -155.8461, "Hawaii"),
    "kapuniau": (19.9575, -155.8461, "Hawaii"),
    "kealakekua": (19.4794, -155.9214, "Hawaii"),
    "upolu": (20.2606, -155.8608, "Hawaii"),
    "hapuna": (19.9942, -155.8244, "Hawaii"),
    "keawaeli": (20.0000, -155.8300, "Hawaii"),
    "kehena": (19.3811, -154.9231, "Hawaii"),
    "pohoiki": (19.4592, -154.8442, "Hawaii"),
    "mahaiula": (19.7639, -156.0264, "Hawaii"),
    "kekaha kai": (19.7639, -156.0264, "Hawaii"),
    "kiholo": (19.8567, -155.9308, "Hawaii"),
    "kawa": (19.0764, -155.5822, "Hawaii"),
    "kahuwai": (19.5500, -155.9800, "Hawaii"),
    "old kona airport": (19.6444, -156.0022, "Hawaii"),
    "honolii": (19.7386, -155.0972, "Hawaii"),
    "kahaluu": (19.5713, -155.9683, "Hawaii"),

    # Molokai
    "papohako": (21.1211, -157.2564, "Molokai"),
    "pukoo": (21.0631, -156.8228, "Molokai"),
    "kupeke": (21.0631, -156.8228, "Molokai"),

    # Lanai
    "poaiwa": (20.8461, -156.8683, "Lanai"),
    "keomuku": (20.8797, -156.8264, "Lanai"),
    "club lanai": (20.9186, -156.8394, "Lanai"),
}


def _normalize(text: str) -> str:
    """Lowercase and strip Hawaiian diacritics / punctuation for matching."""
    text = text.replace("ʻ", "").replace("‘", "").replace("’", "").replace("'", "")
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_text = ascii_text.lower()
    cleaned = []
    for ch in ascii_text:
        cleaned.append(ch if (ch.isalnum() or ch.isspace()) else " ")
    return " ".join("".join(cleaned).split())


def normalize_island(raw_island: str) -> str:
    n = _normalize(raw_island)
    if n.startswith("oahu"):
        return "Oahu"
    if n.startswith("maui"):
        return "Maui"
    if n.startswith("kauai"):
        return "Kauai"
    if n.startswith("molokai"):
        return "Molokai"
    if n.startswith("lanai"):
        return "Lanai"
    if n.startswith("hawaii") or n.startswith("big island"):
        return "Hawaii"
    return "Unknown"


# Sort keys by length descending once, so the most specific fragment wins.
_SORTED_KEYS = sorted(PLACES.keys(), key=len, reverse=True)


def lookup_place(location_text: str, island: str):
    """Return (lat, lon, source) for a free-text location string, or None."""
    n = _normalize(location_text)
    for key in _SORTED_KEYS:
        if key in n:
            lat, lon, place_island = PLACES[key]
            return lat, lon, "gazetteer"
    return None
