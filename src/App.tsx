import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { GuestRoute } from './components/GuestRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { SubscriberListPage } from './pages/SubscriberListPage'
import { CampaignListPage } from './pages/CampaignListPage'

function App() {
    return (
        <Routes>
            {/* Public - not behind GuestRoute, since an already-authenticated
                visitor should still see the landing page (with a "Go to
                Dashboard" CTA instead of "Log in"), not get force-redirected
                away from it. */}
            <Route path="/" element={<LandingPage />} />

            <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/subscribers" element={<SubscriberListPage />} />
                    <Route path="/campaigns" element={<CampaignListPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
