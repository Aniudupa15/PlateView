import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, ApiError } from '../../api'
import { getAdminToken, setAdminToken } from '../../adminAuth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (getAdminToken()) navigate('/admin', { replace: true })
  }, [navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { token } = await adminLogin(email, password)
      setAdminToken(token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Incorrect email or password.' : 'Could not sign in. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page admin-login">
      <h1>PlateView Admin</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button type="submit" className="admin-button" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
