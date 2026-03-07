"""
Emergency corridor: ambulance dispatch, route (OSRM), ETA, alerts.
"""
import random
from typing import List, Dict, Any, Optional

import httpx

# Fixed hospital locations in Bengaluru
HOSPITALS = [
    {"name": "Victoria Hospital", "lat": 12.9589, "lng": 77.5865},
    {"name": "Manipal Hospital", "lat": 12.9342, "lng": 77.6102},
    {"name": "Fortis Bannerghatta", "lat": 12.8776, "lng": 77.5972},
]

# Possible spawn points (area names)
SPAWN_POINTS = [
    {"name": "Silk Board", "lat": 12.9172, "lng": 77.6233},
    {"name": "Whitefield", "lat": 12.9698, "lng": 77.7499},
    {"name": "Koramangala", "lat": 12.9352, "lng": 77.6245},
    {"name": "Indiranagar", "lat": 12.9789, "lng": 77.6402},
    {"name": "Hebbal", "lat": 13.0352, "lng": 77.5933},
    {"name": "MG Road", "lat": 12.9716, "lng": 77.5963},
]


async def get_route_osrm(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
    """Fetch route from OSRM (public demo server). Returns coordinates and duration/distance."""
    url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        "?overview=full&geometries=geojson"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
            data = r.json()
        if data.get("code") != "Ok":
            return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)
        legs = data.get("routes", [{}])[0]
        geometry = legs.get("geometry", {})
        coordinates = geometry.get("coordinates", [])
        # OSRM returns [lng, lat]
        coords = [[c[1], c[0]] for c in coordinates]
        duration_sec = legs.get("duration", 600)
        distance_m = legs.get("distance", 5000)
        return {
            "coordinates": coords,
            "duration_seconds": duration_sec,
            "distance_meters": distance_m,
            "road_names": _mock_road_names(len(coords)),
        }
    except Exception:
        return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)


def _fallback_route(olat: float, olng: float, dlat: float, dlng: float) -> Dict[str, Any]:
    """Straight-line fallback with mock duration."""
    import math
    # Approximate: 1 deg ~ 111 km, speed 40 km/h
    d = math.sqrt((dlat - olat) ** 2 + (dlng - olng) ** 2) * 111 * 1000  # meters
    duration_sec = (d / 1000) / 40 * 3600
    steps = 20
    coords = [
        [olat + (dlat - olat) * i / steps, olng + (dlng - olng) * i / steps]
        for i in range(steps + 1)
    ]
    return {
        "coordinates": coords,
        "duration_seconds": duration_sec,
        "distance_meters": d,
        "road_names": ["Simulated route segment 1", "Simulated route segment 2"],
    }


def _mock_road_names(n: int) -> List[str]:
    roads = ["MG Road", "Outer Ring Road", "Hosur Road", "Bannerghatta Road", "Old Madras Road", "Whitefield Main Rd"]
    return [random.choice(roads) for _ in range(min(n, 5))]


def pick_ambulance_origin_destination() -> tuple:
    """Random origin from SPAWN_POINTS, random hospital as destination."""
    origin = random.choice(SPAWN_POINTS)
    dest = random.choice(HOSPITALS)
    return (
        {"name": origin["name"], "lat": origin["lat"], "lng": origin["lng"]},
        {"name": dest["name"], "lat": dest["lat"], "lng": dest["lng"]},
    )


def get_hospitals() -> List[Dict]:
    return list(HOSPITALS)
