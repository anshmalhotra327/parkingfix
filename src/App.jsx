import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from './utils/api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Heatmap from './pages/Heatmap'
import Junctions from './pages/Junctions'
import Offenders from './pages/Offenders'
import Patrol from './pages/Patrol'
import Violations from './pages/Violations'
import Metro from './pages/Metro'
import Alerts from './pages/Alerts'
import Predict from './pages/Predict'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } })

function Guard({ children }) {
  const { token, officer, fetchMe } = useAuth()
  useEffect(() => { if (token && !officer) fetchMe() }, [token])
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="heatmap"   element={<Heatmap />} />
            <Route path="junctions" element={<Junctions />} />
            <Route path="offenders" element={<Offenders />} />
            <Route path="patrol"    element={<Patrol />} />
            <Route path="violations"element={<Violations />} />
            <Route path="metro"     element={<Metro />} />
            <Route path="alerts"    element={<Alerts />} />
            <Route path="predict"   element={<Predict />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
