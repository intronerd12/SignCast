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

const normalizeConfidence = (value, fallback = 80) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(100, Math.round(parsed)))
}

const normalizeLibraryEntry = (sample) => ({
  phrase: (sample?.phrase || '').toString().trim() || 'Unknown sign',
  confidence: normalizeConfidence(sample?.confidence, 80),
  motion: (sample?.motion || '').toString().trim(),
  gloss: (sample?.gloss || '').toString().trim(),
  source: (sample?.source || '').toString().trim() || 'prototype-rule-engine',
})

function Header({ route, isAuthenticated, session, onLogout }) {
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
            {session?.isAdmin && <a className={route === 'admin' ? 'active' : ''} href="#/admin">Admin</a>}
            <a className={route === 'app' ? 'active' : ''} href="#/app">Home</a>
            <a className={route === 'trainer' ? 'active' : ''} href="#/trainer">Trainer</a>
            <a className={route === 'library' ? 'active' : ''} href="#/library">Library</a>
            <button type="button" className="app-logout" onClick={onLogout}>Logout</button>
          </>
        )}
      </nav>
    </header>
  )
}

function TrainerPage({ session }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraState, setCameraState] = useState('off')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('Start camera and record FSL samples to build your training dataset.')
  const [stats, setStats] = useState({ totalSamples: 0, uniqueLabels: 0, byLabel: [] })
  const [recentSamples, setRecentSamples] = useState([])
  const [form, setForm] = useState({
    label: '',
    category: 'word',
    notes: '',
  })

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraState('off')
  }

  useEffect(() => () => {
    stopCamera()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach/stats?limit=1000`)
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to load stats')
      }
      setStats({
        totalSamples: data.totalSamples || 0,
        uniqueLabels: data.uniqueLabels || 0,
        byLabel: Array.isArray(data.byLabel) ? data.byLabel : [],
      })
    } catch {
      setStats({ totalSamples: 0, uniqueLabels: 0, byLabel: [] })
    }
  }

  const loadRecent = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach?limit=8`)
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to load samples')
      }
      setRecentSamples(Array.isArray(data.samples) ? data.samples : [])
    } catch {
      setRecentSamples([])
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStats()
      loadRecent()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const startCamera = async () => {
    setStatus('Opening camera...')
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
      setStatus('Camera active. Perform your sign, then click Save camera sample.')
    } catch {
      setCameraState('blocked')
      setStatus('Camera access denied. Allow permission and try again.')
    }
  }

  const saveCameraSample = async () => {
    const label = form.label.trim().toLowerCase()

    if (!label) {
      setStatus('Label is required before saving a camera sample.')
      return
    }

    if (cameraState !== 'active') {
      setStatus('Start the camera first before saving a sample.')
      return
    }

    const payload = {
      userId: session?.userId || null,
      label,
      category: form.category,
      notes: form.notes.trim(),
      source: 'camera-capture',
      device: 'webcam',
      confidence: 75,
      frameCount: 1,
      durationMs: 1000,
      landmarks: [
        {
          captureMode: 'manual-camera-sample',
          capturedAt: new Date().toISOString(),
        },
      ],
    }

    setIsSaving(true)
    setStatus('Saving camera sample...')

    try {
      const response = await fetch(`${API_BASE}/recognition/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to save sample')
      }

      setStatus(`Stored sample for "${data?.sample?.phrase || label}". Your dataset has been updated.`)
      await loadStats()
      await loadRecent()
    } catch (error) {
      setStatus(error.message || 'Unable to save sample')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="trainer-layout">
      <div className="phone-stage" aria-label="FSL training camera">
        <div className="camera-panel">
          <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
          {cameraState !== 'active' && (
            <div className="camera-placeholder">
              <span className="scan-frame" />
              <strong>FSL Trainer Camera</strong>
              <small>{cameraState === 'blocked' ? 'Enable camera permission in your browser.' : 'Camera preview is off.'}</small>
            </div>
          )}
        </div>

        <div className="control-dock">
          <button type="button" onClick={cameraState === 'active' ? stopCamera : startCamera}>
            {cameraState === 'active' ? 'Stop camera' : 'Start camera'}
          </button>
          <button type="button" onClick={saveCameraSample} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save camera sample'}
          </button>
        </div>
      </div>

      <aside className="workspace-panel">
        <div className="panel-heading">
          <p className="eyebrow">FSL training dataset</p>
          <h2>Collect and train from your camera</h2>
          <p>{status}</p>
        </div>

        <form className="teach-form" onSubmit={(event) => { event.preventDefault(); saveCameraSample() }}>
          <label className="field">
            <span>Label (required)</span>
            <input
              type="text"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="e.g. mahal kita"
              required
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="alphabet">Alphabet</option>
              <option value="word">Word</option>
              <option value="phrase">Phrase</option>
            </select>
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="Hand shape, direction, speed, and any teaching hints"
            />
          </label>
        </form>

        <div className="feature-grid">
          <article>
            <strong>Total samples</strong>
            <span>{stats.totalSamples}</span>
          </article>
          <article>
            <strong>Unique labels</strong>
            <span>{stats.uniqueLabels}</span>
          </article>
          <article>
            <strong>Top label</strong>
            <span>{stats.byLabel[0]?.phrase || 'No data yet'}</span>
          </article>
        </div>

        <section className="teach-log" aria-label="Recent training samples">
          <div className="transcript-header">
            <span>Recent camera samples</span>
            <button type="button" onClick={() => { loadStats(); loadRecent() }}>Refresh</button>
          </div>

          {recentSamples.length === 0 ? (
            <p className="sentence">No training samples yet. Save your first camera sample.</p>
          ) : (
            <ul className="teach-list">
              {recentSamples.map((sample) => (
                <li key={sample.id}>
                  <strong>{sample.phrase || sample.label}</strong>
                  <span>{sample.category || 'uncategorized'} • {sample.source || 'manual'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </section>
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

function RecognitionWorkspace({ session }) {
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

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

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
    } catch {
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
      userId: session?.userId || null,
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
    } catch {
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

function LibraryPage({ session }) {
  const [librarySigns, setLibrarySigns] = useState(aslSamples.map((sample) => normalizeLibraryEntry(sample)))
  const [recentSamples, setRecentSamples] = useState([])
  const [libraryStatus, setLibraryStatus] = useState('Loading sign library...')
  const [formStatus, setFormStatus] = useState('Store a sign sample to start teaching your FSL model.')
  const [isSaving, setIsSaving] = useState(false)
  const [teachingForm, setTeachingForm] = useState({
    label: '',
    phrase: '',
    gloss: '',
    notes: '',
  })

  const loadLibrary = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/library?limit=80`)
      const data = await response.json()

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || 'Unable to load sign library')
      }

      const mapped = data.map((sample) => normalizeLibraryEntry(sample)).filter((item) => item.phrase)
      const nextLibrary = mapped.length > 0
        ? mapped
        : aslSamples.map((sample) => normalizeLibraryEntry(sample))

      setLibrarySigns(nextLibrary)
      setLibraryStatus(`Loaded ${nextLibrary.length} signs from API`)
    } catch {
      setLibrarySigns(aslSamples.map((sample) => normalizeLibraryEntry(sample)))
      setLibraryStatus('Using local sign library fallback')
    }
  }

  const loadRecentSamples = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach?limit=10`)
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to load taught samples')
      }

      setRecentSamples(Array.isArray(data.samples) ? data.samples : [])
    } catch {
      setRecentSamples([])
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLibrary()
      loadRecentSamples()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setTeachingForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleTeachSign = async (event) => {
    event.preventDefault()

    const label = teachingForm.label.trim().toLowerCase()
    if (!label) {
      setFormStatus('Label is required to store a sign sample.')
      return
    }

    setIsSaving(true)
    setFormStatus('Saving sign sample...')

    const payload = {
      userId: session?.userId || null,
      label,
      phrase: teachingForm.phrase.trim() || label,
      gloss: teachingForm.gloss.trim(),
      notes: teachingForm.notes.trim(),
      landmarks: [],
      source: 'web-library-form',
      confidence: 78,
    }

    try {
      const response = await fetch(`${API_BASE}/recognition/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to save sign sample')
      }

      setTeachingForm({
        label: '',
        phrase: '',
        gloss: '',
        notes: '',
      })
      setFormStatus('Sign sample stored. Recognition can now learn from it.')
      await loadLibrary()
      await loadRecentSamples()
    } catch (error) {
      setFormStatus(error.message || 'Unable to save sign sample')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="library-layout">
      <div className="panel-heading">
        <p className="eyebrow">FSL learning library</p>
        <h2>Teach SignCast with stored sign information</h2>
        <p>
          Add labeled FSL signs, keep your examples in storage, and reuse them in recognition.
        </p>
      </div>

      <div className="teaching-layout">
        <form className="teach-form" onSubmit={handleTeachSign}>
          <label className="field">
            <span>Label (required)</span>
            <input
              type="text"
              name="label"
              value={teachingForm.label}
              onChange={handleFieldChange}
              placeholder="e.g. kumusta"
              required
            />
          </label>

          <label className="field">
            <span>Phrase</span>
            <input
              type="text"
              name="phrase"
              value={teachingForm.phrase}
              onChange={handleFieldChange}
              placeholder="e.g. Kumusta"
            />
          </label>

          <label className="field">
            <span>Gloss</span>
            <input
              type="text"
              name="gloss"
              value={teachingForm.gloss}
              onChange={handleFieldChange}
              placeholder="e.g. KUMUSTA"
            />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              name="notes"
              value={teachingForm.notes}
              onChange={handleFieldChange}
              placeholder="Optional tip on hand shape or motion"
              rows={4}
            />
          </label>

          <button type="submit" className="submit-button" disabled={isSaving}>
            {isSaving ? 'Saving sample...' : 'Teach this sign'}
          </button>

          <p className={formStatus.includes('stored') ? 'form-message success' : 'form-message'}>{formStatus}</p>
        </form>

        <section className="teach-log" aria-label="Recent taught samples">
          <div className="transcript-header">
            <span>Recent taught samples</span>
            <button type="button" onClick={loadRecentSamples}>Refresh</button>
          </div>

          {recentSamples.length === 0 ? (
            <p className="sentence">No stored samples yet. Add your first FSL label.</p>
          ) : (
            <ul className="teach-list">
              {recentSamples.map((sample) => (
                <li key={sample.id}>
                  <strong>{sample.phrase || sample.label}</strong>
                  <span>{sample.gloss}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="library-status">{libraryStatus}</p>

      <div className="sign-library">
        {librarySigns.map((sample, index) => (
          <article key={`${sample.phrase}-${sample.source}-${index}`}>
            <span>{sample.confidence}%</span>
            <h3>{sample.phrase}</h3>
            <p>{sample.gloss ? `Gloss: ${sample.gloss}` : sample.motion || 'Stored sign sample'}</p>
            <small className="library-source">{sample.source === 'learned-dataset' ? 'Learned sample' : 'Prototype sample'}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function AdminPage({ session, onLogout, onGoHome }) {
  return (
    <section className="library-layout">
      <div className="panel-heading">
        <p className="eyebrow">Admin dashboard</p>
        <h2>SignCast administration</h2>
        <p>{`Signed in as ${session?.email || 'admin'} with admin access.`}</p>
      </div>

      <div className="marketing-grid">
        <article>
          <div className="grid-icon">🛡️</div>
          <span>Role</span>
          <h3>Admin access enabled</h3>
          <p>Only accounts with the Supabase admin role can reach this page.</p>
        </article>
        <article>
          <div className="grid-icon">📊</div>
          <span>System</span>
          <h3>Operational overview</h3>
          <p>Use this page for future user management, analytics, and content controls.</p>
        </article>
        <article>
          <div className="grid-icon">🔐</div>
          <span>Security</span>
          <h3>Protected navigation</h3>
          <p>Regular users are redirected to the home workspace and cannot enter this page.</p>
        </article>
      </div>

      <div className="marketing-actions">
        <button type="button" className="submit-button" onClick={onGoHome}>Go to home</button>
        <button type="button" className="outline-button" onClick={onLogout}>Logout</button>
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
  const isAdminRoute = route === 'admin'
  const isProtectedRoute = route === 'app' || route === 'library' || isAdminRoute

  useEffect(() => {
    if (isProtectedRoute && !isAuthenticated) {
      window.location.hash = '#/login'
      return
    }

    if (isAdminRoute && isAuthenticated && !session?.isAdmin) {
      window.location.hash = '#/app'
    }
  }, [isAuthenticated, isAdminRoute, isProtectedRoute, session?.isAdmin])

  const handleLoggedIn = (newSession) => {
    setSession(newSession)
    window.location.hash = newSession?.isAdmin ? '#/admin' : '#/app'
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
      : route === 'admin'
        ? <AdminPage session={session} onLogout={handleLogout} onGoHome={() => { window.location.hash = '#/app' }} />
        : route === 'library'
          ? <LibraryPage session={session} />
          : route === 'trainer'
            ? <TrainerPage session={session} />
          : route === 'app'
            ? <RecognitionWorkspace session={session} />
            : <MarketingPage />

  return (
    <div className="app-shell">
      <Header route={route} isAuthenticated={isAuthenticated} session={session} onLogout={handleLogout} />
      <main>{page}</main>
    </div>
  )
}

export default App
