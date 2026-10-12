import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AuthDialog } from './components/AuthDialog'
import { BootSequence } from './components/BootSequence'
import { ConfigBanner } from './components/ConfigBanner'
import { SiteHeader } from './components/SiteHeader'
import { DeskPage } from './pages/DeskPage'
import { ProfilePage } from './pages/ProfilePage'
import { TeamFormPage } from './pages/TeamFormPage'
import { TeamPage } from './pages/TeamPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BootSequence />
        <SiteHeader />
        <ConfigBanner />
        <main>
          <Routes>
            <Route path="/" element={<DeskPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/teams/new" element={<TeamFormPage />} />
            <Route path="/teams/:teamId" element={<TeamPage />} />
          </Routes>
        </main>
        <footer className="colophon">
          <p>A night desk for hackathon squads. UI gestures adapted from Uiverse Galaxy, retinted for this board.</p>
        </footer>
        <AuthDialog />
      </AuthProvider>
    </BrowserRouter>
  )
}
