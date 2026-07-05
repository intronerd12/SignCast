import { useState, useEffect } from 'react'
import { UNITS, SIGNS, WORD_SPELL_BANK } from '../data/fslLessons.js'
import SignTestRunner from '../components/learn/SignTestRunner.jsx'
import WordSpellTestRunner from '../components/learn/WordSpellTestRunner.jsx'
import './LearnPagePremium.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function LearnPage({ session }) {
  const [activeTest, setActiveTest] = useState(null) // null | 'alphabet' | 'word-spelling'
  const [testSigns, setTestSigns] = useState([])
  const [testWords, setTestWords] = useState([])
  const [highScoreAlpha, setHighScoreAlpha] = useState(0)
  const [highScoreSpell, setHighScoreSpell] = useState(0)
  const [recentScores, setRecentScores] = useState([])
  const [loading, setLoading] = useState(true)

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
          if (data.scores) {
            setRecentScores(data.scores)
            const alphaScores = data.scores.filter(s => s.test_type === 'alphabet' || !s.test_type)
            const spellScores = data.scores.filter(s => s.test_type === 'word-spelling')
            if (alphaScores.length > 0) setHighScoreAlpha(Math.max(...alphaScores.map(s => s.score)))
            if (spellScores.length > 0) setHighScoreSpell(Math.max(...spellScores.map(s => s.score)))
          }
          if (data.highest_score && !data.scores) setHighScoreAlpha(data.highest_score)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [session?.userId])

  // --- Test 1: Alphabet ---
  const handleStartAlphabetTest = () => {
    if (!testableUnit) return
    const shuffled = [...testableUnit.testableSigns].sort(() => Math.random() - 0.5)
    setTestSigns(shuffled)
    setActiveTest('alphabet')
  }

  // --- Test 2: Word Spelling ---
  const handleStartSpellingTest = () => {
    const shuffled = [...WORD_SPELL_BANK].sort(() => Math.random() - 0.5)
    setTestWords(shuffled.slice(0, 4))
    setActiveTest('word-spelling')
  }

  const handleTestComplete = async (finalScore, testType) => {
    setActiveTest(null)
    setTestSigns([])
    setTestWords([])

    if (session?.userId && finalScore > 0) {
      try {
        await fetch(`${API_BASE}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.userId,
            score: finalScore,
            test_type: testType
          })
        })
        if (testType === 'alphabet' && finalScore > highScoreAlpha) {
          setHighScoreAlpha(finalScore)
        }
        if (testType === 'word-spelling' && finalScore > highScoreSpell) {
          setHighScoreSpell(finalScore)
        }
        setRecentScores(prev => [
          { score: finalScore, test_type: testType, created_at: new Date().toISOString() },
          ...prev
        ])
      } catch (err) {
        console.error("Failed to save score", err)
      }
    }
  }

  const handleCloseTest = () => {
    setActiveTest(null)
    setTestSigns([])
    setTestWords([])
  }

  const getTestTypeLabel = (type) => {
    switch(type) {
      case 'word-spelling': return 'Spelling Test'
      case 'alphabet': return 'Alphabet Test'
      default: return 'Alphabet Test'
    }
  }

  const totalTests = recentScores.length
  const bestOverall = recentScores.length > 0 ? Math.max(...recentScores.map(s => s.score)) : 0

  return (
    <div className="premium-learn-container">
      <div className="premium-header">
        <div className="premium-header-icon">🎓</div>
        <h1>FSL Certification Tests</h1>
        <p>Prove your mastery of Filipino Sign Language through hands-on challenges.</p>
      </div>

      {/* Quick Stats Bar */}
      {!loading && recentScores.length > 0 && (
        <div className="premium-quick-stats">
          <div className="quick-stat">
            <span className="quick-stat-value">{totalTests}</span>
            <span className="quick-stat-label">Tests Taken</span>
          </div>
          <div className="quick-stat-divider" />
          <div className="quick-stat">
            <span className="quick-stat-value">{bestOverall}</span>
            <span className="quick-stat-label">Best Score</span>
          </div>
          <div className="quick-stat-divider" />
          <div className="quick-stat">
            <span className="quick-stat-value">{highScoreAlpha + highScoreSpell}</span>
            <span className="quick-stat-label">Combined Best</span>
          </div>
        </div>
      )}

      {/* Test Cards Grid */}
      <div className="premium-test-grid">

        {/* TEST 1: Alphabet Recognition */}
        {testableUnit && (
          <div className="premium-test-card" id="test-1-card">
            <div className="card-bg-gradient"></div>
            <div className="card-content">
              <div className="card-icon-wrapper">
                <span className="card-icon">{testableUnit.icon}</span>
              </div>

              <div className="card-text">
                <div className="card-test-label">Test 1</div>
                <h2>{testableUnit.title}</h2>
                <p>Show individual FSL letter signs to the camera. You'll be asked to sign {testableUnit.testableSigns.length} different letters. 3 strikes and you're out!</p>

                <div className="card-badges">
                  <span className="badge camera">📸 Camera</span>
                  <span className="badge strikes">❤️ 3 Lives</span>
                  <span className="badge signs-count">🔤 {testableUnit.testableSigns.length} Signs</span>
                  {highScoreAlpha > 0 && <span className="badge score">🏆 Best: {highScoreAlpha}</span>}
                </div>
              </div>

              <button className="premium-start-btn" onClick={handleStartAlphabetTest} id="start-test-1">
                <span className="btn-text">Begin Test</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* TEST 2: Word Spelling */}
        <div className="premium-test-card spell-card" id="test-2-card">
          <div className="card-bg-gradient spell-gradient"></div>
          <div className="card-content">
            <div className="card-icon-wrapper spell-icon-wrapper">
              <span className="card-icon">📝</span>
            </div>

            <div className="card-text">
              <div className="card-test-label spell-label">Test 2</div>
              <h2>Word Spelling Challenge</h2>
              <p>Spell words letter-by-letter using FSL fingerspelling! Sign each letter in sequence to build complete words from our word bank.</p>

              <div className="card-badges">
                <span className="badge camera">📸 Camera</span>
                <span className="badge strikes">❤️ 3 Lives</span>
                <span className="badge signs-count spell-badge">📝 4 Words</span>
                {highScoreSpell > 0 && <span className="badge score">🏆 Best: {highScoreSpell}</span>}
              </div>
            </div>

            <button className="premium-start-btn spell-start-btn" onClick={handleStartSpellingTest} id="start-test-2">
              <span className="btn-text">Begin Test</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>

      </div>

      {/* RECENT SCORES SECTION */}
      {recentScores.length > 0 && (
        <div className="recent-scores-container">
          <div className="recent-scores-header">
            <h3>📊 Recent Activity</h3>
            <span className="recent-scores-count">{recentScores.length} test{recentScores.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="recent-scores-list">
            {recentScores.slice(0, 8).map((score, index) => {
              const date = new Date(score.created_at)
              const isSpelling = score.test_type === 'word-spelling'
              const isHighScore = (isSpelling && score.score === highScoreSpell) || 
                                  (!isSpelling && score.score === highScoreAlpha)
              return (
                <div key={index} className={`recent-score-card ${isSpelling ? 'spell-score' : ''} ${isHighScore ? 'high-score' : ''}`}>
                  <div className="score-icon-col">
                    <span className="score-icon">{isSpelling ? '📝' : '🔤'}</span>
                  </div>
                  <div className="score-info">
                    <span className="score-type">
                      {getTestTypeLabel(score.test_type)}
                      {isHighScore && <span className="high-score-badge">★ BEST</span>}
                    </span>
                    <span className="score-date">{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`score-value ${isSpelling ? 'spell-value' : ''}`}>
                    <strong>{score.score}</strong>
                    <span>pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FULLSCREEN TEST 1 RUNNER */}
      {activeTest === 'alphabet' && testSigns.length > 0 && (
        <SignTestRunner
          signs={testSigns}
          title={testableUnit.title}
          color={testableUnit.color}
          onClose={handleCloseTest}
          onComplete={(score) => handleTestComplete(score, 'alphabet')}
        />
      )}

      {/* FULLSCREEN TEST 2 RUNNER */}
      {activeTest === 'word-spelling' && testWords.length > 0 && (
        <WordSpellTestRunner
          words={testWords}
          title="Word Spelling Challenge"
          color="#ce82ff"
          onClose={handleCloseTest}
          onComplete={(score) => handleTestComplete(score, 'word-spelling')}
        />
      )}
    </div>
  )
}
