import { createBrowserRouter } from 'react-router'
import { WelcomePage } from './features/welcome/WelcomePage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPage } from './features/auth/ForgotPage'
import { ResetPage } from './features/auth/ResetPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { PlayersPage } from './features/players/PlayersPage'
import { PlayerEditorPage } from './features/players/PlayerEditorPage'

export const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot', element: <ForgotPage /> },
  { path: '/reset', element: <ResetPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/players', element: <PlayersPage /> },
      { path: '/players/new', element: <PlayerEditorPage /> },
      { path: '/players/:id/edit', element: <PlayerEditorPage /> },
    ],
  },
])
