"use client"
import { Globe3D } from "./3d-globe"

const sampleMarkers = [
  { lat: 12.9716, lng: 77.5946, src: "https://assets.aceternity.com/avatars/6.webp", label: "Bengaluru" },
  { lat: 19.076, lng: 72.8777, src: "https://assets.aceternity.com/avatars/2.webp", label: "Mumbai" },
  { lat: 28.6139, lng: 77.209, src: "https://assets.aceternity.com/avatars/6.webp", label: "New Delhi" },
  { lat: 22.5726, lng: 88.3639, src: "https://assets.aceternity.com/avatars/4.webp", label: "Kolkata" },
  { lat: 13.0827, lng: 80.2707, src: "https://assets.aceternity.com/avatars/1.webp", label: "Chennai" },
  { lat: 40.7128, lng: -74.006, src: "https://assets.aceternity.com/avatars/1.webp", label: "New York" },
  { lat: 51.5074, lng: -0.1278, src: "https://assets.aceternity.com/avatars/2.webp", label: "London" },
  { lat: 35.6762, lng: 139.6503, src: "https://assets.aceternity.com/avatars/3.webp", label: "Tokyo" },
  { lat: -33.8688, lng: 151.2093, src: "https://assets.aceternity.com/avatars/4.webp", label: "Sydney" },
  { lat: 48.8566, lng: 2.3522, src: "https://assets.aceternity.com/avatars/5.webp", label: "Paris" },
]

export default function Globe3DDemo({ onMarkerClick, onMarkerHover }) {
  return (
    <Globe3D
      markers={sampleMarkers}
      config={{
        atmosphereColor: "#00f0ff",
        atmosphereIntensity: 0.25,
        bumpScale: 5,
        autoRotateSpeed: 0.3,
        showAtmosphere: true,
      }}
      onMarkerClick={onMarkerClick}
      onMarkerHover={onMarkerHover}
    />
  )
}
