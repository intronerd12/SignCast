import { useState } from 'react'
import { BrandLockup, VectorGesturePreview } from '../components/Brand'
import { registerUser } from '../auth/authClient'

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  purpose: 'fsl-user',
}

function RegisterPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submitRegistration = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    setIsLoading(true)

    try {
      await registerUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })

      setStatus({ type: 'success', message: 'Registration successful. Redirecting to login.' })
      setForm(INITIAL_FORM)

      window.setTimeout(() => {
        window.location.hash = '#/login'
      }, 900)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <BrandLockup />
        <div>
          <p className="eyebrow">Create access</p>
          <h1>Register for SignCast</h1>
          <p>
            Create a user account for the Filipino Sign Language recognition app. Admin accounts can be assigned separately.
          </p>
        </div>
        <VectorGesturePreview />
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">New account</p>
          <h2>Start using SignCast</h2>
          <p>Use your real contact details so the admin team can manage access properly.</p>
        </div>

        <form className="auth-form" onSubmit={submitRegistration}>
          <label className="field">
            <span>Full name</span>
            <input type="text" name="name" value={form.name} onChange={updateField} placeholder="Juan Dela Cruz" autoComplete="name" required />
          </label>

          <label className="field">
            <span>Email address</span>
            <input type="email" name="email" value={form.email} onChange={updateField} placeholder="name@example.com" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Phone number</span>
            <input type="tel" name="phone" value={form.phone} onChange={updateField} placeholder="09XX XXX XXXX" autoComplete="tel" required />
          </label>

          <label className="field">
            <span>Purpose</span>
            <select name="purpose" value={form.purpose} onChange={updateField}>
              <option value="fsl-user">FSL user</option>
              <option value="learner">FSL learner</option>
              <option value="interpreter">Interpreter or educator</option>
              <option value="support">Accessibility support</option>
            </select>
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={updateField} placeholder="Create a password" autoComplete="new-password" required />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} placeholder="Repeat your password" autoComplete="new-password" required />
          </label>

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <p className={`form-message ${status.type}`} aria-live="polite">{status.message}</p>
        </form>

        <p className="auth-switch">Already registered? <a href="#/login">Login here</a></p>
      </div>
    </section>
  )
}

export default RegisterPage
