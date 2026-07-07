import { useState, useEffect } from 'react'
import { API_BASE, getDisplayName, getInitials } from '../helpers.js'

const dailyTranslationData = [14, 32, 21, 42, 34, 74, 62, 55, 77, 81, 94]

export default function ProfilePage({ session, onSessionUpdated, themePreference, onThemePreferenceChange }) {
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
    highestScore: 0,
    totalTests: 0,
    recentLabels: [],
  })
  const [scoreHistory, setScoreHistory] = useState([])
  const [settings, setSettings] = useState({
    audibleFeedback: true,
    language: 'Filipino Sign Language',
  })
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' })
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  const [lockoutStatus, setLockoutStatus] = useState(null)
  const [appealReason, setAppealReason] = useState('')
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false)
  const [appealFeedback, setAppealFeedback] = useState({ type: '', text: '' })

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
        const [profileResponse, statsResponse, samplesResponse, lockoutResponse, scoresResponse] = await Promise.all([
          fetch(`${API_BASE}/users/${session.userId}`),
          fetch(`${API_BASE}/recognition/teach/stats?limit=1000`),
          fetch(`${API_BASE}/recognition/teach?limit=4`),
          fetch(`${API_BASE}/users/${session.userId}/vulgarity-status`),
          fetch(`${API_BASE}/scores/${session.userId}`),
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

        if (lockoutResponse.ok) {
          const lockoutData = await lockoutResponse.json()
          if (isMounted && lockoutData?.success) {
            setLockoutStatus({
              strikes: lockoutData.strikes,
              lockUntil: lockoutData.camera_lock_until,
              pendingAppeal: lockoutData.pending_appeal,
              appealReason: lockoutData.appeal_reason
            })
          }
        }

        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json()
          if (isMounted && scoresData.scores) {
            setScoreHistory(scoresData.scores.slice(0, 5))
            setActivity((current) => ({
              ...current,
              highestScore: scoresData.highest_score || 0,
              totalTests: scoresData.scores.length
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

  const submitAppeal = async () => {
    if (!appealReason.trim()) {
      setAppealFeedback({ type: 'error', text: 'Please enter a reason for your appeal.' })
      return
    }
    
    setIsSubmittingAppeal(true)
    setAppealFeedback({ type: '', text: '' })
    
    try {
      const response = await fetch(`${API_BASE}/users/${session.userId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: appealReason }),
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setAppealFeedback({ type: 'success', text: 'Appeal submitted successfully.' })
        setLockoutStatus(curr => ({ ...curr, pendingAppeal: true, appealReason: appealReason }))
      } else {
        throw new Error(data.error || 'Failed to submit appeal')
      }
    } catch (error) {
      setAppealFeedback({ type: 'error', text: error.message })
    } finally {
      setIsSubmittingAppeal(false)
    }
  }

  const isLockedOut = lockoutStatus?.lockUntil > Date.now();

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
        {isLockedOut && (
          <section className="dashboard-card" style={{ gridColumn: '1 / -1', border: '2px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <div className="dashboard-card-heading">
              <p className="eyebrow" style={{ color: '#ef4444' }}>Account Restriction</p>
              <h2 style={{ color: '#ef4444', fontSize: '1.2rem', marginBottom: '8px' }}>Camera Locked</h2>
            </div>
            <p style={{ marginBottom: '16px' }}>
              Your camera access has been temporarily locked due to an inappropriate gesture. 
              Unlock time: <strong>{new Date(lockoutStatus.lockUntil).toLocaleString()}</strong>
            </p>
            
            {lockoutStatus.pendingAppeal ? (
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                <p style={{ fontWeight: 'bold', color: '#f59e0b', margin: '0 0 8px 0' }}>Appeal Pending Review</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>"{lockoutStatus.appealReason}"</p>
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Submit an Appeal Ticket</p>
                <textarea 
                  rows={3} 
                  placeholder="Explain what happened..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', marginBottom: '8px' }}
                />
                <button 
                  onClick={submitAppeal}
                  disabled={isSubmittingAppeal}
                  style={{ backgroundColor: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                </button>
                {appealFeedback.text && (
                  <p style={{ color: appealFeedback.type === 'error' ? '#ef4444' : '#10b981', marginTop: '8px' }}>{appealFeedback.text}</p>
                )}
              </div>
            )}
          </section>
        )}

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
          <span className="stat-icon" aria-hidden="true">🎯</span>
          <p>Highest FSL Score</p>
          <strong>{activity.highestScore} pts</strong>
        </section>

        <section className="stat-card dashboard-card">
          <span className="stat-icon" aria-hidden="true">📝</span>
          <p>Certification Tests Taken</p>
          <strong>{activity.totalTests} tests</strong>
        </section>

        <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
          <div className="dashboard-card-heading">
            <p className="eyebrow">Recent Certifications</p>
            <span>Score History</span>
          </div>
          {scoreHistory.length > 0 ? (
            <div className="recent-scores-list" style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {scoreHistory.map(score => (
                <div key={score.id} style={{ flex: '1 1 200px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{score.score} pts</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'capitalize' }}>{score.test_type}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                    {new Date(score.created_at).toLocaleDateString()} at {new Date(score.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ opacity: 0.7, margin: 0 }}>No certification tests taken yet. Head to the Learning Hub to start your journey!</p>
            </div>
          )}
        </section>

        <section className="settings-card dashboard-card">
          <div className="dashboard-card-heading">
            <p className="eyebrow">Personal settings</p>
            <span>Synced locally</span>
          </div>
          <div className="settings-grid">
            <label className="settings-select">
              <span>Default Language</span>
              <select value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}>
                <option>Filipino Sign Language</option>
                <option>American Sign Language</option>
                <option>Learning Mode</option>
              </select>
            </label>
            <label className="settings-select">
              <span>Theme</span>
              <select value={themePreference} onChange={(event) => onThemePreferenceChange(event.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
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
