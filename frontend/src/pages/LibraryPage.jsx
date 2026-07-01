import { useState, useEffect } from 'react'
import { API_BASE, normalizeLibraryEntry } from '../helpers.js'

const aslSamples = [
  { phrase: 'Kumusta', confidence: 96, motion: 'Hand wave or curve', gloss: 'KUMUSTA' },
  { phrase: 'Salamat', confidence: 92, motion: 'Hand from chin forward', gloss: 'SALAMAT' },
  { phrase: 'Oo', confidence: 98, motion: 'Fist nodding', gloss: 'OO' },
  { phrase: 'Hindi', confidence: 94, motion: 'First two fingers tapping thumb', gloss: 'HINDI' },
  { phrase: 'Maganda', confidence: 88, motion: 'Hand circling face', gloss: 'MAGANDA' },
  { phrase: 'Pangalan', confidence: 85, motion: 'Index and middle fingers crossing', gloss: 'PANGALAN' },
  { phrase: 'Paalam', confidence: 89, motion: 'Hand waving', gloss: 'PAALAM' },
]

export default function LibraryPage({ session }) {
  const [librarySigns, setLibrarySigns] = useState(aslSamples.map((sample) => normalizeLibraryEntry(sample)))
  const [recentSamples, setRecentSamples] = useState([])
  const [libraryStatus, setLibraryStatus] = useState('Loading sign library...')
  const [formStatus, setFormStatus] = useState('Store a sign sample to start teaching your FSL model.')
  const [isSaving, setIsSaving] = useState(false)
  const [teachingForm, setTeachingForm] = useState({
    label: '',
    phrase: '',
    gloss: '',
    notes: '',
  })

  const loadLibrary = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/library?limit=80`)
      const data = await response.json()

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || 'Unable to load sign library')
      }

      const mapped = data.map((sample) => normalizeLibraryEntry(sample)).filter((item) => item.phrase)
      const nextLibrary = mapped.length > 0
        ? mapped
        : aslSamples.map((sample) => normalizeLibraryEntry(sample))

      setLibrarySigns(nextLibrary)
      setLibraryStatus(`Loaded ${nextLibrary.length} signs from API`)
    } catch {
      setLibrarySigns(aslSamples.map((sample) => normalizeLibraryEntry(sample)))
      setLibraryStatus('Using local sign library fallback')
    }
  }

  const loadRecentSamples = async () => {
    try {
      const response = await fetch(`${API_BASE}/recognition/teach?limit=10`)
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to load taught samples')
      }

      setRecentSamples(Array.isArray(data.samples) ? data.samples : [])
    } catch {
      setRecentSamples([])
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLibrary()
      loadRecentSamples()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setTeachingForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleTeachSign = async (event) => {
    event.preventDefault()

    const label = teachingForm.label.trim().toLowerCase()
    if (!label) {
      setFormStatus('Label is required to store a sign sample.')
      return
    }

    setIsSaving(true)
    setFormStatus('Saving sign sample...')

    const payload = {
      userId: session?.userId || null,
      label,
      phrase: teachingForm.phrase.trim() || label,
      gloss: teachingForm.gloss.trim(),
      notes: teachingForm.notes.trim(),
      landmarks: [],
      source: 'web-library-form',
      confidence: 78,
    }

    try {
      const response = await fetch(`${API_BASE}/recognition/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to save sign sample')
      }

      setTeachingForm({
        label: '',
        phrase: '',
        gloss: '',
        notes: '',
      })
      setFormStatus('Sign sample stored. Recognition can now learn from it.')
      await loadLibrary()
      await loadRecentSamples()
    } catch (error) {
      setFormStatus(error.message || 'Unable to save sign sample')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="library-layout">
      <div className="panel-heading">
        <p className="eyebrow">FSL learning library</p>
        <h2>Teach SignCast with stored sign information</h2>
        <p>
          Add labeled FSL signs, keep your examples in storage, and reuse them in recognition.
        </p>
      </div>

      <div className="teaching-layout">
        <form className="teach-form" onSubmit={handleTeachSign}>
          <label className="field">
            <span>Label (required)</span>
            <input
              type="text"
              name="label"
              value={teachingForm.label}
              onChange={handleFieldChange}
              placeholder="e.g. kumusta"
              required
            />
          </label>

          <label className="field">
            <span>Phrase</span>
            <input
              type="text"
              name="phrase"
              value={teachingForm.phrase}
              onChange={handleFieldChange}
              placeholder="e.g. Kumusta"
            />
          </label>

          <label className="field">
            <span>Gloss</span>
            <input
              type="text"
              name="gloss"
              value={teachingForm.gloss}
              onChange={handleFieldChange}
              placeholder="e.g. KUMUSTA"
            />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              name="notes"
              value={teachingForm.notes}
              onChange={handleFieldChange}
              placeholder="Optional tip on hand shape or motion"
              rows={4}
            />
          </label>

          <button type="submit" className="submit-button" disabled={isSaving}>
            {isSaving ? 'Saving sample...' : 'Teach this sign'}
          </button>

          <p className={formStatus.includes('stored') ? 'form-message success' : 'form-message'}>{formStatus}</p>
        </form>

        <section className="teach-log" aria-label="Recent taught samples">
          <div className="transcript-header">
            <span>Recent taught samples</span>
            <button type="button" onClick={loadRecentSamples}>Refresh</button>
          </div>

          {recentSamples.length === 0 ? (
            <p className="sentence">No stored samples yet. Add your first FSL label.</p>
          ) : (
            <ul className="teach-list">
              {recentSamples.map((sample) => (
                <li key={sample.id}>
                  <strong>{sample.phrase || sample.label}</strong>
                  <span>{sample.gloss}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="library-status">{libraryStatus}</p>

      <div className="sign-library">
        {librarySigns.map((sample, index) => (
          <article key={`${sample.phrase}-${sample.source}-${index}`}>
            <span>{sample.confidence}%</span>
            <h3>{sample.phrase}</h3>
            <p>{sample.gloss ? `Gloss: ${sample.gloss}` : sample.motion || 'Stored sign sample'}</p>
            <small className="library-source">{sample.source === 'learned-dataset' ? 'Learned sample' : 'Prototype sample'}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
