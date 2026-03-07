import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { BENGALURU_CENTER, ROAD_SEGMENTS, VEHICLE_TYPES } from './bengaluruData'

const typeColor = VEHICLE_TYPES.reduce((acc, v) => {
  acc[v.type] = v.color
  return acc
}, {})

const CONGESTION_COLOR = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

export default function CityMap({ vehicles, congestionData }) {
  return (
    <MapContainer
      center={BENGALURU_CENTER}
      zoom={12}
      scrollWheelZoom
      className="w-full h-full rounded-xl overflow-hidden"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {congestionData.map((seg) => {
        const meta = ROAD_SEGMENTS.find((r) => r.id === seg.segmentId)
        if (!meta) return null
        const color = CONGESTION_COLOR[seg.color] || '#4b5563'
        return (
          <Polyline
            key={seg.segmentId}
            positions={[meta.start, meta.end]}
            pathOptions={{ color, weight: 6, opacity: 0.8 }}
          />
        )
      })}

      {vehicles.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={v.type === 'ambulance' ? 7 : 4}
          pathOptions={{
            color: '#000000',
            weight: 1,
            fillColor: typeColor[v.type] || '#64748b',
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-semibold capitalize">{v.type}</div>
              <div>{v.speed.toFixed(0)} km/h</div>
              <div className="text-[10px] opacity-70">{v.segmentName}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

