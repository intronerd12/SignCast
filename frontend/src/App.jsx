import { useState, useEffect, useCallback } from 'react'
import './App.css'
import LoginPage from './pages/login.js'
import RegisterPage from './pages/register.js'
import { clearSession, getSavedSession, updateSavedSession } from './auth/authClient.js'
import { getRoute } from './helpers.js'

import Header from './components/Header.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import TrainerPage from './pages/TrainerPage.jsx'
import RecognitionWorkspace from './pages/RecognitionWorkspace.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import MarketingPage from './pages/MarketingPage.jsx'

function App() {
  const [route, setRoute] = useState(getRoute)
  const [session, setSession] = useState(getSavedSession)

  useEffect(() => {
    const updateRoute = () => {
      setRoute(getRoute())
      setSession(getSavedSession())
    }

    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const isAuthenticated = Boolean(session?.token)
  const isAdminRoute = route === 'admin'
  const isUserWorkspaceRoute = route === 'app' || route === 'recognizer' || route === 'library' || route === 'trainer'
  const isProtectedRoute = isUserWorkspaceRoute || route === 'profile' || isAdminRoute

  useEffect(() => {
    if (isProtectedRoute && !isAuthenticated) {
      window.location.hash = '#/login'
      return
    }

    if (isAdminRoute && isAuthenticated && !session?.isAdmin) {
      window.location.hash = '#/app'
      return
    }

    if (isUserWorkspaceRoute && isAuthenticated && session?.isAdmin) {
      window.location.hash = '#/admin'
    }
  }, [isAuthenticated, isAdminRoute, isProtectedRoute, isUserWorkspaceRoute, session?.isAdmin])

  const handleLoggedIn = (newSession) => {
    setSession(newSession)
    window.location.hash = newSession?.isAdmin ? '#/admin' : '#/app'
  }

  const handleSessionUpdated = useCallback((updates) => {
    const nextSession = updateSavedSession(updates)
    if (nextSession) {
      setSession(nextSession)
      return
    }

    setSession((current) => current ? { ...current, ...updates } : current)
  }, [])

  const handleLogout = () => {
    clearSession()
    setSession(null)
    window.location.hash = '#/'
  }

  const page = route === 'login'
    ? <LoginPage onLoggedIn={handleLoggedIn} />
    : route === 'register'
      ? <RegisterPage />
      : route === 'admin'
        ? <AdminPage session={session} onLogout={handleLogout} />
        : route === 'profile'
          ? <ProfilePage session={session} onSessionUpdated={handleSessionUpdated} />
        : route === 'library'
          ? <LibraryPage session={session} />
          : route === 'trainer'
            ? <TrainerPage session={session} />
          : route === 'recognizer'
            ? <RecognitionWorkspace session={session} />
          : route === 'app'
            ? <DashboardPage session={session} />
            : <MarketingPage />

  if (route === 'admin') {
    return <div className="app-shell admin-shell">{page}</div>
  }

  return (
    <div className="app-shell">
      <Header route={route} isAuthenticated={isAuthenticated} session={session} onLogout={handleLogout} />
      <main>{page}</main>
    </div>
  )
}

export default App
