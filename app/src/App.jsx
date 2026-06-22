import { useEffect, useState } from 'react'
import { BrandLockup } from './components/Brand'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const getRoute = () => {
  const route = window.location.hash.replace('#/', '').trim()
  return route || 'home'
}

function Header({ route }) {
  return (
    <header className="site-header">
      <BrandLockup />
      <nav className="site-nav" aria-label="Main navigation">
        <a className={route === 'home' ? 'active' : ''} href="#/">Home</a>
        <a className={route === 'login' ? 'active' : ''} href="#/login">Login</a>
        <a className={`nav-button ${route === 'register' ? 'active' : ''}`} href="#/register">Register</a>
      </nav>
    </header>
  )
}

function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const page = route === 'login'
    ? <LoginPage />
    : route === 'register'
      ? <RegisterPage />
      : <HomePage />

  return (
    <div className="app-shell">
      <Header route={route} />
      <main>{page}</main>
    </div>
  )
}

export default App
