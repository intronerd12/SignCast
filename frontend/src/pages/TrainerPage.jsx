import { useRef, useState, useEffect, useCallback } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { API_BASE } from '../helpers.js'

// MediaPipe hand skeleton connections (21 landmarks → bone pairs)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm
]

const SEQ_LENGTH = 30

export default function TrainerPage({ session }) {
  const videoRef = useRef(null)
  const skeletonCanvasRef = useRef(null)
  const snapshotCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animFrameRef = useRef(null)
  const seqBufferRef = useRef([])

  const [cameraState, setCameraState] = useState('off')          // off | active | blocked | locked
  const [modelState, setModelState] = useState('idle')           // idle | loading | ready | error
  const [modelProgress, setModelProgress] = useState('')
  const [handDetected, setHandDetected] = useState(false)
  const [captureMode, setCaptureMode] = useState('static')       // static | sequence
  const [isCapturing, setIsCapturing] = useState(false)
  const [seqProgress, setSeqProgress] = useState(0)
  const [datasetProgress, setDatasetProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [status, setStatus] = useState('Start camera and capture sign language samples with real hand tracking.')
  const [stats, setStats] = useState({ totalSamples: 0, uniqueLabels: 0, byLabel: [] })
  const [recentSamples, setRecentSamples] = useState([])
  const [lockoutUntil, setLockoutUntil] = useState(null)
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0)
  const [form, setForm] = useState({
    label: '',
    category: 'word',
    notes: '',
    captureImage: true,
  })

  // Current frame landmarks (updated each animation frame)
  const currentLandmarksRef = useRef(null)
  const cancelDatasetRef = useRef(false)

  // ─── Vulgarity Heuristic ──────────────────────────────────────
  const checkVulgarity = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return false;
    
    // Y-axis: 0 is top, 1 is bottom. Smaller y means higher.
    const mTip = landmarks[12], mMcp = landmarks[9];
    const iTip = landmarks[8], iPip = landmarks[6];
    const rTip = landmarks[16], rPip = landmarks[14];
    const pTip = landmarks[20], pPip = landmarks[18];

    // Middle finger is extended if tip is much higher than MCP
    const isMiddleExtended = mTip.y < mMcp.y - 0.08;
    
    // Other fingers are curled if their tips are lower than their PIP joints
    const isIndexCurled = iTip.y > iPip.y - 0.02;
    const isRingCurled = rTip.y > rPip.y - 0.02;
    const isPinkyCurled = pTip.y > pPip.y - 0.02;

    return isMiddleExtended && isIndexCurled && isRingCurled && isPinkyCurled;
  }, [])

  // ─── Cleanup ───────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('off')
    setHandDetected(false)
    setIsCapturing(false)
    setSeqProgress(0)
    seqBufferRef.current = []
    currentLandmarksRef.current = null
  }, [])

  useEffect(() => () => {
    stopCamera()
    if (landmarkerRef.current) {
      landmarkerRef.current.close()
      landmarkerRef.current = null
    }
  }, [stopCamera])

  // ─── Vulgarity Lockout Management ─────────────────────────
  const fetchLockoutStatus = useCallback(async () => {
    if (!session?.userId) return
    try {
      const response = await fetch(`${API_BASE}/users/${session.userId}/vulgarity-status`)
      const data = await response.json()
      if (data.success && data.camera_lock_until) {
        if (data.camera_lock_until > Date.now()) {
          setLockoutUntil(data.camera_lock_until)
          setCameraState('locked')
          setStatus('Camera locked due to inappropriate gestures.')
          stopCamera()
        }
      }
    } catch (error) {
      console.error('Failed to fetch lockout status', error)
    }
  }, [session?.userId, stopCamera])

  useEffect(() => {
    if (!lockoutUntil) return
    const interval = setInterval(() => {
      const remaining = lockoutUntil - Date.now()
      if (remaining <= 0) {
        setLockoutUntil(null)
        setCameraState('off')
        setStatus('Lockout expired. You may use the camera again.')
        clearInterval(interval)
      } else {
        setLockoutTimeRemaining(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  // ─── Load stats + recent samples ──────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach/stats?limit=1000`)
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load stats')
      setStats({
        totalSamples: data.totalSamples || 0,
        uniqueLabels: data.uniqueLabels || 0,
        byLabel: Array.isArray(data.byLabel) ? data.byLabel : [],
      })
    } catch {
      setStats({ totalSamples: 0, uniqueLabels: 0, byLabel: [] })
    }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach?limit=8`)
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load samples')
      setRecentSamples(Array.isArray(data.samples) ? data.samples : [])
    } catch {
      setRecentSamples([])
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStats()
      loadRecent()
      fetchLockoutStatus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadStats, loadRecent, fetchLockoutStatus])

  // ─── Draw hand skeleton on canvas ─────────────────────────
  const drawSkeleton = useCallback((landmarks, canvas, video) => {
    const ctx = canvas.getContext('2d')
    const w = video.videoWidth || canvas.width
    const h = video.videoHeight || canvas.height

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    if (!landmarks || landmarks.length === 0) return

    // Draw connections (bones)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (const [start, end] of HAND_CONNECTIONS) {
      const a = landmarks[start]
      const b = landmarks[end]
      // Use raw X since the canvas is flipped via CSS scaleX(-1)
      const ax = a.x * w
      const ay = a.y * h
      const bx = b.x * w
      const by = b.y * h

      ctx.strokeStyle = 'rgba(47, 183, 169, 0.85)'
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }

    // Draw landmark dots
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i]
      const x = lm.x * w
      const y = lm.y * h
      const isWrist = i === 0
      const radius = isWrist ? 7 : 5

      ctx.fillStyle = isWrist ? '#f1b84b' : '#ffffff'
      ctx.shadowColor = isWrist ? 'rgba(241, 184, 75, 0.6)' : 'rgba(47, 183, 169, 0.5)'
      ctx.shadowBlur = isWrist ? 12 : 8
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()

      // Border
      ctx.shadowBlur = 0
      ctx.strokeStyle = isWrist ? '#f1b84b' : 'rgba(47, 183, 169, 0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.shadowBlur = 0
  }, [])

  // ─── Extract wrist-relative 63-feature vector ─────────────
  const extractFeatures = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return null
    const wrist = landmarks[0]
    const features = []
    for (const lm of landmarks) {
      features.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z)
    }
    return features
  }, [])

  // ─── Initialize MediaPipe HandLandmarker ──────────────────
  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return true
    setModelState('loading')

    try {
      setModelProgress('Loading hand detection WASM...')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )

      setModelProgress('Creating hand landmarker...')
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })

      setModelState('ready')
      setModelProgress('')
      return true
    } catch (error) {
      console.error('HandLandmarker init failed:', error)
      setModelState('error')
      setModelProgress(`Error: ${error.message}`)
      return false
    }
  }, [])

  // ─── Detection loop ───────────────────────────────────────
  const startDetectionLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current
      const detector = landmarkerRef.current
      const canvas = skeletonCanvasRef.current

      if (!video || !detector || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      const result = detector.detectForVideo(video, performance.now())
      const landmarks = result.landmarks?.[0] || null

      currentLandmarksRef.current = landmarks
      setHandDetected(!!landmarks)
      drawSkeleton(landmarks, canvas, video)

      // Check for vulgar gestures
      if (landmarks && checkVulgarity(landmarks)) {
        console.warn("Vulgar gesture detected!");
        stopCamera();
        setCameraState('locked');
        setStatus('Inappropriate gesture detected. Locking camera...');
        
        // Report strike
        if (session?.userId) {
          fetch(`${API_BASE}/users/${session.userId}/vulgarity-strike`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
              if (data.success && data.camera_lock_until) {
                setLockoutUntil(data.camera_lock_until);
                setStatus(`Camera locked due to inappropriate gestures. Wait ${Math.ceil((data.camera_lock_until - Date.now()) / 60000)} minute(s).`);
              }
            })
            .catch(err => console.error("Strike report failed:", err));
        }
        return; // Break the animation frame loop
      }

      // Sequence capture: accumulate frames
      if (landmarks && seqBufferRef.current !== null && seqBufferRef.current._capturing) {
        const features = extractFeatures(landmarks)
        if (features) {
          seqBufferRef.current.frames.push(features)
          const progress = seqBufferRef.current.frames.length
          setSeqProgress(progress)

          if (progress >= SEQ_LENGTH) {
            seqBufferRef.current._capturing = false
            // Trigger save
            finishSequenceCapture(seqBufferRef.current.frames)
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [drawSkeleton, extractFeatures])

  // ─── Start camera ─────────────────────────────────────────
  const startCamera = async () => {
    if (!form.label.trim()) {
      setStatus('Please enter a sign label before starting the camera.')
      return
    }

    setStatus('Opening camera...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      setCameraState('active')

      const modelReady = await initLandmarker()
      if (modelReady) {
        setStatus('Camera active — hand tracking running. Perform your sign and capture.')
        startDetectionLoop()
      } else {
        setStatus('Camera active but hand detection failed to load.')
      }
    } catch {
      setCameraState('blocked')
      setStatus('Camera access denied. Allow permission and try again.')
    }
  }

  // ─── Snapshot: capture JPEG from video ────────────────────
  const captureSnapshot = useCallback(() => {
    const video = videoRef.current
    const canvas = snapshotCanvasRef.current
    if (!video || !canvas || video.readyState < 2) return null

    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 1.0)
  }, [])

  const downloadImage = useCallback((dataUrl, label) => {
    const link = document.createElement('a')
    link.href = dataUrl
    const safeLabel = label.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    link.download = `fsl_${safeLabel}_${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // ─── Save sample to backend ───────────────────────────────
  const saveSample = useCallback(async (label, landmarkData, source, frameCount) => {
    const payload = {
      userId: session?.userId || null,
      label,
      category: form.category,
      notes: form.notes.trim(),
      source,
      device: 'webcam',
      confidence: 75,
      frameCount,
      durationMs: source === 'sequence-capture' ? Math.round((frameCount / 30) * 1000) : 1000,
      landmarks: landmarkData,
    }

    const response = await fetch(`${API_BASE}/recognition/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()

    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Unable to save sample')
    }

    return data
  }, [session?.userId, form.category, form.notes])

  // ─── Static / Dataset capture (100 frames) ────────────────
  const captureStatic = async () => {
    const label = form.label.trim().toLowerCase()

    if (!label) {
      setStatus('Enter a sign label before capturing.')
      return
    }

    if (cameraState !== 'active' || modelState !== 'ready') {
      setStatus('Start the camera and wait for hand tracking to load.')
      return
    }

    setIsSaving(true)
    setIsCapturing(true)
    setDatasetProgress(0)
    cancelDatasetRef.current = false
    
    let capturedCount = 0;
    const totalToCapture = 100;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < totalToCapture; i++) {
      if (cancelDatasetRef.current) break; // Allow cancellation
      
      const landmarks = currentLandmarksRef.current
      if (!landmarks) {
        setStatus(`No hand detected — waiting... (${capturedCount}/${totalToCapture})`)
        await delay(100)
        i--; // Retry this frame
        continue
      }

      const features = extractFeatures(landmarks)
      if (!features) {
        await delay(100)
        i--;
        continue
      }

      setStatus(`Capturing dataset sample... (${capturedCount + 1}/${totalToCapture})`)

      try {
        const dataUrl = captureSnapshot()
        if (dataUrl) {
           await fetch(`${API_BASE}/recognition/teach/local`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               label, 
               features, 
               image: dataUrl,
               isAdmin: session?.isAdmin === true
             })
           })
        }
        capturedCount++;
        setDatasetProgress(capturedCount)
      } catch (error) {
        console.error("Local capture error:", error)
      }

      await delay(100) // Delay between captures
    }

    setSessionCount((c) => c + capturedCount)
    setStatus('✅ Images Captured!')
    setIsSaving(false)
    setIsCapturing(false)
    setDatasetProgress(0)
  }

  const cancelDatasetCapture = () => {
    cancelDatasetRef.current = true
    setIsCapturing(false)
    setIsSaving(false)
    setDatasetProgress(0)
    setStatus('Dataset capture cancelled.')
  }

  // ─── Sequence capture ─────────────────────────────────────
  const startSequenceCapture = () => {
    const label = form.label.trim().toLowerCase()

    if (!label) {
      setStatus('Enter a sign label before capturing.')
      return
    }

    if (cameraState !== 'active' || modelState !== 'ready') {
      setStatus('Start the camera and wait for hand tracking to load.')
      return
    }

    if (!currentLandmarksRef.current) {
      setStatus('No hand detected — show your hand to the camera first.')
      return
    }

    setIsCapturing(true)
    setSeqProgress(0)
    seqBufferRef.current = { frames: [], _capturing: true }
    setStatus(`Recording sequence for "${label}"... perform the movement now!`)
  }

  const finishSequenceCapture = async (frames) => {
    const label = form.label.trim().toLowerCase()
    setIsCapturing(false)
    setIsSaving(true)
    setStatus('Saving sequence...')

    try {
      // Download first-frame image if checked
      if (form.captureImage) {
        const dataUrl = captureSnapshot()
        if (dataUrl) downloadImage(dataUrl, label)
      }

      const landmarkData = frames.map((features, index) => ({
        captureMode: 'sequence-frame',
        frameIndex: index,
        capturedAt: new Date().toISOString(),
        features,
      }))

      const data = await saveSample(label, landmarkData, 'sequence-capture', SEQ_LENGTH)

      setSessionCount((c) => c + 1)
      setStatus(`✓ Sequence (${SEQ_LENGTH} frames) saved for "${data?.sample?.phrase || label}". Session total: ${sessionCount + 1}`)
      await loadStats()
      await loadRecent()
    } catch (error) {
      setStatus(error.message || 'Unable to save sequence')
    } finally {
      setIsSaving(false)
      setSeqProgress(0)
      seqBufferRef.current = []
    }
  }

  const cancelSequenceCapture = () => {
    setIsCapturing(false)
    setSeqProgress(0)
    seqBufferRef.current = []
    setStatus('Sequence capture cancelled.')
  }

  // ─── UI ────────────────────────────────────────────────────
  return (
    <section className="trainer-layout">
      <div className="phone-stage" aria-label="FSL training camera">
        <div className="camera-panel">
          <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
          <canvas ref={skeletonCanvasRef} className="skeleton-canvas" />
          <canvas ref={snapshotCanvasRef} style={{ display: 'none' }} />

          {cameraState !== 'active' && (
            <div className="camera-placeholder">
              <span className="scan-frame" />
              <strong>FSL Gesture Trainer</strong>
              <small>{cameraState === 'blocked' ? 'Enable camera permission in your browser.' : 'Camera preview is off.'}</small>
            </div>
          )}

          {modelState === 'loading' && (
            <div className="model-loading-overlay">
              <div className="model-loading-spinner" />
              <p>{modelProgress || 'Loading hand detection...'}</p>
            </div>
          )}

          <div className="camera-topbar">
            <span className={`hand-status ${handDetected ? 'detected' : 'none'}`}>
              {handDetected ? '✋ Hand Detected' : '✗ No Hand'}
            </span>
            <strong>{cameraState === 'active' ? (modelState === 'ready' ? 'Live' : 'Loading...') : 'Idle'}</strong>
          </div>
        </div>

        {/* Sequence progress bar */}
        {isCapturing && captureMode === 'sequence' && (
          <div className="capture-progress-bar">
            <div className="capture-progress-fill" style={{ width: `${(seqProgress / SEQ_LENGTH) * 100}%` }} />
            <span className="capture-progress-label">{seqProgress} / {SEQ_LENGTH} frames</span>
          </div>
        )}

        {/* Dataset progress bar */}
        {isCapturing && captureMode === 'static' && (
          <div className="capture-progress-bar">
            <div className="capture-progress-fill" style={{ width: `${(datasetProgress / 100) * 100}%` }} />
            <span className="capture-progress-label">{datasetProgress} / 100 photos</span>
          </div>
        )}

        <div className="control-dock">
          {cameraState === 'locked' ? (
            <button type="button" disabled style={{ backgroundColor: '#ef4444' }}>
              Locked: {Math.ceil(lockoutTimeRemaining / 1000)}s
            </button>
          ) : (
            <button type="button" onClick={cameraState === 'active' ? stopCamera : startCamera}>
              {cameraState === 'active' ? 'Stop camera' : 'Start camera'}
            </button>
          )}

          {captureMode === 'static' ? (
            <button 
              type="button" 
              onClick={isCapturing ? cancelDatasetCapture : captureStatic} 
              disabled={isSaving && !isCapturing || cameraState !== 'active'}
            >
              {isCapturing ? '⏹ Cancel' : '📸 Capture Dataset'}
            </button>
          ) : (
            <button
              type="button"
              onClick={isCapturing ? cancelSequenceCapture : startSequenceCapture}
              disabled={isSaving && !isCapturing || cameraState !== 'active'}
            >
              {isCapturing ? '⏹ Cancel' : '🎬 Record Sequence'}
            </button>
          )}

          <button type="button" className="capture-counter-btn" disabled>
            Session: {sessionCount}
          </button>
        </div>
      </div>

      <aside className="workspace-panel">
        <div className="panel-heading">
          <p className="eyebrow">Custom gesture training</p>
          <h2>Capture Signs with Hand Tracking</h2>
          <p>{status}</p>
        </div>

        {/* Mode toggle tabs */}
        <div className="trainer-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'static'}
            className={captureMode === 'static' ? 'active' : ''}
            onClick={() => { if (!isCapturing) setCaptureMode('static') }}
          >
            <span className="tab-icon">📸</span>
            <span className="tab-label">Dataset Capture</span>
            <span className="tab-desc">100 frames continuously</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'sequence'}
            className={captureMode === 'sequence' ? 'active' : ''}
            onClick={() => { if (!isCapturing) setCaptureMode('sequence') }}
          >
            <span className="tab-icon">🎬</span>
            <span className="tab-label">Sequence Capture</span>
            <span className="tab-desc">{SEQ_LENGTH}-frame movement</span>
          </button>
        </div>

        <form className="teach-form" onSubmit={(event) => { event.preventDefault(); captureMode === 'static' ? captureStatic() : startSequenceCapture() }}>
          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => {
                const category = event.target.value
                setForm((current) => ({ 
                  ...current, 
                  category,
                  label: category === 'alphabet' ? 'a' : ''
                }))
              }}
            >
              <option value="alphabet">Alphabet</option>
              <option value="word">Word</option>
              <option value="phrase">Phrase</option>
            </select>
          </label>

          <label className="field">
            <span>Sign label (required)</span>
            {form.category === 'alphabet' ? (
              <select
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                required
              >
                {Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)).map(char => (
                  <option key={char} value={char}>{char.toUpperCase()}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder={form.category === 'word' ? "e.g. apple, mother, yes" : "e.g. mahal kita, good morning"}
                required
              />
            )}
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

          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.captureImage}
              onChange={(event) => setForm((current) => ({ ...current, captureImage: event.target.checked }))}
              style={{ width: 'auto' }}
            />
            <span style={{ margin: 0 }}>Save raw image (for Roboflow)</span>
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
            <span>Recent captured samples</span>
            <button type="button" onClick={() => { loadStats(); loadRecent() }}>Refresh</button>
          </div>

          {recentSamples.length === 0 ? (
            <p className="sentence">No training samples yet. Capture your first sign.</p>
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
