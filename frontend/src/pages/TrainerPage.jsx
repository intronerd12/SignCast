import { useRef, useState, useEffect } from 'react'
import { API_BASE } from '../helpers.js'

export default function TrainerPage({ session }) {
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
