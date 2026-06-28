import { useState } from 'react'
import { VectorGesturePreview } from '../components/Brand.jsx'
import { registerUser, loginWithGoogle } from '../auth/authClient'

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

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

      setStatus({ type: 'success', message: 'Account created. Redirecting to login…' })
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

  const handleGoogleRegister = async () => {
    setStatus({ type: '', message: '' })
    setIsGoogleLoading(true)

    try {
      const session = await loginWithGoogle({
        accessType: 'user',
        rememberMe: true,
      })

      setStatus({
        type: 'success',
        message: `Signed in as ${session.email}. Redirecting…`,
      })

      window.setTimeout(() => {
        window.location.hash = session.isAdmin ? '#/admin' : '#/app'
      }, 800)
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user') {
        setIsGoogleLoading(false)
        return
      }
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <div>
          <p className="eyebrow">Get started</p>
          <h1>Create your SignCast account</h1>
          <p>
            Join the Filipino Sign Language recognition platform. Admin access can be granted separately by a system administrator.
          </p>
        </div>
        <VectorGesturePreview />
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <h2>Create account</h2>
          <p>Fill in your details or sign up with Google.</p>
        </div>

        <form className="auth-form" onSubmit={submitRegistration}>
          <button
            type="button"
            className="google-button"
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleRegister}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isGoogleLoading ? 'Connecting…' : 'Sign up with Google'}
          </button>

          <div className="auth-divider">
            <span>or register with email</span>
          </div>

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

          <button className="submit-button" type="submit" disabled={isLoading || isGoogleLoading}>
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>

          <p className={`form-message ${status.type}`} aria-live="polite">{status.message}</p>
        </form>

        <p className="auth-switch">Already have an account? <a href="#/login">Sign in</a></p>
      </div>
    </section>
  )
}

export default RegisterPage
