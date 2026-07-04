/**
 * ExerciseView.jsx — Full-screen exercise runner
 *
 * Cycles through exercises, handles answers, tracks score,
 * shows correct/incorrect feedback, and celebration on completion.
 */

import { useState, useCallback } from 'react'
import { loseHeart, getHearts, MAX_HEARTS } from '../../data/learnStore.js'
import PracticeCamera from './PracticeCamera.jsx'

export default function ExerciseView({ exercises, unitTitle, unitColor, onComplete, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerState, setAnswerState] = useState(null) // null | 'correct' | 'incorrect'
  const [hearts, setHearts] = useState(getHearts())
  const [textInput, setTextInput] = useState('')
  const [matchState, setMatchState] = useState({ selected: null, matched: [] })
  const [isFinished, setIsFinished] = useState(false)

  const totalExercises = exercises.length
  const progress = Math.round((currentIndex / totalExercises) * 100)
  const currentExercise = exercises[currentIndex]

  // ── Advance to next question ──────────────────────────────────────────

  const goNext = useCallback(() => {
    if (currentIndex + 1 >= totalExercises) {
      setIsFinished(true)
      onComplete(correctCount + (answerState === 'correct' ? 0 : 0)) // already counted
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedAnswer(null)
    setAnswerState(null)
    setTextInput('')
    setMatchState({ selected: null, matched: [] })
  }, [currentIndex, totalExercises, onComplete, correctCount, answerState])

  // ── Handle answer selection (multiple-choice) ─────────────────────────

  const handleOptionClick = (option) => {
    if (answerState) return // Already answered

    setSelectedAnswer(option)

    const isCorrect = option === currentExercise.correctAnswer
    if (isCorrect) {
      setAnswerState('correct')
      setCorrectCount((c) => c + 1)
    } else {
      setAnswerState('incorrect')
      const h = loseHeart()
      setHearts(h)
    }
  }

  // ── Handle fill-blank submit ──────────────────────────────────────────

  const handleFillSubmit = (e) => {
    e.preventDefault()
    if (answerState) return

    const userAnswer = textInput.trim().toLowerCase()
    const isCorrect = currentExercise.acceptableAnswers?.some(
      (a) => a.toLowerCase() === userAnswer
    )

    setSelectedAnswer(textInput)
    if (isCorrect) {
      setAnswerState('correct')
      setCorrectCount((c) => c + 1)
    } else {
      setAnswerState('incorrect')
      const h = loseHeart()
      setHearts(h)
    }
  }

  // ── Handle match-pairs ────────────────────────────────────────────────

  const handleMatchTap = (item, side) => {
    if (matchState.matched.some((m) => m.sign === item || m.meaning === item)) return

    if (!matchState.selected) {
      setMatchState((s) => ({ ...s, selected: { item, side } }))
    } else {
      const prev = matchState.selected
      if (prev.side === side) {
        // Same side, reselect
        setMatchState((s) => ({ ...s, selected: { item, side } }))
        return
      }

      // Check match
      const signItem = side === 'sign' ? item : prev.item
      const meaningItem = side === 'meaning' ? item : prev.item

      const pair = currentExercise.pairs.find(
        (p) => p.sign === signItem && p.meaning === meaningItem
      )

      if (pair) {
        const newMatched = [...matchState.matched, { sign: signItem, meaning: meaningItem }]
        setMatchState({ selected: null, matched: newMatched })

        // All matched?
        if (newMatched.length === currentExercise.pairs.length) {
          setAnswerState('correct')
          setCorrectCount((c) => c + 1)
        }
      } else {
        // Wrong match — flash and reset selection
        setMatchState((s) => ({ ...s, selected: null }))
        const h = loseHeart()
        setHearts(h)
      }
    }
  }

  // ── No hearts left ────────────────────────────────────────────────────

  if (hearts <= 0 && !isFinished) {
    return (
      <div className="exercise-overlay">
        <div className="exercise-container">
          <div className="exercise-gameover">
            <span className="gameover-icon">💔</span>
            <h2>Out of Hearts!</h2>
            <p>You've run out of hearts. Take a break and try again later — hearts regenerate over time.</p>
            <button className="exercise-btn primary" onClick={onClose}>Go back</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Celebration screen ────────────────────────────────────────────────

  if (isFinished) {
    const score = correctCount
    const isPerfect = score === totalExercises

    return (
      <div className="exercise-overlay">
        <div className="exercise-container celebration">
          <div className="confetti-burst" />
          <div className="celebration-content">
            <span className="celebration-icon">{isPerfect ? '🎉' : '⭐'}</span>
            <h2>{isPerfect ? 'Perfect Lesson!' : 'Lesson Complete!'}</h2>
            <p className="celebration-unit">{unitTitle}</p>

            <div className="celebration-stats">
              <div className="celebration-stat">
                <strong>{score}/{totalExercises}</strong>
                <span>Correct</span>
              </div>
              <div className="celebration-stat xp-earned">
                <strong>+{score * 10 + (isPerfect ? 20 : 0)}</strong>
                <span>XP earned</span>
              </div>
              <div className="celebration-stat">
                <strong>{Math.round((score / totalExercises) * 100)}%</strong>
                <span>Accuracy</span>
              </div>
            </div>

            {isPerfect && <p className="perfect-badge">🏅 Perfect bonus: +20 XP</p>}

            <button className="exercise-btn primary" onClick={onClose}>
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render exercise ───────────────────────────────────────────────────

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        {/* Top bar */}
        <div className="exercise-topbar">
          <button className="exercise-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="exercise-progress-bar">
            <div className="exercise-progress-fill" style={{ width: `${progress}%`, background: unitColor }} />
          </div>
          <div className="exercise-hearts">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <span key={i} className={`exercise-heart ${i < hearts ? '' : 'lost'}`}>
                {i < hearts ? '❤️' : '🩶'}
              </span>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div className={`exercise-body ${answerState || ''}`}>
          {currentExercise.type === 'sign-to-text' && (
            <div className="exercise-question">
              <span className="exercise-type-badge">What sign is this?</span>
              <div className="exercise-sign-display">
                <span className="exercise-emoji">{currentExercise.emoji}</span>
                <p className="exercise-prompt">{currentExercise.prompt}</p>
              </div>
              <div className="exercise-options">
                {currentExercise.options.map((option) => (
                  <button
                    key={option}
                    className={`answer-btn ${
                      answerState && option === currentExercise.correctAnswer ? 'correct' : ''
                    } ${
                      answerState && selectedAnswer === option && option !== currentExercise.correctAnswer ? 'incorrect' : ''
                    } ${
                      !answerState && selectedAnswer === option ? 'selected' : ''
                    }`}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!answerState}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentExercise.type === 'text-to-sign' && (
            <div className="exercise-question">
              <span className="exercise-type-badge">Pick the correct sign</span>
              <h3 className="exercise-word">{currentExercise.question}</h3>
              <div className="exercise-options description-options">
                {currentExercise.options.map((option) => (
                  <button
                    key={option}
                    className={`answer-btn desc-btn ${
                      answerState && option === currentExercise.correctAnswer ? 'correct' : ''
                    } ${
                      answerState && selectedAnswer === option && option !== currentExercise.correctAnswer ? 'incorrect' : ''
                    }`}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!answerState}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentExercise.type === 'fill-blank' && (
            <div className="exercise-question">
              <span className="exercise-type-badge">Type the answer</span>
              <div className="exercise-sign-display">
                <span className="exercise-emoji">{currentExercise.emoji}</span>
                <p className="exercise-prompt">{currentExercise.prompt}</p>
              </div>
              <h3 className="exercise-word">{currentExercise.question}</h3>
              <form className="fill-blank-form" onSubmit={handleFillSubmit}>
                <input
                  type="text"
                  className={`fill-blank-input ${answerState || ''}`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your answer..."
                  disabled={!!answerState}
                  autoFocus
                />
                {!answerState && (
                  <button type="submit" className="exercise-btn primary" disabled={!textInput.trim()}>
                    Check
                  </button>
                )}
              </form>
              {answerState === 'incorrect' && (
                <p className="correct-answer-reveal">
                  Correct answer: <strong>{currentExercise.correctAnswer}</strong>
                </p>
              )}
            </div>
          )}

          {currentExercise.type === 'practice-sign' && (
            <div className="exercise-question">
              <span className="exercise-type-badge">Camera Practice</span>
              <h3 className="exercise-word">{currentExercise.question}</h3>
              <div className="exercise-sign-display">
                <span className="exercise-emoji">{currentExercise.emoji}</span>
                <p className="exercise-prompt">{currentExercise.prompt}</p>
              </div>
              <PracticeCamera
                targetLabel={currentExercise.correctAnswer}
                disabled={!!answerState}
                onMatch={() => {
                  if (!answerState) {
                    setAnswerState('correct')
                    setCorrectCount((c) => c + 1)
                  }
                }}
              />
            </div>
          )}

          {currentExercise.type === 'match-pairs' && (
            <div className="exercise-question">
              <span className="exercise-type-badge">Match the pairs</span>
              <h3 className="exercise-word">{currentExercise.question}</h3>
              <div className="match-pairs-grid">
                <div className="match-column">
                  {currentExercise.pairs.map((pair) => (
                    <button
                      key={pair.sign}
                      className={`match-btn ${
                        matchState.matched.some((m) => m.sign === pair.sign) ? 'matched' : ''
                      } ${
                        matchState.selected?.item === pair.sign ? 'active' : ''
                      }`}
                      onClick={() => handleMatchTap(pair.sign, 'sign')}
                      disabled={matchState.matched.some((m) => m.sign === pair.sign)}
                    >
                      {pair.sign}
                    </button>
                  ))}
                </div>
                <div className="match-column">
                  {[...currentExercise.pairs].sort(() => Math.random() - 0.5).map((pair) => (
                    <button
                      key={pair.meaning}
                      className={`match-btn ${
                        matchState.matched.some((m) => m.meaning === pair.meaning) ? 'matched' : ''
                      } ${
                        matchState.selected?.item === pair.meaning ? 'active' : ''
                      }`}
                      onClick={() => handleMatchTap(pair.meaning, 'meaning')}
                      disabled={matchState.matched.some((m) => m.meaning === pair.meaning)}
                    >
                      {pair.meaning}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback bar */}
        {answerState && (
          <div className={`exercise-feedback ${answerState}`}>
            <div className="feedback-content">
              <span className="feedback-icon">{answerState === 'correct' ? '✅' : '❌'}</span>
              <span className="feedback-text">
                {answerState === 'correct' ? 'Correct! Great job!' : 'Not quite. Keep practicing!'}
              </span>
            </div>
            <button className="exercise-btn primary" onClick={goNext}>
              {currentIndex + 1 >= totalExercises ? 'Finish' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
