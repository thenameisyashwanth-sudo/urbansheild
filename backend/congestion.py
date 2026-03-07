"""
Congestion index and signal recommendation for road segments.
"""
from typing import List, Dict, Any

from simulation import ROAD_SEGMENTS, get_road_segments


def congestion_index(vehicle_count: int, capacity: int, avg_speed: float, max_speed: float) -> float:
    """congestion_index = (vehicle_count / capacity) * (1 - avg_speed/max_speed)."""
    if capacity <= 0 or max_speed <= 0:
        return 0.0
    utilization = vehicle_count / capacity
    speed_factor = 1 - (avg_speed / max_speed)
    return round(utilization * max(speed_factor, 0.01), 4)


def segment_color(index: float) -> str:
    """Green (<0.3), Yellow (0.3–0.6), Red (>0.6)."""
    if index < 0.3:
        return "green"
    if index <= 0.6:
        return "yellow"
    return "red"


def recommended_green_time(
    bike_count: int, car_count: int, auto_count: int,
    truck_count: int, bus_count: int, ambulance_count: int,
    total_vehicles: int,
) -> float:
    """green_time = (bike*2 + car*4 + auto*3 + truck*9 + bus*7) / total * 10."""
    if total_vehicles <= 0:
        return 30.0
    weighted = (
        bike_count * 2 + car_count * 4 + auto_count * 3
        + truck_count * 9 + bus_count * 7 + ambulance_count * 8
    )
    return round((weighted / total_vehicles) * 10, 1)


def compute_segment_stats(vehicles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Aggregate vehicles by segment and compute congestion + signal recommendation."""
    segments = get_road_segments()
    by_seg: Dict[int, List[Dict]] = {}
    for s in segments:
        by_seg[s["id"]] = []
    for v in vehicles:
        sid = v.get("segment_id")
        if sid in by_seg:
            by_seg[sid].append(v)

    result = []
    for seg in segments:
        sid = seg["id"]
        vs = by_seg.get(sid, [])
        count = len(vs)
        capacity = seg.get("capacity", 50)
        max_speed = seg.get("max_speed_kmh", 40)
        avg_speed = sum(v.get("speed_kmh", 0) for v in vs) / count if count else 0
        idx = congestion_index(count, capacity, avg_speed, max_speed)
        bike = sum(1 for v in vs if v.get("type") == "bike")
        car = sum(1 for v in vs if v.get("type") == "car")
        auto = sum(1 for v in vs if v.get("type") == "auto")
        truck = sum(1 for v in vs if v.get("type") == "truck")
        bus = sum(1 for v in vs if v.get("type") == "bus")
        ambulance = sum(1 for v in vs if v.get("type") == "ambulance")
        green = recommended_green_time(bike, car, auto, truck, bus, ambulance, count) if count else 30
        result.append({
            "segment_id": sid,
            "name": seg["name"],
            "vehicle_count": count,
            "capacity": capacity,
            "avg_speed_kmh": round(avg_speed, 1),
            "max_speed_kmh": max_speed,
            "congestion_index": idx,
            "color": segment_color(idx),
            "recommended_green_seconds": green,
            "vehicle_mix": {"bike": bike, "car": car, "auto": auto, "truck": truck, "bus": bus, "ambulance": ambulance},
        })
    return result


def top_congested(segment_stats: List[Dict], n: int = 5) -> List[Dict]:
    """Return top N most congested segments."""
    sorted_stats = sorted(segment_stats, key=lambda x: x["congestion_index"], reverse=True)
    return sorted_stats[:n]
