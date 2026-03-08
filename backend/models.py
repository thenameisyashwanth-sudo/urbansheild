"""
SQLAlchemy models for UrbanShield 2.0.
SQLite for hackathon; swap engine for PostgreSQL+PostGIS when moving to production.
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()
DATABASE_URL = "sqlite:///./urbanshield.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_ambulance_verification()


def _migrate_ambulance_verification():
    """Add ambulance verification columns to existing emergency_log table."""
    from sqlalchemy import text
    conn = engine.connect()
    try:
        for col, col_type in [
            ("hospital_or_provider_name", "VARCHAR(256)"),
            ("vehicle_number", "VARCHAR(64)"),
            ("yes_votes", "INTEGER DEFAULT 0"),
            ("no_votes", "INTEGER DEFAULT 0"),
            ("verification_status", "VARCHAR(32) DEFAULT 'pending'"),
            ("vision_verified", "INTEGER"),  # 1=True, 0=False, NULL=pending
        ]:
            try:
                conn.execute(text(f"ALTER TABLE emergency_log ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                conn.rollback()
    finally:
        conn.close()


# ---------- Traffic ----------
class RoadSegment(Base):
    __tablename__ = "road_segments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    capacity = Column(Integer, default=50)
    max_speed_kmh = Column(Float, default=40.0)
    lat_start = Column(Float)
    lng_start = Column(Float)
    lat_end = Column(Float)
    lng_end = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleEvent(Base):
    __tablename__ = "vehicle_events"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_type = Column(String(32))  # bike, car, auto, truck, bus, ambulance
    segment_id = Column(Integer)
    lat = Column(Float)
    lng = Column(Float)
    speed_kmh = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)


# ---------- Emergency corridor ----------
class EmergencyLog(Base):
    __tablename__ = "emergency_log"
    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(32))  # ambulance, sos, deviation
    origin_lat = Column(Float)
    origin_lng = Column(Float)
    destination_lat = Column(Float)
    destination_lng = Column(Float)
    route_geojson = Column(Text, nullable=True)
    road_names = Column(Text, nullable=True)
    eta_minutes = Column(Float, nullable=True)
    status = Column(String(32), default="active")  # active, responding, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    # Ambulance verification: hospital/private name + vehicle number (accepted as-is)
    hospital_or_provider_name = Column(String(256), nullable=True)
    vehicle_number = Column(String(64), nullable=True)
    # Crowdsource: yes_votes, no_votes; >20% no triggers Vision AI check
    yes_votes = Column(Integer, default=0)
    no_votes = Column(Integer, default=0)
    verification_status = Column(String(32), default="pending")  # pending, crowdsource_verified, vision_verified, disputed, rejected
    vision_verified = Column(Boolean, nullable=True)  # True/False after Vision AI check; None = not checked


class AmbulanceVerificationVote(Base):
    """User votes (yes/no) on whether nearby ambulance is real. One vote per user per ambulance."""
    __tablename__ = "ambulance_verification_votes"
    id = Column(Integer, primary_key=True, index=True)
    ambulance_log_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(128), default="anonymous")  # device id or user id
    lat = Column(Float)
    lng = Column(Float)
    vote = Column(String(8), nullable=False)  # yes | no
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------- SOS ----------
class SOSEvent(Base):
    __tablename__ = "sos_events"
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float)
    lng = Column(Float)
    user_name = Column(String(128), default="Demo User")
    blood_type = Column(String(8), default="O+")
    status = Column(String(32), default="active")  # active, responding, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    address = Column(String(256), nullable=True)


# ---------- Alerts (WhatsApp/SMS simulation log) ----------
class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    channel = Column(String(32))  # whatsapp, sms, 112
    title = Column(String(128))
    body = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered = Column(Boolean, default=True)


# ---------- Safe travel / deviation ----------
class DeviationAlert(Base):
    __tablename__ = "deviation_alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(128))
    lat = Column(Float)
    lng = Column(Float)
    expected_route = Column(String(256))
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------- City planner: incident points for heatmap ----------
class IncidentPoint(Base):
    __tablename__ = "incident_points"
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float)
    lng = Column(Float)
    kind = Column(String(32))  # sos, deviation, congestion, ambulance_delay
    zone_id = Column(String(16))  # e.g. "4-North"
    created_at = Column(DateTime, default=datetime.utcnow)


class ZoneMetric(Base):
    __tablename__ = "zone_metrics"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(16))
    incident_density = Column(Float)
    infrastructure_score = Column(Float)
    gap_score = Column(Float)
    recommendation = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
