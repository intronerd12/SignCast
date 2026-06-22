import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { BrandLockup } from './components/Brand.jsx'
import LoginPage from './pages/login.js'
import RegisterPage from './pages/register.js'
import { clearSession, getSavedSession } from './auth/authClient'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const getRoute = () => {
  const route = window.location.hash.replace('#/', '').trim()
  return route || 'marketing'
}

const aslSamples = [
  { phrase: 'Hello', confidence: 94, motion: 'Open palm wave', stability: 'Stable' },
  { phrase: 'Thank you', confidence: 91, motion: 'Fingertips from chin outward', stability: 'Stable' },
  { phrase: 'Please', confidence: 87, motion: 'Flat palm circular chest motion', stability: 'Checking' },
  { phrase: 'Yes', confidence: 89, motion: 'Closed fist nod', stability: 'Stable' },
]

function Header({ route, isAuthenticated, onLogout }) {
  return (
    <header className="site-header">
      <BrandLockup />
      <nav className="site-nav" aria-label="Main navigation">
        {!isAuthenticated && (
          <>
            <a className={route === 'marketing' ? 'active' : ''} href="#/">Marketing</a>
            <a className={route === 'login' ? 'active' : ''} href="#/login">Login</a>
            <a className="nav-button" href="#/register">Register</a>
          </>
        )}
        {isAuthenticated && (
          <>
            <a className={route === 'app' ? 'active' : ''} href="#/app">App</a>
            <a className={route === 'library' ? 'active' : ''} href="#/library">Library</a>
            <button type="button" className="app-logout" onClick={onLogout}>Logout</button>
          </>
        )}
      </nav>
    </header>
  )
}

function MarketingPage() {
  return (
    <section className="marketing-layout">
      <article className="marketing-hero">
        <p className="eyebrow">Filipino Sign Language Recognition Platform</p>
        <h1>Bridge communication barriers with intelligent FSL recognition</h1>
        
        <div className="hero-visualization">
          <svg viewBox="0 0 300 150" className="hero-svg">
            <circle cx="60" cy="40" r="35" fill="#0f766e" opacity="0.15" />
            <circle cx="240" cy="80" r="28" fill="#d97706" opacity="0.12" />
            <circle cx="150" cy="120" r="25" fill="#0f766e" opacity="0.1" />
            <rect x="80" y="90" width="40" height="40" fill="#d97706" opacity="0.12" transform="rotate(15 100 110)" />
            <rect x="200" y="30" width="30" height="30" fill="#0f766e" opacity="0.08" transform="rotate(-20 215 45)" />
          </svg>
        </div>
        
        <p>
          SignCast is a mobile-first and web-based platform that recognizes and translates Filipino Sign Language (FSL) in real time. 
          Whether you are a learner, interpreter, or educator, SignCast helps you understand FSL gestures, build phrases, and communicate more effectively.
        </p>
        <div className="marketing-actions">
          <a className="submit-button" href="#/login">Log in to the app</a>
          <a className="outline-button" href="#/register">Create account</a>
        </div>
      </article>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">What we do</p>
          <h2>Real-time FSL recognition and translation</h2>
        </div>
        
        <svg viewBox="0 0 400 80" className="flow-diagram">
          <circle cx="40" cy="40" r="18" fill="none" stroke="#e0ebe8" strokeWidth="2" />
          <line x1="60" y1="40" x2="140" y2="40" stroke="#dce9e6" strokeWidth="2" />
          <circle cx="160" cy="40" r="18" fill="#dce9e6" stroke="#0f766e" strokeWidth="3" />
          <line x1="180" y1="40" x2="260" y2="40" stroke="#dce9e6" strokeWidth="2" />
          <circle cx="280" cy="40" r="18" fill="#0f766e" stroke="#0f766e" strokeWidth="2" />
          <text x="40" y="70" textAnchor="middle" fontSize="11" fill="#667472">Input</text>
          <text x="160" y="70" textAnchor="middle" fontSize="11" fill="#667472">Process</text>
          <text x="280" y="70" textAnchor="middle" fontSize="11" fill="#667472">Output</text>
        </svg>
        
        <div className="section-content">
          <p>
            SignCast uses advanced computer vision and machine learning to identify hand landmarks, track gesture motion, 
            and translate FSL signs into readable text. Our platform captures your camera input, analyzes gesture confidence, 
            and outputs both transcripts and audio feedback so you can verify translations instantly.
          </p>
          <ul className="feature-list">
            <li><strong>Live hand tracking:</strong> 21-point hand landmark detection for precise gesture analysis</li>
            <li><strong>Confidence metrics:</strong> Know how sure the system is about each recognized sign</li>
            <li><strong>Phrase building:</strong> Create and organize sentences from recognized signs</li>
            <li><strong>Accessible output:</strong> Get text transcripts and speech synthesis for any phrase</li>
          </ul>
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">What we want to achieve</p>
          <h2>Make FSL learning and communication accessible to everyone</h2>
        </div>
        <div className="section-content">
          <p>
            We believe sign language should be as accessible as spoken language. Our mission is to remove barriers for learners, 
            support interpreters with faster transcription, and help educators teach FSL more effectively. We are building a future 
            where Deaf and Hard of Hearing communities can communicate seamlessly with everyone around them.
          </p>
          <div className="achievement-grid">
            <div className="achievement-card">
              <div className="achievement-icon">🎓</div>
              <p className="achievement-eyebrow">For learners</p>
              <p>Practice and master FSL signs with instant feedback from our recognition engine.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon">🗣️</div>
              <p className="achievement-eyebrow">For interpreters</p>
              <p>Speed up your workflow with AI-assisted transcription and phrase management.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon">📚</div>
              <p className="achievement-eyebrow">For educators</p>
              <p>Teach FSL more effectively using mobile or web tools that track student progress.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">How we help you</p>
          <h2>Everything you need to master and use FSL</h2>
        </div>
        <div className="section-content">
          <p>
            SignCast provides two complementary tools: a mobile app for learners and on-the-go recognition, 
            and a web workspace for deeper analysis, phrase management, and admin oversight. Both work together 
            to give you a complete FSL experience.
          </p>
        </div>
        <div className="help-grid">
          <article>
            <div className="help-icon help-icon-camera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 8V4M12 20v-4M16 12h4M4 12h4M15.5 8.5l2-2M8.5 15.5l-2 2M15.5 15.5l2 2M8.5 8.5l-2-2" />
              </svg>
            </div>
            <span>Mobile app</span>
            <h3>Learn anytime, anywhere</h3>
            <p>
              Open your phone and start practicing. The mobile app gives you live camera recognition, 
              confidence scores, and instant feedback on your FSL signing.
            </p>
          </article>
          <article>
            <div className="help-icon help-icon-web">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M2 17h20" />
                <path d="M6 20h12" />
              </svg>
            </div>
            <span>Web workspace</span>
            <h3>Deep dive into recognition</h3>
            <p>
              Build a comprehensive sign library, manage phrase transcripts, and review recognition analytics. 
              Perfect for detailed insights and organization.
            </p>
          </article>
          <article>
            <div className="help-icon help-icon-admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span>Admin tools</span>
            <h3>Manage teams and workflows</h3>
            <p>
              Set up user accounts, track progress across your organization, and customize recognition settings. 
              Full control over FSL infrastructure.
            </p>
          </article>
        </div>
      </section>

      <div className="marketing-grid">
        <article>
          <div className="grid-icon">👁️</div>
          <span>Features</span>
          <h3>Recognition workspace</h3>
          <p>Live camera input, phrase confidence, sentence transcript, and speech output in one interface.</p>
        </article>
        <article>
          <div className="grid-icon">⚡</div>
          <span>Getting started</span>
          <h3>Sign up in seconds</h3>
          <p>Create a learner account to access the mobile app, or request admin status if you are an educator or organization.</p>
        </article>
        <article>
          <div className="grid-icon">🤝</div>
          <span>Support and community</span>
          <h3>Learn from the community</h3>
          <p>Join our learner community, access FSL guides, and get help from interpreters and educators building with SignCast.</p>
        </article>
      </div>

      <section className="marketing-cta">
        <div className="cta-visual">
          <div className="cta-shape cta-shape-1" />
          <div className="cta-shape cta-shape-2" />
          <div className="cta-shape cta-shape-3" />
        </div>
        <h2>Ready to master Filipino Sign Language?</h2>
        <p>Join thousands of learners, interpreters, and educators using SignCast to bridge communication.</p>
        <div className="marketing-actions">
          <a className="submit-button" href="#/register">Create your account</a>
          <a className="outline-button" href="#/login">Already a member? Log in</a>
        </div>
      </section>
    </section>
  )
}

function RecognitionWorkspace() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraState, setCameraState] = useState('off')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [apiStatus, setApiStatus] = useState('Ready')

  const currentSign = aslSamples[selectedIndex]
  const sentence = useMemo(() => transcript.map((item) => item.phrase).join(' '), [transcript])

  useEffect(() => {
    if (cameraState !== 'active') return undefined

    const timer = window.setInterval(() => {
      setSelectedIndex((current) => (current + 1) % aslSamples.length)
    }, 2600)

    return () => window.clearInterval(timer)
  }, [cameraState])

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setApiStatus('Opening camera')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraState('active')
      setApiStatus('Camera active')
    } catch (error) {
      setCameraState('blocked')
      setApiStatus('Camera permission needed')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraState('off')
  }

  const captureSign = async () => {
    const payload = {
      landmarks: [],
      hint: currentSign.phrase,
      source: 'web-prototype',
    }

    try {
      setApiStatus('Interpreting')
      const response = await fetch(`${API_BASE}/recognition/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Recognition service unavailable')
      }

      setTranscript((current) => [
        ...current,
        {
          phrase: data.phrase || currentSign.phrase,
          confidence: data.confidence || currentSign.confidence,
        },
      ])
      setApiStatus('Saved to transcript')
    } catch (error) {
      setTranscript((current) => [...current, currentSign])
      setApiStatus('Saved locally')
    }
  }

  const speakSentence = () => {
    if (!sentence || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(sentence))
  }

  const clearTranscript = () => {
    setTranscript([])
    setApiStatus('Transcript cleared')
  }

  return (
    <section className="recognizer-shell">
      <div className="phone-stage" aria-label="ASL recognition mobile preview">
        <div className="camera-panel">
          <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
          {cameraState !== 'active' && (
            <div className="camera-placeholder">
              <span className="scan-frame" />
              <strong>ASL camera</strong>
              <small>{cameraState === 'blocked' ? 'Enable camera permission in your browser.' : 'Camera preview is off.'}</small>
            </div>
          )}
          <div className="tracking-overlay">
            <span className="tracking-dot wrist" />
            <span className="tracking-dot thumb" />
            <span className="tracking-dot index" />
            <span className="tracking-dot middle" />
            <span className="tracking-line line-a" />
            <span className="tracking-line line-b" />
          </div>
          <div className="camera-topbar">
            <span>{apiStatus}</span>
            <strong>{cameraState === 'active' ? 'Live' : 'Idle'}</strong>
          </div>
        </div>

        <div className="recognition-readout">
          <div>
            <span className="label">Detected sign</span>
            <h1>{currentSign.phrase}</h1>
          </div>
          <div className="confidence-meter" aria-label={`Confidence ${currentSign.confidence} percent`}>
            <span style={{ width: `${currentSign.confidence}%` }} />
          </div>
          <dl className="signal-grid">
            <div>
              <dt>Confidence</dt>
              <dd>{currentSign.confidence}%</dd>
            </div>
            <div>
              <dt>Motion</dt>
              <dd>{currentSign.motion}</dd>
            </div>
            <div>
              <dt>Stability</dt>
              <dd>{currentSign.stability}</dd>
            </div>
          </dl>
        </div>

        <div className="control-dock">
          <button type="button" onClick={cameraState === 'active' ? stopCamera : startCamera}>
            {cameraState === 'active' ? 'Stop camera' : 'Start camera'}
          </button>
          <button type="button" onClick={captureSign}>Add sign</button>
          <button type="button" onClick={speakSentence} disabled={!sentence}>Speak</button>
        </div>
      </div>

      <aside className="workspace-panel">
        <div className="panel-heading">
          <p className="eyebrow">Mobile recognition system</p>
          <h2>SignCast for ASL communication</h2>
          <p>
            This build is now shaped around an ASL recognition app: camera capture, gesture interpretation, transcript output, and speech playback.
          </p>
        </div>

        <div className="transcript-panel">
          <div className="transcript-header">
            <span>Transcript</span>
            <button type="button" onClick={clearTranscript}>Clear</button>
          </div>
          <p className={sentence ? 'sentence active' : 'sentence'}>
            {sentence || 'Recognized signs will appear here.'}
          </p>
        </div>

        <div className="feature-grid">
          <article>
            <strong>Camera first</strong>
            <span>Prepared for hand landmarks, frame sampling, and mobile camera permissions.</span>
          </article>
          <article>
            <strong>Model ready</strong>
            <span>The API endpoint can be connected to MediaPipe, TensorFlow, or a Python model service.</span>
          </article>
          <article>
            <strong>Accessible output</strong>
            <span>Recognized ASL signs become readable text and browser speech output.</span>
          </article>
        </div>
      </aside>
    </section>
  )
}

function LibraryPage() {
  return (
    <section className="library-layout">
      <div className="panel-heading">
        <p className="eyebrow">ASL phrase library</p>
        <h2>Core signs for prototype testing</h2>
      </div>
      <div className="sign-library">
        {aslSamples.map((sample) => (
          <article key={sample.phrase}>
            <span>{sample.confidence}%</span>
            <h3>{sample.phrase}</h3>
            <p>{sample.motion}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

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
  const isProtectedRoute = route === 'app' || route === 'library'

  useEffect(() => {
    if (isProtectedRoute && !isAuthenticated) {
      window.location.hash = '#/login'
    }
  }, [isAuthenticated, isProtectedRoute])

  const handleLoggedIn = (newSession) => {
    setSession(newSession)
    window.location.hash = '#/app'
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    window.location.hash = '#/'
  }

  const page = route === 'login'
    ? <LoginPage onLoggedIn={handleLoggedIn} />
    : route === 'register'
      ? <RegisterPage />
      : route === 'library'
        ? <LibraryPage />
        : route === 'app'
          ? <RecognitionWorkspace />
          : <MarketingPage />

  return (
    <div className="app-shell">
      <Header route={route} isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main>{page}</main>
    </div>
  )
}

export default App
