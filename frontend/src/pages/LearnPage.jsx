import { useState, useEffect } from 'react'
import { UNITS, SIGNS } from '../data/fslLessons.js'
import SignTestRunner from '../components/learn/SignTestRunner.jsx'
import './LearnPagePremium.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function LearnPage({ session }) {
  const [activeUnit, setActiveUnit] = useState(null)
  const [testSigns, setTestSigns] = useState([])
  const [highScore, setHighScore] = useState(0)
  const [recentScores, setRecentScores] = useState([])

  // Only get the Alphabet unit (Test 1)
  const alphabetUnit = UNITS.find(u => u.id === 'alphabet')
  const testableUnit = alphabetUnit ? {
    ...alphabetUnit,
    testableSigns: alphabetUnit.signs
      .map(id => SIGNS.find(s => s.id === id))
      .filter(s => s && s.modelLabel)
  } : null

  useEffect(() => {
    if (session?.userId) {
      fetch(`${API_BASE}/scores/${session.userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.highest_score) setHighScore(data.highest_score)
          if (data.scores) setRecentScores(data.scores)
        })
        .catch(console.error)
    }
  }, [session?.userId])

  const handleStartTest = () => {
    if (!testableUnit) return
    const shuffled = [...testableUnit.testableSigns].sort(() => Math.random() - 0.5)
    setTestSigns(shuffled)
    setActiveUnit(testableUnit)
  }

  const handleTestComplete = async (finalScore) => {
    setActiveUnit(null)
    setTestSigns([])

    if (session?.userId && finalScore > 0) {
      try {
        await fetch(`${API_BASE}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.userId,
            score: finalScore,
            test_type: testableUnit.id
          })
        })
        if (finalScore > highScore) {
          setHighScore(finalScore)
        }
        // Optimistically add to recent scores
        setRecentScores(prev => [
          { score: finalScore, created_at: new Date().toISOString() },
          ...prev
        ])
      } catch (err) {
        console.error("Failed to save score", err)
      }
    }
  }

  const handleCloseTest = () => {
    setActiveUnit(null)
    setTestSigns([])
  }

  return (
    <div className="premium-learn-container">
      <div className="premium-header">
        <h1>FSL Certification Test</h1>
        <p>Prove your mastery of the Filipino Sign Language.</p>
      </div>

      {testableUnit && (
        <div className="premium-test-card">
          <div className="card-bg-gradient"></div>
          <div className="card-content">
            <div className="card-icon-wrapper">
              <span className="card-icon">{testableUnit.icon}</span>
            </div>
            
            <div className="card-text">
              <h2>{testableUnit.title}</h2>
              <p>Test your physical signing skills! You will be asked to pose {testableUnit.testableSigns.length} different signs into your camera. You have 3 strikes.</p>
              
              <div className="card-badges">
                <span className="badge camera">📸 Camera Required</span>
                <span className="badge strikes">❤️ 3 Strikes</span>
                <span className="badge score">🏆 High Score: {highScore}</span>
              </div>
            </div>

            <button className="premium-start-btn" onClick={handleStartTest}>
              <span className="btn-text">Begin Test</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* RECENT SCORES SECTION */}
      {recentScores.length > 0 && (
        <div className="recent-scores-container">
          <h3>Your Recent Tests</h3>
          <div className="recent-scores-list">
            {recentScores.slice(0, 5).map((score, index) => {
              const date = new Date(score.created_at)
              return (
                <div key={index} className="recent-score-card">
                  <div className="score-info">
                    <span className="score-date">{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="score-type">Alphabet Test</span>
                  </div>
                  <div className="score-value">
                    <strong>{score.score}</strong> pts
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FULLSCREEN TEST RUNNER */}
      {activeUnit && testSigns.length > 0 && (
        <SignTestRunner
          signs={testSigns}
          title={activeUnit.title}
          color={activeUnit.color}
          onClose={handleCloseTest}
          onComplete={handleTestComplete}
        />
      )}
    </div>
  )
}
