import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import * as signRecognizer from '../../signRecognizer.js'

const PracticeCamera = forwardRef(({ targetLabel, onMatch, disabled }, ref) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const latestLandmarksRef = useRef(null)
  const [status, setStatus] = useState('Initializing...')
  const [detected, setDetected] = useState(null)

  useImperativeHandle(ref, () => ({
    captureSample: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return null;
      
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      
      return {
        dataUrl,
        landmarks: latestLandmarksRef.current
      };
    }
  }));

  useEffect(() => {
    let running = !disabled

    const initCamera = async () => {
      if (disabled) return
      
      setStatus('Loading local AI model...')
      await signRecognizer.init()
      
      setStatus('Starting camera...')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        setStatus('Show the sign to the camera!')
        startInferenceLoops()
      } catch (err) {
        setStatus('Camera permission denied or unavailable.')
      }
    }

    const checkMatch = (label, confidence, source) => {
      if (!running || !label) return
      
      setDetected({ label, confidence, source })
      
      if (label.toLowerCase() === targetLabel.toLowerCase() && confidence >= 40) {
        running = false
        setStatus('Great job!')
        onMatch()
      }
    }

    const startInferenceLoops = () => {
      // Fast Local MediaPipe Loop (30fps)
      const localLoop = async () => {
        if (!running || !videoRef.current) return
        const video = videoRef.current
        
        if (video.readyState >= 2) {
          const result = await signRecognizer.processFrameAsync(video, performance.now())
          if (result) {
            latestLandmarksRef.current = result.landmarks
            if (result.confidence >= 60) {
              checkMatch(result.label, result.confidence, 'Local')
            }
          }
        }
        
        if (running) {
          animFrameRef.current = requestAnimationFrame(localLoop)
        }
      }
      
      localLoop()
    }

    initCamera()

    return () => {
      running = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [targetLabel, onMatch, disabled])

  return (
    <div className={`practice-camera-container ${disabled ? 'disabled' : ''}`}>
      <video ref={videoRef} autoPlay muted playsInline className="practice-video" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="practice-overlay">
        <span>{status}</span>
        {detected && !disabled && (
          <span className="practice-detected">
            I see: <strong>{detected.label.toUpperCase()}</strong> ({detected.confidence}%)
          </span>
        )}
      </div>
    </div>
  )
})

export default PracticeCamera
