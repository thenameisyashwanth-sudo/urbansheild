/**
 * API and WebSocket config.
 * In production (Vercel): set VITE_API_URL and VITE_WS_URL in environment variables.
 * In development: uses Vite proxy for /api and localhost:8000 for WebSocket.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  // Dev: connect to backend via host and port
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = window.location.port === '5173' ? '8000' : window.location.port || (proto === 'wss:' ? '443' : '80')
  return `${proto}//${host}:${port}/ws`
}
