# UrbanShield 2.0 — Smart City Public Safety & Traffic Intelligence

Full-stack hackathon prototype for Indian cities: smart traffic dashboard, emergency corridor, silent SOS, safe travel, and resource optimisation. Uses **simulated/mock data** where real government APIs are unavailable; architecture is production-ready for swapping in live data later.

---

## Tech Stack

| Layer      | Technology |
|-----------|------------|
| Frontend  | React + Tailwind CSS + Vite |
| Maps      | Leaflet.js + OpenStreetMap (no API key) |
| Backend   | Python FastAPI |
| Database  | SQLite (hackathon); upgrade path to PostgreSQL + PostGIS |
| Realtime  | WebSockets |
| Run       | Docker Compose or local (`npm start` + `uvicorn`) |

---

## Quick Start

### Option A: Docker Compose (recommended)

```bash
# From repo root
docker-compose up --build
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:8000  
- **API docs:** http://localhost:8000/docs  

### Option B: Local (no Docker)

**Terminal 1 — Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend proxies `/api` and `/ws` to the backend.

---

## Features

### 1. Traffic Intelligence
- Leaflet map of Bengaluru with **10 fixed road segments**.
- **Simulated traffic:** 50–100 vehicles every 5s (bike/car/auto/truck/bus/ambulance); colored dots (green=bike, blue=car, yellow=auto, purple=truck, red=bus, flashing red=ambulance).
- **Congestion engine:** segment color by congestion index (green &lt; 0.3, yellow 0.3–0.6, red &gt; 0.6).
- **Sidebar:** top 5 congested segments; **signal recommendation table** (road, congestion %, recommended green duration, vehicle mix).

### 2. Emergency Corridor
- **Ambulance Dispatch** button: spawns ambulance, random origin → random hospital (Victoria, Manipal, Fortis Bannerghatta).
- Shortest route via **OSRM** (Leaflet Routing Machine / free); route drawn in orange; **ETA countdown**.
- **Alerts panel:** WhatsApp-style message (“AMBULANCE ALERT: Route from X to Y, ETA: Z, clear: [roads]”).
- **Driver alert** for vehicles within 500m: “Ambulance approaching — move to the left.”
- **Emergency log** table: timestamp, origin, destination, route, ETA, status.

### 3. Silent SOS
- **Mobile-style UI:** large red SOS button; **hold 3s** to activate; **5s cancel** window.
- On confirm: browser geolocation → backend; **112 / WhatsApp / SMS** simulated and shown in **Alert Delivery Status** (green checkmarks).
- **SOS history map:** past SOS as red/orange/green markers (active / responding / resolved); click for time, location, status.

### 4. Safe Travel
- **Start Journey:** destination, trusted contact; capture current location; draw route (OSRM); show ETA.
- **Simulate Journey** moves marker along route; **Simulate Deviation** moves 200m off → **deviation alert** and optional escalation.
- **Check-in at ETA:** “Reached safely? [YES] [NO / SOS]”; no response in 10s → auto-escalate to SOS.
- **Night risk:** toggle heatmap of 30 mock incident points; warning if route passes within 300m of high-density cluster.

### 5. City Planner (Resource Optimisation)
- **Incident heatmap:** SOS + deviation + congestion from DB; time filter: Today / 7 days / 30 days.
- **5×5 zones:** incident_density, infrastructure_score, gap_score; **top 3 gap zones** in red on map.
- **Ranked recommendations** (mock text): streetlights, ambulance points, traffic officers.
- **Budget simulation:** input ₹ lakhs; optimal allocation (streetlight ₹2L, ambulance point ₹15L, officer ₹0.5L/week) with simple bar display.

---

## Demo Mode

Toggle **Demo Mode** in the top bar. Every **30 seconds** it auto-runs:

1. Spawn 80 vehicles  
2. Create congestion event  
3. Dispatch an ambulance  
4. Trigger a Silent SOS from a random location  
5. Show a deviation alert on Safe Travel  

Use this for judge demos without manual interaction.

---

## Project Structure

```
urbanshield/
├── backend/
│   ├── main.py          # FastAPI app, WebSocket, REST
│   ├── simulation.py    # Vehicle/road segment generator (Bengaluru)
│   ├── congestion.py    # Congestion index & signal recommendation
│   ├── corridor.py      # Ambulance route (OSRM), hospitals
│   ├── models.py        # SQLAlchemy models (SQLite)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── TrafficMap.jsx
│   │   │   ├── EmergencyCorridor.jsx
│   │   │   ├── SilentSOS.jsx
│   │   │   ├── SafeTravel.jsx
│   │   │   └── CityPlanner.jsx
│   │   └── hooks/useApi.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Navigation & UI

- **Sidebar:** Traffic Intelligence | Emergency Corridor | Silent SOS | Safe Travel | City Planner  
- **Top bar (live every 5s):** Active Vehicles | SOS Today | Avg Congestion % | Ambulance Dispatches | Demo Mode toggle  
- **Theme:** Dark navy (`#0A0F1E`) sidebar, off-white (`#F5F2EB`) content, teal (`#00897B`) accents  

---

## Deployment (Vercel + Render)

### Vercel (frontend)
1. Connect your repo to Vercel.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build` | Output: `dist`.
4. Environment variables (optional; `.env.production` has defaults):
   - `VITE_API_URL` = `https://urbansheild.onrender.com/api`
   - `VITE_WS_URL` = `wss://urbansheild.onrender.com`

### Render (backend)
1. Create a Web Service; connect your repo.
2. Set **Root Directory** to `backend`.
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Optional env: `CORS_ORIGINS` = comma-separated URLs (e.g. your Vercel app URL).

---

## Production Readiness

- **Data:** All feeds are mocked/simulated; replace with real APIs (e.g. traffic, 108 ambulance, 112) in the same endpoints.
- **DB:** SQLite for speed; for production, point SQLAlchemy to PostgreSQL and add PostGIS for spatial queries.
- **Auth:** No auth in prototype; add admin auth for City Planner and optional user auth for Safe Travel / SOS.
- **Notifications:** Alerts are logged to the Alerts Panel; integrate WhatsApp Business API / SMS gateway when moving to production.

---

## License

MIT (hackathon prototype).
