import { useRef, useState, useEffect, useMemo } from 'react'
import * as signRecognizer from '../signRecognizer.js'

export default function RecognitionWorkspace({ session }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const [cameraState, setCameraState] = useState('off')
  const [modelState, setModelState] = useState('idle') // idle | loading | ready | error
  const [modelProgress, setModelProgress] = useState('')
  const [detectedSign, setDetectedSign] = useState(null) // { label, confidence, landmarks }
  const [stableSign, setStableSign] = useState(null) // confirmed stable detection
  const [transcript, setTranscript] = useState([])
  const [apiStatus, setApiStatus] = useState('Ready')
  const stableCountRef = useRef(0)
  const lastLabelRef = useRef(null)
  const CONFIDENCE_THRESHOLD = 70
  const STABLE_FRAMES = 8 // Number of consistent frames before confirming

  const sentence = useMemo(() => transcript.map((item) => item.phrase).join(' '), [transcript])

  // Cleanup on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    signRecognizer.dispose()
  }, [])

  // Recognition loop
  useEffect(() => {
    if (cameraState !== 'active' || modelState !== 'ready') return undefined

    let running = true

    const recognitionLoop = async () => {
      if (!running || !videoRef.current) return

      const video = videoRef.current
      if (video.readyState >= 2) {
        const result = await signRecognizer.processFrameAsync(video, performance.now())

        if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
          setDetectedSign(result)

          // Track stability
          if (result.label === lastLabelRef.current) {
            stableCountRef.current += 1
          } else {
            stableCountRef.current = 1
            lastLabelRef.current = result.label
          }

          if (stableCountRef.current === STABLE_FRAMES) {
            setStableSign({ label: result.label, confidence: result.confidence })
          }
        } else {
          setDetectedSign(result) // Show even low-confidence for feedback
          stableCountRef.current = 0
          lastLabelRef.current = null
        }
      }

      if (running) {
        animFrameRef.current = requestAnimationFrame(recognitionLoop)
      }
    }

    recognitionLoop()

    return () => {
      running = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [cameraState, modelState])

  const loadModel = async () => {
    setModelState('loading')
    const success = await signRecognizer.init((stage) => setModelProgress(stage))
    setModelState(success ? 'ready' : 'error')
    if (success) {
      setApiStatus(`Model loaded — ${signRecognizer.getSignCount()} signs`)
    }
  }

  const startCamera = async () => {
    setApiStatus('Opening camera...')

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

      // Load model if not yet loaded
      if (modelState !== 'ready') {
        await loadModel()
      } else {
        setApiStatus(`Recognizing — ${signRecognizer.getSignCount()} signs`)
      }
    } catch {
      setCameraState('blocked')
      setApiStatus('Camera permission needed')
    }
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraState('off')
    setDetectedSign(null)
    setStableSign(null)
    setApiStatus('Camera stopped')
  }

  const addSignToTranscript = () => {
    const sign = stableSign || detectedSign
    if (!sign || sign.confidence < CONFIDENCE_THRESHOLD) return

    const displayLabel = sign.label.length === 1
      ? sign.label.toUpperCase()
      : sign.label.charAt(0).toUpperCase() + sign.label.slice(1)

    setTranscript((current) => [
      ...current,
      { phrase: displayLabel, confidence: sign.confidence },
    ])
    setStableSign(null)
    stableCountRef.current = 0
    setApiStatus('Sign added')
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

  const displayLabel = detectedSign
    ? (detectedSign.label.length === 1 ? detectedSign.label.toUpperCase() : detectedSign.label)
    : '—'
  const displayConfidence = detectedSign ? detectedSign.confidence : 0
  const isAboveThreshold = displayConfidence >= CONFIDENCE_THRESHOLD
  const stabilityText = stableSign ? 'Stable' : (detectedSign ? 'Detecting...' : 'No hand')

  return (
    <section className="recognizer-shell">
      <div className="phone-stage" aria-label="ASL recognition live preview">
        <div className="camera-panel">
          <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
          {cameraState !== 'active' && (
            <div className="camera-placeholder">
              <span className="scan-frame" />
              <strong>Sign Language Recognition</strong>
              <small>{cameraState === 'blocked' ? 'Enable camera permission in your browser.' : 'Press Start to begin recognizing signs.'}</small>
            </div>
          )}
          {modelState === 'loading' && (
            <div className="model-loading-overlay">
              <div className="model-loading-spinner" />
              <p>{modelProgress || 'Loading models...'}</p>
            </div>
          )}
          <div className="camera-topbar">
            <span>{apiStatus}</span>
            <strong>{cameraState === 'active' ? (modelState === 'ready' ? 'Live' : 'Loading...') : 'Idle'}</strong>
          </div>
        </div>

        <div className="recognition-readout">
          <div>
            <span className="label">Detected sign</span>
            <h1 className={isAboveThreshold ? 'sign-detected' : 'sign-low'}>{displayLabel}</h1>
          </div>
          <div className="confidence-meter" aria-label={`Confidence ${displayConfidence} percent`}>
            <span style={{ width: `${displayConfidence}%` }} className={isAboveThreshold ? '' : 'low-confidence'} />
          </div>
          <dl className="signal-grid">
            <div>
              <dt>Confidence</dt>
              <dd>{displayConfidence}%</dd>
            </div>
            <div>
              <dt>Signs loaded</dt>
              <dd>{signRecognizer.getSignCount()}</dd>
            </div>
            <div>
              <dt>Stability</dt>
              <dd>{stabilityText}</dd>
            </div>
          </dl>
        </div>

        <div className="control-dock">
          <button type="button" onClick={cameraState === 'active' ? stopCamera : startCamera}>
            {cameraState === 'active' ? 'Stop camera' : 'Start camera'}
          </button>
          <button type="button" onClick={addSignToTranscript} disabled={!detectedSign || !isAboveThreshold}>Add sign</button>
          <button type="button" onClick={speakSentence} disabled={!sentence}>Speak</button>
        </div>
      </div>

      <aside className="workspace-panel">
        <div className="panel-heading">
          <p className="eyebrow">Live recognition system</p>
          <h2>SignCast — Real-time Sign Recognition</h2>
          <p>
            Show hand signs to your camera and they will be recognized in real-time using your trained model. Press "Add sign" to build a transcript.
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
            <strong>Real-time recognition</strong>
            <span>MediaPipe hand landmarks + trained ONNX model running entirely in your browser.</span>
          </article>
          <article>
            <strong>{signRecognizer.getSignCount()} signs trained</strong>
            <span>Model loaded from Supabase Storage with local fallback for offline use.</span>
          </article>
          <article>
            <strong>Accessible output</strong>
            <span>Recognized signs become readable text and browser speech output.</span>
          </article>
        </div>
      </aside>
    </section>
  )
}
