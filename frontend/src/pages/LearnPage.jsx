import { useState, useRef, useMemo } from 'react'
import { SIGNS } from '../data/fslLessons.js'
import PracticeCamera from '../components/learn/PracticeCamera.jsx'
import SignCard from '../components/learn/SignCard.jsx'

const API_BASE = '/api/v1'

export default function LearnPage() {
  const [selectedSignId, setSelectedSignId] = useState(SIGNS[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const cameraRef = useRef(null)

  const selectedSign = useMemo(() => SIGNS.find((s) => s.id === selectedSignId), [selectedSignId])

  const filteredSigns = useMemo(() => {
    if (!searchQuery) return SIGNS
    const query = searchQuery.toLowerCase()
    return SIGNS.filter(
      (s) =>
        s.word.toLowerCase().includes(query) ||
        s.english.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Group by category
  const signsByCategory = useMemo(() => {
    const groups = {}
    for (const sign of filteredSigns) {
      if (!groups[sign.category]) groups[sign.category] = []
      groups[sign.category].push(sign)
    }
    return groups
  }, [filteredSigns])

  const handleCaptureTrain = async () => {
    if (!cameraRef.current) return
    const snapshot = cameraRef.current.captureSample()
    if (!snapshot) {
      setStatusMessage('Camera not ready. Please wait.')
      return
    }

    setIsSaving(true)
    setStatusMessage('Saving training sample...')

    try {
      // 1. Download image for Roboflow
      const link = document.createElement('a')
      link.href = snapshot.dataUrl
      const safeLabel = selectedSign.modelLabel || selectedSign.word.toLowerCase().replace(/[^a-z0-9]/g, '_')
      link.download = `fsl_${safeLabel}_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 2. Upload landmarks to Supabase
      const payload = {
        label: selectedSign.modelLabel || selectedSign.word,
        category: selectedSign.category,
        source: 'integrated_studio',
        landmarks: snapshot.landmarks,
        notes: `Captured from Dynamic Learning Studio for ${selectedSign.english}`,
      }

      const response = await fetch(`${API_BASE}/recognition/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to save landmarks')
      }

      setStatusMessage('Success! Image downloaded & landmarks saved.')
      setTimeout(() => setStatusMessage(''), 4000)
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="learning-studio-container">
      {/* LEFT PANEL: Library */}
      <aside className="educational-panel">
        <div className="edu-header">
          <h2>Sign Library</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Search signs (e.g. hello, family)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="edu-scrollable">
          {Object.entries(signsByCategory).map(([category, signs]) => (
            <div key={category} className="edu-category">
              <h3 className="category-title">{category.toUpperCase()}</h3>
              <div className="edu-grid">
                {signs.map((sign) => (
                  <button
                    key={sign.id}
                    className={`edu-sign-btn ${selectedSignId === sign.id ? 'active' : ''}`}
                    onClick={() => setSelectedSignId(sign.id)}
                  >
                    <span className="edu-sign-emoji">{sign.emoji}</span>
                    <span className="edu-sign-word">{sign.word}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredSigns.length === 0 && <p className="no-results">No signs found.</p>}
        </div>
      </aside>

      {/* RIGHT PANEL: Integrated Practice & Train */}
      <main className="integrated-camera-panel">
        <div className="active-sign-header">
          <div className="active-sign-badge">{selectedSign.emoji}</div>
          <div className="active-sign-info">
            <h1>{selectedSign.word}</h1>
            <p className="translation">{selectedSign.english}</p>
          </div>
        </div>
        
        <div className="active-sign-instructions">
          <h3>How to sign this:</h3>
          <p>{selectedSign.description}</p>
        </div>

        <div className="studio-camera-wrapper">
          <PracticeCamera
            ref={cameraRef}
            targetLabel={selectedSign.modelLabel || selectedSign.word}
            onMatch={() => setStatusMessage('🎉 Correctly Recognized! Great job!')}
          />
        </div>

        <div className="studio-action-bar">
          <div className="action-info">
            <h4>Is the AI struggling to recognize you?</h4>
            <p>You can help improve the system by submitting this frame as training data.</p>
          </div>
          <button
            className="studio-train-btn"
            onClick={handleCaptureTrain}
            disabled={isSaving}
          >
            {isSaving ? 'Capturing...' : '📸 Capture & Train AI'}
          </button>
        </div>
        {statusMessage && <p className="studio-status-msg">{statusMessage}</p>}
      </main>
    </section>
  )
}
