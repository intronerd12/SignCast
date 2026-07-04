import { useState, useRef } from 'react'
import PracticeCamera from './PracticeCamera.jsx'

export default function SignTestRunner({ signs, title, color, onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [status, setStatus] = useState('idle') // idle | correct | incorrect | gameover | finished
  const [feedback, setFeedback] = useState('')
  const cameraRef = useRef(null)

  const currentSign = signs[currentIndex]
  const totalSigns = signs.length
  const progress = Math.round((currentIndex / totalSigns) * 100)
  const MAX_STRIKES = 3

  const handleSubmitPose = () => {
    if (!cameraRef.current) return
    const prediction = cameraRef.current.getCurrentPrediction()
    
    if (!prediction || !prediction.label) {
      setFeedback('No sign detected yet. Show your hand to the camera.')
      return
    }

    const predictedLabel = prediction.label.toLowerCase()
    const targetLabel = currentSign.modelLabel.toLowerCase()

    if (predictedLabel === targetLabel) {
      handleCorrect()
    } else {
      handleIncorrect(predictedLabel)
    }
  }

  const handleCorrect = () => {
    setStatus('correct')
    setFeedback('✅ Correct! Good job.')
    setTimeout(() => {
      if (currentIndex + 1 >= totalSigns) {
        setStatus('finished')
        onComplete(totalSigns - strikes) // simple scoring
      } else {
        setCurrentIndex((i) => i + 1)
        setStatus('idle')
        setFeedback('')
      }
    }, 1500)
  }

  const handleIncorrect = (predictedLabel) => {
    const newStrikes = strikes + 1
    setStrikes(newStrikes)
    setStatus('incorrect')
    setFeedback(`❌ Incorrect. I saw "${predictedLabel.toUpperCase()}". Try again.`)
    
    if (newStrikes >= MAX_STRIKES) {
      setTimeout(() => {
        setStatus('gameover')
      }, 1500)
    } else {
      setTimeout(() => {
        setStatus('idle')
        setFeedback('')
      }, 2000)
    }
  }

  // --- Game Over Screen ---
  if (status === 'gameover') {
    return (
      <div className="exercise-overlay">
        <div className="exercise-container">
          <div className="exercise-gameover">
            <span className="gameover-icon">💔</span>
            <h2>Test Failed</h2>
            <p>You received 3 strikes. Practice more and try again!</p>
            <button className="exercise-btn primary" onClick={onClose}>Back to Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Finished Screen ---
  if (status === 'finished') {
    const isPerfect = strikes === 0
    return (
      <div className="exercise-overlay">
        <div className="exercise-container celebration">
          <div className="confetti-burst" />
          <div className="celebration-content">
            <span className="celebration-icon">{isPerfect ? '🎉' : '⭐'}</span>
            <h2>Test Complete!</h2>
            <p className="celebration-unit">{title}</p>

            <div className="celebration-stats">
              <div className="celebration-stat">
                <strong>{totalSigns}</strong>
                <span>Signs Tested</span>
              </div>
              <div className="celebration-stat">
                <strong>{MAX_STRIKES - strikes}</strong>
                <span>Hearts Remaining</span>
              </div>
            </div>

            <button className="exercise-btn primary" onClick={onClose}>Continue</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Main Test Screen ---
  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        {/* Topbar */}
        <div className="exercise-topbar">
          <button className="exercise-close" onClick={onClose}>✕</button>
          <div className="exercise-progress-bar">
            <div className="exercise-progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>
          <div className="exercise-hearts">
            {Array.from({ length: MAX_STRIKES }).map((_, i) => (
              <span key={i} className={`exercise-heart ${i < (MAX_STRIKES - strikes) ? '' : 'lost'}`}>
                {i < (MAX_STRIKES - strikes) ? '❤️' : '🩶'}
              </span>
            ))}
          </div>
        </div>

        {/* Question Area */}
        <div className="exercise-body">
          <div className="exercise-question">
            <span className="exercise-type-badge">Action Required</span>
            <h3 className="exercise-word" style={{ marginTop: '10px' }}>
              What is the FSL sign for <strong style={{ color }}>{currentSign.word}</strong>?
            </h3>
            
            <div className="studio-camera-wrapper" style={{ marginTop: '20px', minHeight: '340px' }}>
              <PracticeCamera
                ref={cameraRef}
                targetLabel={currentSign.modelLabel}
                manualMode={true}
                disabled={status === 'correct' || status === 'incorrect'}
              />
            </div>
            
            {feedback && (
              <p className={`test-feedback ${status}`} style={{
                textAlign: 'center', 
                fontWeight: 'bold', 
                marginTop: '16px',
                color: status === 'correct' ? '#58cc02' : '#ff4b4b'
              }}>
                {feedback}
              </p>
            )}

            <button 
              className="exercise-btn primary submit-pose-btn" 
              onClick={handleSubmitPose}
              disabled={status === 'correct' || status === 'incorrect'}
              style={{ marginTop: '20px', width: '100%', fontSize: '18px' }}
            >
              📸 Submit Pose
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
