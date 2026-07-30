import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoginForm } from '../components/auth/LoginForm'
import { Spinner } from '../components/ui/Spinner'

export default function LoginPage() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner size="lg" />
  if (user) return <Navigate to="/dashboard" replace />

  return <LoginForm />
}
