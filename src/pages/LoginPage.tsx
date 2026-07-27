import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/apiClient'

export function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    // A ref, not just `isSubmitting` state: state updates are asynchronous,
    // so two clicks landing before React re-renders `disabled` could both
    // pass a state-only check. The ref is set synchronously, before any
    // `await`, so the second call always sees it in time.
    const isSubmittingRef = useRef(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isSubmittingRef.current) {
            return
        }
        isSubmittingRef.current = true
        setError(null)
        setIsSubmitting(true)

        try {
            await login(email, password)
            navigate('/dashboard', { replace: true })
        } catch (caught) {
            if (caught instanceof ApiError) {
                setError(caught.errors?.email?.[0] ?? caught.message)
            } else {
                setError('Something went wrong. Please try again.')
            }
        } finally {
            isSubmittingRef.current = false
            setIsSubmitting(false)
        }
    }

    return (
        <main>
            <h1>Log in</h1>
            <form onSubmit={handleSubmit} noValidate>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>

                {error && <p role="alert">{error}</p>}

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in…' : 'Log in'}
                </button>
            </form>
        </main>
    )
}
