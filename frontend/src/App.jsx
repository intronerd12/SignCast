import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { BrandLockup } from './components/Brand.jsx'
import LoginPage from './pages/login.js'
import RegisterPage from './pages/register.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const getRoute = () => {
  const route = window.location.hash.replace('#/', '').trim()
  return route || 'recognizer'
}

const aslSamples = [
  { phrase: 'Hello', confidence: 94, motion: 'Open palm wave', stability: 'Stable' },
  { phrase: 'Thank you', confidence: 91, motion: 'Fingertips from chin outward', stability: 'Stable' },
  { phrase: 'Please', confidence: 87, motion: 'Flat palm circular chest motion', stability: 'Checking' },
  { phrase: 'Yes', confidence: 89, motion: 'Closed fist nod', stability: 'Stable' },
]

function Header({ route }) {
  return (
    <header className="site-header">
      <BrandLockup />
      <nav className="site-nav" aria-label="Main navigation">
        <a className={route === 'recognizer' ? 'active' : ''} href="#/">Recognizer</a>
        <a className={route === 'library' ? 'active' : ''} href="#/library">Library</a>
        <a className={route === 'login' ? 'active' : ''} href="#/login">Login</a>
        <a className="nav-button" href="#/register">Register</a>
      </nav>
    </header>
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

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const page = route === 'login'
    ? <LoginPage />
    : route === 'register'
      ? <RegisterPage />
      : route === 'library'
        ? <LibraryPage />
        : <RecognitionWorkspace />

  return (
    <div className="app-shell">
      <Header route={route} />
      <main>{page}</main>
    </div>
  )
}

export default App
