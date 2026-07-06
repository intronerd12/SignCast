import { useState, useRef, useEffect } from 'react'
import PracticeCamera from './PracticeCamera.jsx'

export default function WordSpellTestRunner({ words, title, color, onClose, onComplete }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [status, setStatus] = useState('idle') // idle | correct | incorrect | word-done | gameover | finished
  const [feedback, setFeedback] = useState('')
  const [completedLetters, setCompletedLetters] = useState([]) // indices of completed letters in current word
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const cameraRef = useRef(null)

  const currentWord = words[currentWordIndex]
  const totalWords = words.length
  const MAX_STRIKES = 3

  // Overall progress: letters completed across all words
  const totalLetters = words.reduce((sum, w) => sum + w.letters.length, 0)
  const lettersBeforeCurrent = words.slice(0, currentWordIndex).reduce((sum, w) => sum + w.letters.length, 0)
  const progress = Math.round(((lettersBeforeCurrent + completedLetters.length) / totalLetters) * 100)

  useEffect(() => {
    if (status === 'idle') {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setCountdown(5)
    }
  }, [status])

  useEffect(() => {
    if (countdown <= 0 && status === 'idle') {
      handleSubmitPose()
    }
  }, [countdown, status])

  const handleSubmitPose = () => {
    if (!cameraRef.current || status !== 'idle') return
    const prediction = cameraRef.current.getCurrentPrediction()

    if (!prediction || !prediction.label) {
      setFeedback('No sign detected yet. Show your hand to the camera.')
      return
    }

    const predictedLabel = prediction.label.toLowerCase()
    const targetLabel = currentWord.letters[currentLetterIndex].toLowerCase()

    if (predictedLabel === targetLabel) {
      handleLetterCorrect()
    } else {
      handleLetterIncorrect(predictedLabel)
    }
  }

  const handleLetterCorrect = () => {
    const newCompleted = [...completedLetters, currentLetterIndex]
    setCompletedLetters(newCompleted)
    setStatus('correct')
    setFeedback(`✅ "${currentWord.letters[currentLetterIndex].toUpperCase()}" — correct!`)

    setTimeout(() => {
      const nextLetterIdx = currentLetterIndex + 1

      if (nextLetterIdx >= currentWord.letters.length) {
        handleWordComplete()
      } else {
        setCurrentLetterIndex(nextLetterIdx)
        setStatus('idle')
        setFeedback('')
      }
    }, 1200)
  }

  const handleWordComplete = () => {
    setWordsCompleted(w => w + 1)
    setStatus('word-done')
    setFeedback(`🎯 "${currentWord.word}" spelled correctly!`)

    setTimeout(() => {
      const nextWordIdx = currentWordIndex + 1

      if (nextWordIdx >= totalWords) {
        setStatus('finished')
        onComplete(totalWords - strikes)
      } else {
        setCurrentWordIndex(nextWordIdx)
        setCurrentLetterIndex(0)
        setCompletedLetters([])
        setStatus('idle')
        setFeedback('')
      }
    }, 2000)
  }

  const handleLetterIncorrect = (predictedLabel) => {
    const newStrikes = strikes + 1
    setStrikes(newStrikes)
    setStatus('incorrect')
    setFeedback(`❌ I saw "${predictedLabel.toUpperCase()}" — need "${currentWord.letters[currentLetterIndex].toUpperCase()}"`)

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
            <p>You received 3 strikes. Practice your fingerspelling and try again!</p>
            <div className="gameover-stats">
              <div className="gameover-stat">
                <strong>{wordsCompleted}</strong>
                <span>Words Done</span>
              </div>
              <div className="gameover-stat">
                <strong>{completedLetters.length}</strong>
                <span>Letters This Word</span>
              </div>
            </div>
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
            <h2>{isPerfect ? 'Perfect Spelling!' : 'Spelling Test Complete!'}</h2>
            <p className="celebration-unit">{title}</p>

            {/* Show words that were spelled */}
            <div className="spell-completed-words">
              {words.map((w, i) => (
                <span key={i} className="spell-completed-word">{w.word}</span>
              ))}
            </div>

            <div className="celebration-stats">
              <div className="celebration-stat">
                <strong>{totalWords}</strong>
                <span>Words Spelled</span>
              </div>
              <div className="celebration-stat">
                <strong>{totalLetters}</strong>
                <span>Letters Signed</span>
              </div>
              <div className="celebration-stat">
                <strong>{MAX_STRIKES - strikes}</strong>
                <span>Hearts Left</span>
              </div>
            </div>

            {isPerfect && <p className="perfect-badge">🏅 Zero mistakes — incredible!</p>}

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
          <button className="exercise-close" onClick={onClose} aria-label="Close test">✕</button>
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

        {/* Word Spelling Area */}
        <div className="exercise-body">
          <div className="exercise-question">
            <span className="exercise-type-badge" style={{ background: `${color}22`, color }}>
              Spell the Word
            </span>

            {/* Word counter */}
            <p className="spell-word-counter">
              Word {currentWordIndex + 1} of {totalWords}
            </p>

            {/* Letter Tiles */}
            <div className="spell-word-display">
              {currentWord.letters.map((letter, idx) => {
                const isCompleted = completedLetters.includes(idx)
                const isActive = idx === currentLetterIndex && !isCompleted
                const isFuture = idx > currentLetterIndex && !isCompleted

                return (
                  <div
                    key={`${currentWordIndex}-${idx}`}
                    className={`spell-letter-tile ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}
                    style={{
                      '--tile-color': color,
                      animationDelay: `${idx * 0.1}s`
                    }}
                  >
                    <span className="spell-letter-char">
                      {isCompleted || isActive ? letter.toUpperCase() : '?'}
                    </span>
                    {isCompleted && <span className="spell-letter-check">✓</span>}
                    {isActive && <span className="spell-letter-cursor" />}
                  </div>
                )
              })}
            </div>

            {/* Instruction */}
            <h3 className="exercise-word" style={{ marginTop: '12px' }}>
              Sign the letter <strong style={{ color, fontSize: '28px' }}>{currentWord.letters[currentLetterIndex].toUpperCase()}</strong>
            </h3>

            {/* Camera */}
            <div className="studio-camera-wrapper" style={{ marginTop: '12px', minHeight: '300px' }}>
              <PracticeCamera
                ref={cameraRef}
                targetLabel={currentWord.letters[currentLetterIndex]}
                manualMode={true}
                disabled={status === 'correct' || status === 'incorrect' || status === 'word-done'}
              />
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`test-feedback-banner ${status === 'word-done' ? 'correct' : status}`}>
                <span className="test-feedback-text">{feedback}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="exercise-btn primary submit-pose-btn"
              onClick={handleSubmitPose}
              disabled={status !== 'idle'}
              style={{ marginTop: '16px', width: '100%', fontSize: '18px' }}
            >
              📸 Auto-detecting in {countdown}s (Click to submit now)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
