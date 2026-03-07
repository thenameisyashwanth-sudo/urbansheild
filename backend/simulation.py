"""
Vehicle and traffic simulation for Bengaluru.
Generates 50–100 random vehicles every tick across 10 fixed road segments.
"""
import random
from datetime import datetime
from typing import List, Dict, Any

# Bengaluru road segments (real names and approximate coordinates)
ROAD_SEGMENTS = [
    {"id": 1, "name": "MG Road", "capacity": 60, "max_speed_kmh": 40, "lat_start": 12.9756, "lng_start": 77.6063, "lat_end": 12.9716, "lng_end": 77.5963},
    {"id": 2, "name": "Outer Ring Road - Marathahalli", "capacity": 80, "max_speed_kmh": 50, "lat_start": 12.9594, "lng_start": 77.6972, "lat_end": 12.9694, "lng_end": 77.6872},
    {"id": 3, "name": "Silk Board Junction", "capacity": 70, "max_speed_kmh": 30, "lat_start": 12.9172, "lng_start": 77.6233, "lat_end": 12.9182, "lng_end": 77.6243},
    {"id": 4, "name": "Whitefield Main Road", "capacity": 55, "max_speed_kmh": 45, "lat_start": 12.9698, "lng_start": 77.7499, "lat_end": 12.9598, "lng_end": 77.7399},
    {"id": 5, "name": "Koramangala 80 Feet Road", "capacity": 50, "max_speed_kmh": 35, "lat_start": 12.9352, "lng_start": 77.6245, "lat_end": 12.9452, "lng_end": 77.6145},
    {"id": 6, "name": "Indiranagar 100 Feet Road", "capacity": 45, "max_speed_kmh": 40, "lat_start": 12.9789, "lng_start": 77.6402, "lat_end": 12.9689, "lng_end": 77.6502},
    {"id": 7, "name": "Hebbal Flyover", "capacity": 75, "max_speed_kmh": 50, "lat_start": 13.0352, "lng_start": 77.5933, "lat_end": 13.0252, "lng_end": 77.6033},
    {"id": 8, "name": "Bannerghatta Road", "capacity": 60, "max_speed_kmh": 45, "lat_start": 12.8854, "lng_start": 77.5972, "lat_end": 12.8954, "lng_end": 77.5872},
    {"id": 9, "name": "KR Puram - Tin Factory", "capacity": 65, "max_speed_kmh": 40, "lat_start": 13.0123, "lng_start": 77.6987, "lat_end": 13.0023, "lng_end": 77.6887},
    {"id": 10, "name": "Jayanagar 4th Block", "capacity": 40, "max_speed_kmh": 30, "lat_start": 12.9256, "lng_start": 77.5934, "lat_end": 12.9156, "lng_end": 77.6034},
]

# Vehicle type distribution: 35% bike, 30% car, 15% auto, 10% truck, 8% bus, 2% ambulance
VEHICLE_WEIGHTS = [
    ("bike", 35),
    ("car", 30),
    ("auto", 15),
    ("truck", 10),
    ("bus", 8),
    ("ambulance", 2),
]


def _weighted_choice() -> str:
    total = sum(w for _, w in VEHICLE_WEIGHTS)
    r = random.uniform(0, total)
    for vtype, w in VEHICLE_WEIGHTS:
        r -= w
        if r <= 0:
            return vtype
    return "car"


def _interpolate(seg: Dict, t: float) -> tuple:
    """t in [0,1] along segment."""
    lat = seg["lat_start"] + t * (seg["lat_end"] - seg["lat_start"])
    lng = seg["lng_start"] + t * (seg["lng_end"] - seg["lng_start"])
    return (lat, lng)


def generate_vehicles(count: int | None = None) -> List[Dict[str, Any]]:
    """Generate 50–100 (or count) random vehicles across road segments."""
    n = count if count is not None else random.randint(50, 100)
    out = []
    for i in range(n):
        seg = random.choice(ROAD_SEGMENTS)
        t = random.uniform(0, 1)
        lat, lng = _interpolate(seg, t)
        vtype = _weighted_choice()
        max_speed = seg["max_speed_kmh"]
        speed = random.uniform(max_speed * 0.3, max_speed * 0.95) if max_speed else 25
        out.append({
            "id": f"v_{i}_{datetime.utcnow().timestamp()}",
            "type": vtype,
            "segment_id": seg["id"],
            "segment_name": seg["name"],
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "speed_kmh": round(speed, 1),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return out


def get_road_segments() -> List[Dict]:
    return list(ROAD_SEGMENTS)
