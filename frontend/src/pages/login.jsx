import { useState } from 'react'
import { BrandLockup, VectorGesturePreview } from '../components/Brand.jsx'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    accessType: 'user',
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setStatus('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to login. Please check your account.')
      }

      if (form.accessType === 'admin' && !data.isAdmin) {
        throw new Error('This account is not assigned as an admin account.')
      }

      localStorage.setItem('signcastAuth', JSON.stringify(data))
      setStatus(data.isAdmin ? 'Admin login successful. Admin dashboard can be connected next.' : 'Login successful. SignCast app access can be connected next.')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <BrandLockup />
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>Login to SignCast</h1>
          <p>
            Users can enter the FSL recognition app, while admins can access the web management area once connected.
          </p>
        </div>
        <VectorGesturePreview />
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your account</h2>
          <p>Choose the correct access type before logging in.</p>
        </div>

        <form className="auth-form" onSubmit={submitLogin}>
          <div className="segment-control" aria-label="Access type">
            <label className={form.accessType === 'user' ? 'selected' : ''}>
              <input type="radio" name="accessType" value="user" checked={form.accessType === 'user'} onChange={updateField} />
              User app
            </label>
            <label className={form.accessType === 'admin' ? 'selected' : ''}>
              <input type="radio" name="accessType" value="admin" checked={form.accessType === 'admin'} onChange={updateField} />
              Admin web
            </label>
          </div>

          <label className="field">
            <span>Email address</span>
            <input type="email" name="email" value={form.email} onChange={updateField} placeholder="name@example.com" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={updateField} placeholder="Enter your password" autoComplete="current-password" required />
          </label>

          <div className="form-row">
            <label className="check-field">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#/login">Forgot password?</a>
          </div>

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="form-message" aria-live="polite">{status}</p>
        </form>

        <p className="auth-switch">No account yet? <a href="#/register">Create an account</a></p>
      </div>
    </section>
  )
}

export default LoginPage
