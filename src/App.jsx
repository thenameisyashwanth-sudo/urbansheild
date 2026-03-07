import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import TrafficIntelligence from './pages/TrafficIntelligence'
import EmergencyCorridor from './pages/EmergencyCorridor'
import SilentSOS from './pages/SilentSOS'
import SafeTravel from './pages/SafeTravel'
import CityPlanner from './pages/CityPlanner'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<TrafficIntelligence />} />
          <Route path="/emergency" element={<EmergencyCorridor />} />
          <Route path="/sos" element={<SilentSOS />} />
          <Route path="/safe-travel" element={<SafeTravel />} />
          <Route path="/planner" element={<CityPlanner />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
