import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../data/auth'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="min-h-full bg-navy" aria-busy="true" />
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />
  return <Outlet />
}
