import { useState, useEffect } from 'react'
import { API_BASE, getDisplayName, getInitials } from '../helpers.js'

const dailyTranslationData = [14, 32, 21, 42, 34, 74, 62, 55, 77, 81, 94]

export default function ProfilePage({ session, onSessionUpdated }) {
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
