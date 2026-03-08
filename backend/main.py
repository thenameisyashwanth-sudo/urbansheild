"""
UrbanShield 2.0 — FastAPI backend.
WebSockets for live dashboard; REST for SOS, ambulance, alerts, city planner.
"""
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import (
    init_db,
    get_db,
    SessionLocal,
    EmergencyLog,
    AmbulanceVerificationVote,
    SOSEvent,
    Alert,
    DeviationAlert,
    IncidentPoint,
    ZoneMetric,
)
from simulation import generate_vehicles, get_road_segments, ROAD_SEGMENTS
from congestion import compute_segment_stats, top_congested
from corridor import get_route_osrm, pick_ambulance_origin_destination, get_hospitals
from whatsapp import send_whatsapp_to_trusted_contact, format_sos_message, format_deviation_message

# ---------- Pydantic schemas ----------
class SOSPayload(BaseModel):
    lat: float
    lng: float
    user_name: str = "Demo User"
    blood_type: str = "O+"
    contact_phone: Optional[str] = None  # Trusted contact for WhatsApp
    contact_name: Optional[str] = None
    include_112: bool = True  # If False, SOS goes only to trusted contacts (auto-SOS when no response)


class AmbulanceDispatch(BaseModel):
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    # Verification: hospital/private name + vehicle number (accepted as-is, no validation)
    hospital_or_provider_name: Optional[str] = None
    vehicle_number: Optional[str] = None


class AmbulanceVerifyVote(BaseModel):
    ambulance_log_id: int
    user_id: str = "anonymous"
    lat: float
    lng: float
    vote: str  # "yes" | "no"


class SafeTravelStart(BaseModel):
    dest_lat: float
    dest_lng: float
    dest_name: str = "Destination"
    contact_name: str = "Trusted Contact"
    contact_phone: str = "+91XXXXXXXX"


class DeviationPayload(BaseModel):
    user_name: str = "Demo User"
    lat: float
    lng: float
    expected_route: str = "Planned route"
    contact_phone: Optional[str] = None  # Trusted contact for WhatsApp
    contact_name: Optional[str] = None


# ---------- WebSocket broadcast ----------
class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, data: dict):
        for conn in self.connections:
            try:
                await conn.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()

# ---------- App ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # cleanup if needed


app = FastAPI(title="UrbanShield 2.0 API", lifespan=lifespan)

# CORS: allow Vercel frontend and localhost for dev
import os
_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173," \
    "http://localhost:3000," \
    "https://urbansheild-qjjb08tsy-yashwanth-ss-projects-9b1f702d.vercel.app"\
    "https://urbansheild.vercel.app",
)
_cors_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Traffic: snapshot (used by WS and by REST) ----------
def get_traffic_snapshot():
    vehicles = generate_vehicles()
    segment_stats = compute_segment_stats(vehicles)
    top5 = top_congested(segment_stats, 5)
    return {
        "vehicles": vehicles,
        "segment_stats": segment_stats,
        "top_congested": top5,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/roads")
def roads():
    return get_road_segments()


@app.get("/api/traffic")
def traffic():
    return get_traffic_snapshot()


# ---------- WebSocket: live traffic + broadcast events ----------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            try:
                data = get_traffic_snapshot()
                await ws.send_json({"type": "traffic", "payload": data})
            except Exception:
                break
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(ws)


async def broadcast_event(event_type: str, payload: dict):
    await manager.broadcast({"type": event_type, "payload": payload})


# ---------- Ambulance dispatch ----------
@app.post("/api/ambulance/dispatch")
async def ambulance_dispatch(body: AmbulanceDispatch, db: Session = Depends(get_db)):
    if body.origin_lat is not None and body.origin_lng is not None:
        origin = {"lat": body.origin_lat, "lng": body.origin_lng, "name": "Selected"}
    else:
        origin, dest_prep = pick_ambulance_origin_destination()
        dest = dest_prep
    if body.dest_lat is not None and body.dest_lng is not None:
        dest = {"lat": body.dest_lat, "lng": body.dest_lng, "name": "Selected"}
    else:
        origin, dest = pick_ambulance_origin_destination()

    route = await get_route_osrm(origin["lat"], origin["lng"], dest["lat"], dest["lng"])
    eta_min = route["duration_seconds"] / 60
    road_names = route.get("road_names", ["Route"])

    log = EmergencyLog(
        kind="ambulance",
        origin_lat=origin["lat"],
        origin_lng=origin["lng"],
        destination_lat=dest["lat"],
        destination_lng=dest["lng"],
        route_geojson=json.dumps({"coordinates": route["coordinates"]}),
        road_names=", ".join(road_names),
        eta_minutes=round(eta_min, 1),
        status="active",
        hospital_or_provider_name=body.hospital_or_provider_name or None,
        vehicle_number=body.vehicle_number or None,
        yes_votes=0,
        no_votes=0,
        verification_status="pending",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    payload = {
        "ambulance_id": f"amb_{log.id}",
        "origin": origin,
        "destination": dest,
        "route": route,
        "eta_minutes": round(eta_min, 1),
        "road_names": road_names,
        "log_id": log.id,
        "hospital_or_provider_name": log.hospital_or_provider_name,
        "vehicle_number": log.vehicle_number,
        "verification_status": log.verification_status,
    }
    await broadcast_event("ambulance_dispatch", payload)
    return payload


# ---------- Ambulance verification: crowdsourced yes/no votes ----------
# >20% "no" → escalate to Vision AI (CCTV); most "yes" → crowdsource_verified
@app.post("/api/ambulance/verify-vote")
async def ambulance_verify_vote(body: AmbulanceVerifyVote, db: Session = Depends(get_db)):
    """Users nearby ambulance vote yes/no: 'Is this really an ambulance?'"""
    log = db.query(EmergencyLog).filter(EmergencyLog.id == body.ambulance_log_id).first()
    if not log or log.kind != "ambulance":
        raise HTTPException(404, "Ambulance dispatch not found")
    # One vote per user per ambulance
    existing = db.query(AmbulanceVerificationVote).filter(
        AmbulanceVerificationVote.ambulance_log_id == body.ambulance_log_id,
        AmbulanceVerificationVote.user_id == body.user_id,
    ).first()
    if existing:
        raise HTTPException(400, "You have already voted for this ambulance")

    # Optional: only accept votes from users within ~500m of ambulance route (origin/dest midpoint for simplicity)
    # For demo we accept any vote; in prod you'd check distance
    vote = AmbulanceVerificationVote(
        ambulance_log_id=body.ambulance_log_id,
        user_id=body.user_id,
        lat=body.lat,
        lng=body.lng,
        vote="yes" if body.vote.lower() == "yes" else "no",
    )
    db.add(vote)
    if body.vote.lower() == "yes":
        log.yes_votes = (log.yes_votes or 0) + 1
    else:
        log.no_votes = (log.no_votes or 0) + 1

    total = (log.yes_votes or 0) + (log.no_votes or 0)
    no_pct = (log.no_votes or 0) / total if total else 0
    if no_pct > 0.2:
        log.verification_status = "disputed"
        # Trigger Vision AI (mock for now; integrate Google Vision / CCTV when available)
        log.vision_verified = None  # Pending Vision AI check
    else:
        log.verification_status = "crowdsource_verified"

    db.commit()
    db.refresh(log)
    payload = {"log_id": log.id, "yes_votes": log.yes_votes, "no_votes": log.no_votes, "verification_status": log.verification_status}
    await broadcast_event("ambulance_verification_update", payload)
    return payload


@app.get("/api/ambulance/active")
def ambulance_active(db: Session = Depends(get_db)):
    """Latest active ambulance for proximity alerts (Safe Travel users)."""
    log = db.query(EmergencyLog).filter(
        EmergencyLog.kind == "ambulance",
        EmergencyLog.status == "active"
    ).order_by(EmergencyLog.created_at.desc()).first()
    if not log:
        return None
    route = json.loads(log.route_geojson) if log.route_geojson else {"coordinates": []}
    return {
        "log_id": log.id,
        "origin": {"lat": log.origin_lat, "lng": log.origin_lng},
        "destination": {"lat": log.destination_lat, "lng": log.destination_lng},
        "route": route,
        "road_names": (log.road_names or "").split(", ") if log.road_names else [],
    }


@app.get("/api/ambulance/{log_id}/verification-status")
def ambulance_verification_status(log_id: int, db: Session = Depends(get_db)):
    """Get verification status and vote counts for an ambulance dispatch."""
    log = db.query(EmergencyLog).filter(EmergencyLog.id == log_id).first()
    if not log or log.kind != "ambulance":
        raise HTTPException(404, "Ambulance dispatch not found")
    total = (log.yes_votes or 0) + (log.no_votes or 0)
    no_pct = ((log.no_votes or 0) / total * 100) if total else 0
    return {
        "log_id": log_id,
        "hospital_or_provider_name": log.hospital_or_provider_name,
        "vehicle_number": log.vehicle_number,
        "yes_votes": log.yes_votes or 0,
        "no_votes": log.no_votes or 0,
        "total_votes": total,
        "no_percent": round(no_pct, 1),
        "verification_status": log.verification_status,
        "vision_verified": log.vision_verified,
    }


# ---------- SOS ----------
@app.post("/api/sos/trigger")
async def sos_trigger(body: SOSPayload, db: Session = Depends(get_db)):
    event = SOSEvent(
        lat=body.lat,
        lng=body.lng,
        user_name=body.user_name,
        blood_type=body.blood_type,
        status="active",
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    alerts_sent = ["whatsapp", "sms"]
    if body.include_112:
        alert_112 = Alert(
            channel="112",
            title="112 Alert Sent",
            body=f"SOS from {body.user_name} at ({body.lat}, {body.lng}). Blood: {body.blood_type}",
            delivered=True,
        )
        db.add(alert_112)
        alerts_sent.append("112")

    alert_wa = Alert(
        channel="whatsapp",
        title="WhatsApp Alert",
        body=json.dumps({
            "user": body.user_name,
            "lat": body.lat,
            "lng": body.lng,
            "blood_type": body.blood_type,
        }),
        delivered=True,
    )
    db.add(alert_wa)

    alert_sms = Alert(
        channel="sms",
        title="SMS Fallback",
        body=f"SOS from {body.user_name} at ({body.lat}, {body.lng})",
        delivered=True,
    )
    db.add(alert_sms)
    db.commit()

    # WhatsApp to trusted contact
    if body.contact_phone:
        msg = format_sos_message(body.user_name, body.lat, body.lng, address="", blood_type=body.blood_type)
        await send_whatsapp_to_trusted_contact(body.contact_phone, msg)

    payload = {"sos_id": event.id, "lat": body.lat, "lng": body.lng, "user_name": body.user_name}
    await broadcast_event("sos_trigger", payload)
    return {"sos_id": event.id, "status": "sent", "alerts": alerts_sent}


@app.get("/api/sos/history")
def sos_history(db: Session = Depends(get_db)):
    events = db.query(SOSEvent).order_by(SOSEvent.created_at.desc()).limit(100).all()
    return [
        {
            "id": e.id,
            "lat": e.lat,
            "lng": e.lng,
            "user_name": e.user_name,
            "status": e.status,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "address": e.address,
        }
        for e in events
    ]


# ---------- Reverse geocode (Nominatim) ----------
@app.get("/api/geocode/reverse")
async def reverse_geocode(lat: float, lng: float):
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json"},
                headers={"User-Agent": "UrbanShield/2.0"},
            )
            data = r.json()
        return {"address": data.get("display_name", f"{lat}, {lng}")}
    except Exception:
        return {"address": f"{lat}, {lng}"}


# ---------- Safe travel: route + deviation ----------
@app.post("/api/safe-travel/route")
async def safe_travel_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float):
    route = await get_route_osrm(origin_lat, origin_lng, dest_lat, dest_lng)
    return route


@app.post("/api/safe-travel/deviation")
async def report_deviation(body: DeviationPayload, db: Session = Depends(get_db)):
    a = DeviationAlert(user_name=body.user_name, lat=body.lat, lng=body.lng, expected_route=body.expected_route)
    db.add(a)
    db.commit()
    # WhatsApp to trusted contact
    if body.contact_phone:
        msg = format_deviation_message(body.user_name, body.lat, body.lng, body.expected_route)
        await send_whatsapp_to_trusted_contact(body.contact_phone, msg)
    payload = {"user_name": body.user_name, "lat": body.lat, "lng": body.lng, "expected_route": body.expected_route}
    await broadcast_event("deviation_alert", payload)
    return {"ok": True}


# ---------- Alerts panel (WhatsApp/SMS simulation) ----------
@app.get("/api/alerts")
def list_alerts(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    return [
        {"id": r.id, "channel": r.channel, "title": r.title, "body": r.body, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]


# ---------- Emergency log ----------
@app.get("/api/emergency-log")
def emergency_log(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(EmergencyLog).order_by(EmergencyLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "origin_lat": r.origin_lat,
            "origin_lng": r.origin_lng,
            "destination_lat": r.destination_lat,
            "destination_lng": r.destination_lng,
            "road_names": r.road_names,
            "eta_minutes": r.eta_minutes,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "hospital_or_provider_name": getattr(r, "hospital_or_provider_name", None),
            "vehicle_number": getattr(r, "vehicle_number", None),
            "yes_votes": getattr(r, "yes_votes", 0) or 0,
            "no_votes": getattr(r, "no_votes", 0) or 0,
            "verification_status": getattr(r, "verification_status", "pending") or "pending",
        }
        for r in rows
    ]


# ---------- City planner ----------
@app.get("/api/planner/incidents")
def planner_incidents(db: Session = Depends(get_db), days: int = 7):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)
    points = db.query(IncidentPoint).filter(IncidentPoint.created_at >= since).all()
    sos = db.query(SOSEvent).filter(SOSEvent.created_at >= since).all()
    dev = db.query(DeviationAlert).filter(DeviationAlert.created_at >= since).all()
    result = []
    for p in points:
        result.append([p.lat, p.lng, 0.5])
    for s in sos:
        result.append([s.lat, s.lng, 0.8])
    for d in dev:
        result.append([d.lat, d.lng, 0.6])
    if not result:
        import random
        for _ in range(30):
            result.append([
                12.97 + (random.random() - 0.5) * 0.15,
                77.59 + (random.random() - 0.5) * 0.2,
                0.4 + random.random() * 0.5,
            ])
    return result


@app.get("/api/planner/zones")
def planner_zones(db: Session = Depends(get_db)):
    # Mock 5x5 grid zones with gap scores
    zones = []
    names = ["Central", "North", "South", "East", "West"]
    for i in range(1, 6):
        for j, n in enumerate(names):
            zid = f"{i}-{n}"
            zones.append({
                "zone_id": zid,
                "incident_density": 0.1 * (i + j) + 0.05,
                "infrastructure_score": max(1, 3 - (i + j) % 3),
                "recommendation": f"Zone {zid}: Sample recommendation.",
            })
    for z in zones:
        z["gap_score"] = z["incident_density"] / max(0.1, z["infrastructure_score"])
    zones.sort(key=lambda x: x["gap_score"], reverse=True)
    return {"zones": zones[:10], "top_gap_ids": [z["zone_id"] for z in zones[:3]]}


@app.get("/api/planner/budget")
def planner_budget(available_lakhs: float = 20):
    interventions = [
        {"id": "streetlight", "name": "Streetlight", "cost_lakhs": 2, "impact": "0.8 SOS/week"},
        {"id": "ambulance_point", "name": "Ambulance point", "cost_lakhs": 15, "impact": "4 min response"},
        {"id": "traffic_officer", "name": "Traffic officer (weekly)", "cost_lakhs": 0.5, "impact": "12% congestion"},
    ]
    rem = available_lakhs
    allocation = []
    # Greedy: as many streetlights, then ambulance, then officers
    n_lights = int(rem / 2)
    if n_lights > 0:
        allocation.append({"intervention": "streetlight", "count": n_lights, "cost": n_lights * 2})
        rem -= n_lights * 2
    if rem >= 15:
        allocation.append({"intervention": "ambulance_point", "count": 1, "cost": 15})
        rem -= 15
    n_officers = int(rem / 0.5)
    if n_officers > 0:
        allocation.append({"intervention": "traffic_officer", "count": n_officers, "cost": n_officers * 0.5})
    return {"available_lakhs": available_lakhs, "interventions": interventions, "allocation": allocation}


# ---------- Hospitals ----------
@app.get("/api/hospitals")
def hospitals():
    return get_hospitals()


# ---------- Demo mode: trigger all events (called by frontend or cron) ----------
@app.post("/api/demo/run")
async def demo_run(db: Session = Depends(get_db)):
    """Trigger one of each: traffic spike, ambulance, SOS, deviation. For demo mode."""
    # 1) Ambulance
    origin, dest = pick_ambulance_origin_destination()
    route = await get_route_osrm(origin["lat"], origin["lng"], dest["lat"], dest["lng"])
    eta_min = route["duration_seconds"] / 60
    log = EmergencyLog(
        kind="ambulance",
        origin_lat=origin["lat"],
        origin_lng=origin["lng"],
        destination_lat=dest["lat"],
        destination_lng=dest["lng"],
        road_names=", ".join(route.get("road_names", ["Route"])),
        eta_minutes=round(eta_min, 1),
        status="active",
    )
    db.add(log)
    db.commit()
    await broadcast_event("ambulance_dispatch", {
        "ambulance_id": f"amb_{log.id}",
        "origin": origin,
        "destination": dest,
        "route": route,
        "eta_minutes": round(eta_min, 1),
        "road_names": route.get("road_names", []),
        "log_id": log.id,
    })

    # 2) SOS
    import random
    lat = 12.9716 + random.uniform(-0.05, 0.05)
    lng = 77.5963 + random.uniform(-0.05, 0.05)
    sos = SOSEvent(lat=lat, lng=lng, user_name="Demo User", blood_type="O+", status="active")
    db.add(sos)
    db.commit()
    await broadcast_event("sos_trigger", {"sos_id": sos.id, "lat": lat, "lng": lng})

    # 3) Deviation
    dev = DeviationAlert(user_name="Demo User", lat=lat, lng=lng, expected_route="MG Road")
    db.add(dev)
    db.commit()
    await broadcast_event("deviation_alert", {"user_name": "Demo User", "lat": lat, "lng": lng, "expected_route": "MG Road"})

    return {"ok": True, "ambulance_log_id": log.id, "sos_id": sos.id}


@app.get("/api/stats")
def live_stats(db: Session = Depends(get_db)):
    """Active vehicles count, SOS today, avg congestion, ambulance dispatches."""
    from sqlalchemy import func
    today = datetime.utcnow().date()
    sos_today = db.query(SOSEvent).filter(func.date(SOSEvent.created_at) == today).count()
    ambulance_count = db.query(EmergencyLog).filter(EmergencyLog.kind == "ambulance").count()
    snap = get_traffic_snapshot()
    n_vehicles = len(snap["vehicles"])
    avg_cong = sum(s["congestion_index"] for s in snap["segment_stats"]) / max(1, len(snap["segment_stats"]))
    return {
        "active_vehicles": n_vehicles,
        "sos_alerts_today": sos_today,
        "avg_congestion_pct": round(avg_cong * 100, 1),
        "ambulance_dispatches": ambulance_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
