import { useEffect, useState } from 'react'
import './App.css'
import { BrandLockup, VectorGesturePreview } from './components/Brand.jsx'
import LoginPage from './pages/login.js'
import RegisterPage from './pages/register.js'

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
        <a className="nav-button" href="#/register">Register</a>
      </nav>
    </header>
  )
}

function LandingPage() {
  const systemPoints = [
    {
      title: 'Filipino Sign Language first',
      text: 'SignCast is shaped around FSL communication needs for Filipino users, learners, interpreters, and accessibility support teams.',
    },
    {
      title: 'Browser-based recognition',
      text: 'The app direction focuses on local camera landmarks, vector geometry, and fast gesture matching inside the browser.',
    },
    {
      title: 'Admin web workspace',
      text: 'The web side gives administrators a clear place to manage accounts, review usage, and maintain recognition content later.',
    },
  ]

  const workflow = ['Camera landmarks', 'Vector geometry', 'FSL rule matching', 'Text and speech output']

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Accessibility technology for Filipino Sign Language</p>
          <h1>SignCast turns FSL gestures into readable communication.</h1>
          <p className="hero-text">
            A browser and app system for translating Filipino Sign Language gestures into text and speech using landmark tracking and vector-based gesture rules.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#/register">Create account</a>
            <a className="secondary-action" href="#/login">Login</a>
          </div>
        </div>
        <VectorGesturePreview />
      </section>

      <section className="section-block about-section">
        <div>
          <p className="eyebrow">About us</p>
          <h2>Built for inclusive, low-latency communication.</h2>
        </div>
        <p>
          SignCast supports a study focused on making Filipino Sign Language interaction more accessible through local browser processing. The goal is to reduce dependence on expensive cloud recognition services while giving users and admins a clean, reliable interface.
        </p>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">System overview</p>
          <h2>One platform for FSL users and web administrators.</h2>
        </div>
        <div className="info-grid">
          {systemPoints.map((point) => (
            <article className="info-card" key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="process-band" aria-label="SignCast process">
        {workflow.map((item, index) => (
          <div className="process-step" key={item}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <section className="section-block split-section">
        <div>
          <p className="eyebrow">For visitors</p>
          <h2>Learn the system before creating an account.</h2>
          <p>
            Visitors can understand the purpose, accessibility value, and FSL focus of SignCast from this landing page before moving to the app or admin web login.
          </p>
        </div>
        <div className="quote-panel">
          <strong>Study focus</strong>
          <p>Browser-based Filipino Sign Language recognition using landmark vectors, stability checks, and speech synthesis.</p>
        </div>
      </section>
    </>
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
      : <LandingPage />

  return (
    <div className="app-shell">
      <Header route={route} />
      <main>{page}</main>
    </div>
  )
}

export default App
