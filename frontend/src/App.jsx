import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { BrandLockup } from './components/Brand.jsx'
import LoginPage from './pages/login.js'
import RegisterPage from './pages/register.js'
import { clearSession, getSavedSession, updateSavedSession } from './auth/authClient'

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

const getDisplayName = (session, profile) => {
  const name = profile?.name || session?.name
  if (name) return name
  const localPart = session?.email?.split('@')?.[0]
  if (!localPart) return 'SignCast User'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'SignCast User'
}

const getInitials = (nameOrEmail = 'SignCast User') => {
  const words = nameOrEmail
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  return (words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0]?.slice(0, 2) || 'SC'
  ).toUpperCase()
}

function AdminBrandLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M9 17.5V9.25C9 8.15 9.9 7.25 11 7.25C12.1 7.25 13 8.15 13 9.25V15.25" />
      <path d="M13 15.25V6.75C13 5.65 13.9 4.75 15 4.75C16.1 4.75 17 5.65 17 6.75V15" />
      <path d="M17 15V8.25C17 7.15 17.9 6.25 19 6.25C20.1 6.25 21 7.15 21 8.25V16" />
      <path d="M21 16V11.5C21 10.4 21.9 9.5 23 9.5C24.1 9.5 25 10.4 25 11.5V19.25C25 24 21.15 27.25 16.6 27.25H15.1C11.25 27.25 8 24 8 20.15V17.5H9Z" />
      <path d="M8 17.5H5.8C4.65 17.5 3.75 18.4 3.75 19.55C3.75 21.65 5.45 23.25 7.5 23.25H9.4" />
    </svg>
  )
}

function AdminNavIcon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    dashboard: (
      <>
        <path d="M3 11.5 12 4l9 7.5" {...common} />
        <path d="M5.5 10.5V20h13v-9.5" {...common} />
        <path d="M9.5 20v-5h5v5" {...common} />
      </>
    ),
    users: (
      <>
        <path d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" {...common} />
        <path d="M2.8 20c.7-3.6 2.7-5.4 5.7-5.4s5 1.8 5.7 5.4" {...common} />
        <path d="M16 8.2a3 3 0 0 1 0 5.6" {...common} />
        <path d="M17.2 16c1.7.7 2.9 2 3.4 4" {...common} />
      </>
    ),
    dictionary: (
      <>
        <path d="M6 4.5h10.5A2.5 2.5 0 0 1 19 7v13H7a2 2 0 0 1-2-2V5.5c0-.6.4-1 1-1Z" {...common} />
        <path d="M8 8h7" {...common} />
        <path d="M8 12h6" {...common} />
        <path d="M7 20a2 2 0 0 1 2-2h10" {...common} />
      </>
    ),
    centers: (
      <>
        <path d="M4.5 20h15" {...common} />
        <path d="M6 20V8l6-3 6 3v12" {...common} />
        <path d="M9 20v-5h6v5" {...common} />
        <path d="M9 10h.01M12 10h.01M15 10h.01" {...common} />
      </>
    ),
    health: (
      <>
        <path d="M12 20s-7-4.5-8.7-9.2C2.3 8 3.9 5.5 6.7 5.5c1.7 0 3.1.9 3.9 2.2.8-1.3 2.2-2.2 3.9-2.2 2.8 0 4.4 2.5 3.4 5.3C19 15.5 12 20 12 20Z" {...common} />
        <path d="M7.2 12h2.6l1.1-2.2 2.2 4.4 1.1-2.2h2.6" {...common} />
      </>
    ),
    audit: (
      <>
        <path d="M7 4h8l4 4v12H7V4Z" {...common} />
        <path d="M15 4v5h4" {...common} />
        <path d="M9.5 13h6M9.5 16h5" {...common} />
      </>
    ),
    api: (
      <>
        <path d="M9 7 4 12l5 5" {...common} />
        <path d="m15 7 5 5-5 5" {...common} />
        <path d="m13 5-2 14" {...common} />
      </>
    ),
    reports: (
      <>
        <path d="M5 20V5h14v15H5Z" {...common} />
        <path d="M8.5 16v-4M12 16V8M15.5 16v-6" {...common} />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5" {...common} />
        <path d="M14 8l4 4-4 4" {...common} />
        <path d="M8 12h10" {...common} />
      </>
    ),
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

const dailyTranslationData = [14, 32, 21, 42, 34, 74, 62, 55, 77, 81, 94]

function ProfilePage({ session, onSessionUpdated }) {
  const [profile, setProfile] = useState({
    name: session?.name || '',
    email: session?.email || '',
    phone: session?.phone || '',
    image: session?.image || '',
    createdAt: session?.createdAt || '',
  })
  const [activity, setActivity] = useState({
    gesturesTrained: 215,
    translationsLogged: 1480,
    spedSessions: 42,
    recentLabels: [],
  })
  const [settings, setSettings] = useState({
    offlineMode: true,
    audibleTts: true,
    audibleFeedback: true,
    language: 'Filipino Sign Language',
    theme: 'Light',
  })
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' })
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const displayName = getDisplayName(session, profile)
  const initials = getInitials(displayName || session?.email)
  const avatarUrl = profile.image || session?.image
  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Active user'
  const maxChartValue = Math.max(...dailyTranslationData)

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      if (!session?.userId) return

      try {
        const [profileResponse, statsResponse, samplesResponse] = await Promise.all([
          fetch(`${API_BASE}/users/${session.userId}`),
          fetch(`${API_BASE}/recognition/teach/stats?limit=1000`),
          fetch(`${API_BASE}/recognition/teach?limit=4`),
        ])

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (isMounted) {
            const nextProfile = {
              name: profileData?.name || profile.name,
              email: profileData?.email || profile.email,
              phone: profileData?.phone || profile.phone,
              image: profileData?.image || profile.image,
              createdAt: profileData?.createdAt || profile.createdAt,
            }

            setProfile((current) => ({
              ...current,
              ...nextProfile,
            }))
            onSessionUpdated(nextProfile)
          }
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (isMounted && statsData?.success) {
            setActivity((current) => ({
              ...current,
              gesturesTrained: statsData.totalSamples || current.gesturesTrained,
            }))
          }
        }

        if (samplesResponse.ok) {
          const samplesData = await samplesResponse.json()
          if (isMounted && samplesData?.success) {
            const recentLabels = Array.isArray(samplesData.samples)
              ? samplesData.samples.map((sample) => sample.phrase || sample.label).filter(Boolean)
              : []
            setActivity((current) => ({
              ...current,
              recentLabels,
              translationsLogged: Math.max(current.translationsLogged, recentLabels.length * 370),
            }))
          }
        }
      } catch {
        // Dashboard keeps its curated defaults when local API services are offline.
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [onSessionUpdated, profile.createdAt, profile.email, profile.image, profile.name, profile.phone, session?.userId])

  const toggleSetting = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({ type: 'error', message: 'Choose a PNG or JPEG image.' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'Choose an image under 10 MB.' })
      return
    }

    if (!session?.userId) {
      setUploadStatus({ type: 'error', message: 'Login session is missing. Please sign in again.' })
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    setIsUploadingImage(true)
    setUploadStatus({ type: '', message: 'Uploading profile image...' })

    try {
      const response = await fetch(`${API_BASE}/users/${session.userId}`, {
        method: 'PUT',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Unable to upload profile image.')
      }

      const nextProfile = {
        name: data?.name || profile.name,
        email: data?.email || profile.email || session?.email || '',
        phone: data?.phone || profile.phone,
        image: data?.image || profile.image,
        createdAt: data?.createdAt || profile.createdAt,
      }

      setProfile((current) => ({
        ...current,
        ...nextProfile,
      }))
      onSessionUpdated(nextProfile)
      setUploadStatus({ type: 'success', message: 'Profile image updated.' })
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.message || 'Unable to upload profile image.' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-topbar">
        <div>
          <p className="eyebrow">Profile page</p>
          <h1>{displayName}</h1>
        </div>
        <a className="dashboard-primary-link" href={session?.isAdmin ? '#/admin' : '#/recognizer'}>
          {session?.isAdmin ? 'Back to admin portal' : 'Start translating'}
        </a>
      </div>

      <div className="dashboard-grid">
        <section className="profile-card dashboard-card">
          <div className="profile-avatar" aria-label={`${displayName} profile avatar`}>
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="profile-copy">
            <h2>{displayName}</h2>
            <p>SignCast User | FSL Advocate</p>
            <span>{profile.email || session?.email}</span>
          </div>
          <div className="profile-meta">
            <span>{joinedDate}</span>
            <span>{session?.isAdmin ? 'Admin access' : 'Learner access'}</span>
          </div>
          <label className="avatar-upload-button">
            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={uploadProfileImage} disabled={isUploadingImage} />
            {isUploadingImage ? 'Uploading...' : 'Upload photo'}
          </label>
          <p className={`avatar-upload-message ${uploadStatus.type}`} aria-live="polite">{uploadStatus.message}</p>
        </section>

        <section className="activity-card dashboard-card">
          <div className="dashboard-card-heading">
            <p className="eyebrow">Daily translation frequency</p>
            <span>Past 30 days</span>
          </div>
          <div className="frequency-chart" aria-label="Daily translation frequency chart">
            <svg viewBox="0 0 520 260" role="img">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#76ddb2" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#76ddb2" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((line) => (
                <line key={line} x1="34" x2="500" y1={40 + line * 42} y2={40 + line * 42} className="chart-grid-line" />
              ))}
              <path
                className="chart-area"
                d={`M 34 ${220 - (dailyTranslationData[0] / maxChartValue) * 170} ${dailyTranslationData
                  .map((value, index) => `L ${34 + index * 46.6} ${220 - (value / maxChartValue) * 170}`)
                  .join(' ')} L 500 220 L 34 220 Z`}
              />
              <polyline
                className="chart-line"
                points={dailyTranslationData
                  .map((value, index) => `${34 + index * 46.6},${220 - (value / maxChartValue) * 170}`)
                  .join(' ')}
              />
              {dailyTranslationData.map((value, index) => (
                <circle key={`${value}-${index}`} className="chart-point" cx={34 + index * 46.6} cy={220 - (value / maxChartValue) * 170} r="7" />
              ))}
            </svg>
          </div>
        </section>

        <section className="stat-card dashboard-card">
          <span className="stat-icon" aria-hidden="true">FSL</span>
          <p>Gestures trained</p>
          <strong>{activity.gesturesTrained.toLocaleString()}</strong>
        </section>

        <section className="stat-card dashboard-card">
          <span className="stat-icon" aria-hidden="true">TX</span>
          <p>Translations logged</p>
          <strong>{activity.translationsLogged.toLocaleString()}</strong>
        </section>

        <section className="stat-card dashboard-card">
          <span className="stat-icon" aria-hidden="true">SP</span>
          <p>SPED sessions attended</p>
          <strong>{activity.spedSessions} SPED</strong>
        </section>

        <section className="settings-card dashboard-card">
          <div className="dashboard-card-heading">
            <p className="eyebrow">Personal settings</p>
            <span>Synced locally</span>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>Offline Mode</span>
              <input type="checkbox" checked={settings.offlineMode} onChange={() => toggleSetting('offlineMode')} />
            </label>
            <label className="settings-select">
              <span>Default Language</span>
              <select value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}>
                <option>Filipino Sign Language</option>
                <option>American Sign Language</option>
                <option>Learning Mode</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>Audible Feedback (TTS)</span>
              <input type="checkbox" checked={settings.audibleTts} onChange={() => toggleSetting('audibleTts')} />
            </label>
            <label className="settings-select">
              <span>Theme</span>
              <select value={settings.theme} onChange={(event) => setSettings((current) => ({ ...current, theme: event.target.value }))}>
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>Audible Feedback</span>
              <input type="checkbox" checked={settings.audibleFeedback} onChange={() => toggleSetting('audibleFeedback')} />
            </label>
            <div className="activity-chip-list" aria-label="Recent activity">
              {(activity.recentLabels.length ? activity.recentLabels : ['Kumusta', 'Salamat', 'Paalam']).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

function DashboardPage({ session }) {
  const displayName = getDisplayName(session)
  const firstName = displayName.split(' ')[0] || 'there'
  const dashboardCards = [
    {
      href: '#/recognizer',
      label: 'Translate',
      title: 'Live recognition',
      body: 'Open the camera workspace for sign detection, transcript building, and speech output.',
      metric: '94%',
    },
    {
      href: '#/trainer',
      label: 'Trainer',
      title: 'Gesture training',
      body: 'Capture labeled FSL samples and grow the recognition dataset from your webcam.',
      metric: '215',
    },
    {
      href: '#/library',
      label: 'Library',
      title: 'Sign library',
      body: 'Review stored signs, add phrase details, and refresh learned samples from the API.',
      metric: 'FSL',
    },
  ]

  return (
    <section className="home-dashboard">
      <div className="home-hero dashboard-card">
        <div>
          <p className="eyebrow">SignCast workspace</p>
          <h1>Welcome back, {firstName}</h1>
          <p>
            Your FSL tools are connected here: translate signs, train gestures, and manage the learning library from one authenticated hub.
          </p>
        </div>
        <div className="home-hero-meter" aria-label="Translation readiness">
          <span>Ready</span>
          <strong>98%</strong>
        </div>
      </div>

      <div className="home-action-grid">
        {dashboardCards.map((card) => (
          <a className="home-action-card dashboard-card" href={card.href} key={card.href}>
            <span>{card.label}</span>
            <strong>{card.metric}</strong>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </a>
        ))}
      </div>

      <section className="home-status dashboard-card">
        <div className="dashboard-card-heading">
          <p className="eyebrow">Connected pages</p>
          <span>All protected routes</span>
        </div>
        <div className="home-status-grid">
          <div>
            <strong>Translate</strong>
            <span>Camera, transcript, speech</span>
          </div>
          <div>
            <strong>Trainer</strong>
            <span>Sample capture and stats</span>
          </div>
          <div>
            <strong>Library</strong>
            <span>Stored signs and refresh</span>
          </div>
        </div>
      </section>
    </section>
  )
}

function Header({ route, isAuthenticated, session, onLogout }) {
  const displayName = getDisplayName(session)
  const initials = getInitials(displayName || session?.email)
  const avatarUrl = session?.image

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
            {session?.isAdmin ? (
              <a className={route === 'admin' ? 'active' : ''} href="#/admin">Admin</a>
            ) : (
              <>
                <a className={route === 'app' ? 'active' : ''} href="#/app">Dashboard</a>
                <a className={route === 'recognizer' ? 'active' : ''} href="#/recognizer">Translate</a>
                <a className={route === 'trainer' ? 'active' : ''} href="#/trainer">Trainer</a>
                <a className={route === 'library' ? 'active' : ''} href="#/library">Library</a>
              </>
            )}
            <a
              className={route === 'profile' ? 'header-avatar active' : 'header-avatar'}
              href="#/profile"
              aria-label={`${displayName} profile`}
              title={`${displayName} profile`}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
            </a>
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
                  <span>{sample.category || 'uncategorized'} â€¢ {sample.source || 'manual'}</span>
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
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg></div>
              <p className="achievement-eyebrow">For learners</p>
              <p>Practice and master FSL signs with instant feedback from our recognition engine.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h6"/></svg></div>
              <p className="achievement-eyebrow">For interpreters</p>
              <p>Speed up your workflow with AI-assisted transcription and phrase management.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg></div>
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
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></div>
          <span>Features</span>
          <h3>Recognition workspace</h3>
          <p>Live camera input, phrase confidence, sentence transcript, and speech output in one interface.</p>
        </article>
        <article>
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <span>Getting started</span>
          <h3>Sign up in seconds</h3>
          <p>Create a learner account to access the mobile app, or request admin status if you are an educator or organization.</p>
        </article>
        <article>
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
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

function AdminPage({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [samples, setSamples] = useState([])
  const [adminStatus, setAdminStatus] = useState('Loading admin data...')
  const [actionStatus, setActionStatus] = useState({ type: '', message: '' })
  const [mutatingUserId, setMutatingUserId] = useState('')
  const [metrics, setMetrics] = useState({
    userCount: 2150,
    gestureCount: 780,
    uniqueLabels: 0,
    verifiedSamples: 0,
    activeCenters: 55,
    apiLatency: '1.2ms',
    uptime: '99.8%',
    cloudServices: 'Checking',
  })

  const adminName = getDisplayName(session)
  const adminInitials = getInitials(adminName || session?.email)
  const adminAvatar = session?.image
  const chartData = [12, 29, 20, 41, 31, 52, 70, 58, 58, 78, 84, 96]
  const maxChartValue = Math.max(...chartData)
  const sidebarItems = [
    ['dashboard', 'dashboard', 'Dashboard'],
    ['users', 'users', 'User Accounts'],
    ['dictionary', 'dictionary', 'FSL Dictionary'],
    ['centers', 'centers', 'SPED Centers'],
    ['health', 'health', 'System Health'],
    ['audit', 'audit', 'Audit Logs'],
    ['api', 'api', 'API Settings'],
    ['reports', 'reports', 'Reports'],
  ]

  useEffect(() => {
    let isMounted = true

    const loadAdminData = async () => {
      const startedAt = performance.now()

      try {
        const [countResponse, usersResponse, statsResponse, samplesResponse, healthResponse] = await Promise.allSettled([
          fetch(`${API_BASE}/users/get/count`),
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/recognition/teach/stats?limit=2000`),
          fetch(`${API_BASE}/recognition/teach?limit=8`),
          fetch(`${API_BASE}/health`),
        ])

        if (!isMounted) return

        const nextMetrics = {}

        if (countResponse.status === 'fulfilled' && countResponse.value.ok) {
          const countData = await countResponse.value.json()
          nextMetrics.userCount = countData?.userCount || 2150
        }

        if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
          const usersData = await usersResponse.value.json()
          setUsers(Array.isArray(usersData) ? usersData : [])
        }

        if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
          const statsData = await statsResponse.value.json()
          if (statsData?.success) {
            nextMetrics.gestureCount = statsData.totalSamples || 780
            nextMetrics.uniqueLabels = statsData.uniqueLabels || 0
            nextMetrics.verifiedSamples = statsData.verifiedSamples || 0
          }
        }

        if (samplesResponse.status === 'fulfilled' && samplesResponse.value.ok) {
          const samplesData = await samplesResponse.value.json()
          setSamples(Array.isArray(samplesData?.samples) ? samplesData.samples : [])
        }

        if (healthResponse.status === 'fulfilled' && healthResponse.value.ok) {
          const healthData = await healthResponse.value.json()
          if (healthData?.cloudinaryConfigured && healthData?.supabaseConfigured) {
            nextMetrics.cloudServices = 'Cloudinary + Supabase - Active'
          } else if (healthData?.cloudinaryConfigured) {
            nextMetrics.cloudServices = 'Cloudinary - Active'
          } else if (healthData?.supabaseConfigured) {
            nextMetrics.cloudServices = 'Supabase - Active'
          } else {
            nextMetrics.cloudServices = 'Needs setup'
          }
          nextMetrics.uptime = healthData?.status === 'ok' ? '99.8%' : 'Check API'
        }

        nextMetrics.apiLatency = `${Math.max(1, Math.round(performance.now() - startedAt))}ms`
        setMetrics((current) => ({ ...current, ...nextMetrics }))
        setAdminStatus('Admin data synced')
      } catch (error) {
        if (isMounted) {
          setAdminStatus(error.message || 'Using local admin fallback data')
        }
      }
    }

    loadAdminData()

    return () => {
      isMounted = false
    }
  }, [])

  const recentUsers = users.length > 0
    ? users.slice(0, 6)
    : [
      { id: 'fallback-1', name: 'Axel Bumatay', email: 'axel@example.com', isAdmin: false, isActive: true, createdAt: '2024-09-01T09:33:00Z' },
      { id: 'fallback-2', name: 'Ego Lanzae', email: 'ego@example.com', isAdmin: false, isActive: true, createdAt: '2024-06-01T09:33:00Z' },
      { id: 'fallback-3', name: 'Daynak Folia', email: 'daynak@example.com', isAdmin: false, isActive: false, createdAt: '2024-06-01T07:35:00Z' },
      { id: 'fallback-4', name: 'Davi Landas', email: 'admin@example.com', isAdmin: true, isActive: true, createdAt: '2024-06-01T07:39:00Z' },
    ]

  const filteredUsers = recentUsers.filter((user) => {
    const searchable = `${user.name || ''} ${user.email || ''} ${user.isAdmin ? 'admin' : 'user'} ${user.isActive === false ? 'inactive deactivated' : 'active'}`.toLowerCase()
    return searchable.includes(searchTerm.trim().toLowerCase())
  })

  const dictionaryPreview = samples.length > 0
    ? samples.slice(0, 5).map((sample) => sample.phrase || sample.label)
    : ['Kumusta', 'Salamat', 'Paalam', 'Oo', 'Hindi']

  const formatAdminDate = (value) => {
    if (!value) return 'No login data'
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const parseAdminActionError = async (response) => {
    try {
      const payload = await response.json()
      return payload?.message || payload?.error || 'Admin action failed.'
    } catch {
      return 'Admin action failed.'
    }
  }

  const updateUserInState = (updatedUser) => {
    setUsers((current) => current.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user)))
  }

  const toggleUserStatus = async (user) => {
    if (!user?.id || user.id === session?.userId) return

    const nextActive = user.isActive === false
    setMutatingUserId(user.id)
    setActionStatus({ type: '', message: `${nextActive ? 'Activating' : 'Deactivating'} ${user.name || user.email}...` })

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      })

      if (!response.ok) {
        throw new Error(await parseAdminActionError(response))
      }

      const payload = await response.json()
      updateUserInState(payload.user)
      setActionStatus({ type: 'success', message: payload.message || `User ${nextActive ? 'activated' : 'deactivated'}.` })
    } catch (error) {
      setActionStatus({ type: 'error', message: error.message || 'Unable to update user status.' })
    } finally {
      setMutatingUserId('')
    }
  }

  const deleteUser = async (user) => {
    if (!user?.id || user.id === session?.userId) return

    const label = user.name || user.email || 'this user'
    const confirmed = window.confirm(`Delete ${label}? This removes the account from SignCast.`)
    if (!confirmed) return

    setMutatingUserId(user.id)
    setActionStatus({ type: '', message: `Deleting ${label}...` })

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(await parseAdminActionError(response))
      }

      setUsers((current) => current.filter((item) => item.id !== user.id))
      setMetrics((current) => ({
        ...current,
        userCount: Math.max(0, current.userCount - 1),
      }))
      setActionStatus({ type: 'success', message: `${label} deleted.` })
    } catch (error) {
      setActionStatus({ type: 'error', message: error.message || 'Unable to delete user.' })
    } finally {
      setMutatingUserId('')
    }
  }

  const getSectionSummary = () => {
    if (activeSection === 'users') return `${filteredUsers.length} accounts visible`
    if (activeSection === 'dictionary') return `${dictionaryPreview.length} recent FSL entries`
    if (activeSection === 'health') return metrics.cloudServices
    if (activeSection === 'api') return `Average latency ${metrics.apiLatency}`
    return adminStatus
  }

  return (
    <section className="admin-portal">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <a className="admin-brand" href="#/admin">
          <span className="admin-brand-mark"><AdminBrandLogo /></span>
          <strong>SignCast</strong>
        </a>

        <nav className="admin-menu">
          {sidebarItems.map(([key, icon, label]) => (
            <button
              type="button"
              className={activeSection === key ? 'active' : ''}
              onClick={() => setActiveSection(key)}
              key={key}
            >
              <span><AdminNavIcon name={icon} /></span>
              {label}
            </button>
          ))}
          <button type="button" onClick={onLogout}>
            <span><AdminNavIcon name="logout" /></span>
            Logout
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">SignCast Admin Portal</p>
            <h1>{activeSection === 'dashboard' ? 'Dashboard' : sidebarItems.find(([key]) => key === activeSection)?.[2]}</h1>
          </div>

          <label className="admin-search">
            <span>Search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users, roles, status..."
            />
          </label>

          <a className="admin-profile-pill" href="#/profile" aria-label={`${adminName} profile`}>
            <span className="admin-profile-avatar">
              {adminAvatar ? <img src={adminAvatar} alt="" /> : adminInitials}
            </span>
            <span>
              <strong>{adminName}</strong>
              <small>Admin</small>
            </span>
          </a>
        </header>

        <div className="admin-content-grid">
          <section className="admin-metrics">
            <article className="admin-stat-card">
              <span className="admin-stat-icon">UA</span>
              <p>Total users</p>
              <strong>{metrics.userCount.toLocaleString()}</strong>
            </article>
            <article className="admin-stat-card">
              <span className="admin-stat-icon">FS</span>
              <p>FSL gestures</p>
              <strong>{metrics.gestureCount.toLocaleString()} trained</strong>
            </article>
            <article className="admin-stat-card">
              <span className="admin-stat-icon">SP</span>
              <p>Active SPED centers</p>
              <strong>{metrics.activeCenters} centers</strong>
            </article>
            <article className="admin-stat-card">
              <span className="admin-stat-icon">UP</span>
              <p>System uptime</p>
              <strong>{metrics.uptime} Uptime</strong>
            </article>
          </section>

          <section className="admin-chart-card">
            <div className="admin-card-heading">
              <p className="eyebrow">System translation accuracy (global)</p>
              <span>Past 30 days</span>
            </div>
            <svg viewBox="0 0 520 260" role="img" aria-label="System translation accuracy chart">
              <defs>
                <linearGradient id="adminChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#76ddb2" stopOpacity="0.62" />
                  <stop offset="100%" stopColor="#76ddb2" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line key={line} x1="34" x2="500" y1={50 + line * 48} y2={50 + line * 48} className="admin-chart-grid-line" />
              ))}
              <path
                className="admin-chart-area"
                d={`M 34 ${220 - (chartData[0] / maxChartValue) * 172} ${chartData
                  .map((value, index) => `L ${34 + index * 42.3} ${220 - (value / maxChartValue) * 172}`)
                  .join(' ')} L 500 220 L 34 220 Z`}
              />
              <polyline
                className="admin-chart-line"
                points={chartData.map((value, index) => `${34 + index * 42.3},${220 - (value / maxChartValue) * 172}`).join(' ')}
              />
              {chartData.map((value, index) => (
                <circle key={`${value}-${index}`} className="admin-chart-point" cx={34 + index * 42.3} cy={220 - (value / maxChartValue) * 172} r="7" />
              ))}
            </svg>
          </section>

          <section className="admin-table-card">
            <div className="admin-card-heading">
              <p className="eyebrow">{activeSection === 'dictionary' ? 'Recent FSL dictionary entries' : 'Recent user activity'}</p>
              <span className={actionStatus.type ? `admin-action-message ${actionStatus.type}` : 'admin-action-message'}>
                {actionStatus.message || getSectionSummary()}
              </span>
            </div>

            {activeSection === 'dictionary' ? (
              <div className="admin-dictionary-list">
                {dictionaryPreview.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isSelf = user.id === session?.userId
                      const isBusy = mutatingUserId === user.id
                      const isActive = user.isActive !== false
                      const isFallbackUser = user.id?.startsWith?.('fallback-')

                      return (
                        <tr key={user.id || user.email}>
                          <td>{user.name || user.email || 'SignCast User'}</td>
                          <td>{user.isAdmin ? 'Admin' : 'Sign Language'}</td>
                          <td>
                            <span className={!isActive ? 'admin-status-badge inactive' : user.isAdmin ? 'admin-status-badge admin' : 'admin-status-badge'}>
                              {!isActive ? 'Inactive' : user.isAdmin ? 'Privileged' : 'Active'}
                            </span>
                          </td>
                          <td>{formatAdminDate(user.createdAt)}</td>
                          <td>
                            <div className="admin-action-group">
                              <button
                                type="button"
                                className={isActive ? 'admin-action-button neutral' : 'admin-action-button success'}
                                onClick={() => toggleUserStatus(user)}
                                disabled={isSelf || isBusy || isFallbackUser}
                                title={isSelf ? 'You cannot change your own admin status.' : isActive ? 'Deactivate user' : 'Activate user'}
                              >
                                {isBusy ? 'Working' : isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="admin-action-button danger"
                                onClick={() => deleteUser(user)}
                                disabled={isSelf || isBusy || isFallbackUser}
                                title={isSelf ? 'You cannot delete your own account.' : 'Delete user'}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="admin-config-card">
            <div className="admin-card-heading">
              <p className="eyebrow">System configuration overview</p>
              <span>Live API</span>
            </div>
            <dl>
              <div>
                <dt>FSL Database Version</dt>
                <dd>masked</dd>
              </div>
              <div>
                <dt>API Latency</dt>
                <dd>{metrics.apiLatency} Avg</dd>
              </div>
              <div>
                <dt>Cloud Services</dt>
                <dd>{metrics.cloudServices}</dd>
              </div>
              <div>
                <dt>Unique Labels</dt>
                <dd>{metrics.uniqueLabels.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Verified Samples</dt>
                <dd>{metrics.verifiedSamples.toLocaleString()}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <footer className="admin-footer">
          (c) 2026 SignCast | Admin Portal | Technological University of the Philippines - Taguig
        </footer>
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
