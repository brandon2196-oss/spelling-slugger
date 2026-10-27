import { createBrowserRouter } from 'react-router'
import { WelcomePage } from './features/welcome/WelcomePage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPage } from './features/auth/ForgotPage'
import { ResetPage } from './features/auth/ResetPage'
import { RequireAuth } from './features/auth/RequireAuth'

export const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot', element: <ForgotPage /> },
  { path: '/reset', element: <ResetPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/players', element: <div className="p-8">Players (coming in the next task)</div> },
    ],
  },
])
