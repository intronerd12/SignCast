/**
 * SignCard.jsx — Displays a sign with emoji, word, and description.
 * Features a flip animation to reveal the answer.
 */

import { useState } from 'react'

export default function SignCard({ sign, showAnswer = false, compact = false }) {
  const [flipped, setFlipped] = useState(showAnswer)

  if (!sign) return null

  return (
    <div
      className={`sign-card ${flipped ? 'flipped' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
      aria-label={`Sign card for ${sign.word}. ${flipped ? 'Showing answer' : 'Click to flip'}`}
    >
      <div className="sign-card-inner">
        {/* Front */}
        <div className="sign-card-front">
          <span className="sign-card-emoji">{sign.emoji}</span>
          <span className="sign-card-category">{sign.category}</span>
          <p className="sign-card-hint">Tap to reveal</p>
        </div>

        {/* Back */}
        <div className="sign-card-back">
          <span className="sign-card-emoji">{sign.emoji}</span>
          <h3 className="sign-card-word">{sign.word}</h3>
          <p className="sign-card-english">{sign.english}</p>
          <p className="sign-card-desc">{sign.description}</p>
        </div>
      </div>
    </div>
  )
}
