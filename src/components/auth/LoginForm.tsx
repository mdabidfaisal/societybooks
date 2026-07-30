import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function LoginForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('deactivated') === '1') {
      setError('Your samiti has been deactivated. Please contact the super administrator.')
    } else if (searchParams.get('member_inactive') === '1') {
      setError('Your membership is no longer active. Please contact the samiti admin.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role
    const samitiId = data.user?.user_metadata?.samiti_id

    if (role && role !== 'super_admin' && samitiId) {
      const { data: samiti } = await supabase
        .from('samiti_settings')
        .select('is_active')
        .eq('id', samitiId)
        .single()

      if (samiti && !samiti.is_active) {
        await supabase.auth.signOut()
        setError('Your samiti has been deactivated. Please contact the super administrator.')
        setLoading(false)
        return
      }
    }

    if (role === 'member') {
      const memberId = data.user?.user_metadata?.member_id
      if (memberId) {
        const { data: member } = await supabase
          .from('members')
          .select('status')
          .eq('id', memberId)
          .single()

        if (member && member.status !== 'active') {
          await supabase.auth.signOut()
          setError('Your membership is no longer active. Please contact the samiti admin.')
          setLoading(false)
          return
        }
      }
    }

    if (role === 'super_admin') {
      navigate('/super-admin')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/societybooks_logo.svg" alt="SocietyBooks" className="h-16 mx-auto" />
          <p className="text-xs text-gray-400 mt-2 tracking-wider">COOPERATIVE ACCOUNTS, MADE CLEAR</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-500">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-md">{error}</div>
          )}

          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
