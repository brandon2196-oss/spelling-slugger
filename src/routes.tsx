import { createBrowserRouter } from 'react-router'
import { WelcomePage } from './features/welcome/WelcomePage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPage } from './features/auth/ForgotPage'
import { ResetPage } from './features/auth/ResetPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { PlayersPage } from './features/players/PlayersPage'
import { PlayerEditorPage } from './features/players/PlayerEditorPage'
import { ParentGate } from './features/parent/ParentGate'
import { ParentIndex, ParentLayout } from './features/parent/ParentLayout'
import { ListsPage } from './features/parent/ListsPage'
import { ListEditorPage } from './features/parent/ListEditorPage'

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
      {
        path: '/parent',
        element: <ParentGate />,
        children: [
          { index: true, element: <ParentIndex /> },
          {
            path: 'players/:playerId',
            element: <ParentLayout />,
            children: [
              { path: 'lists', element: <ListsPage /> },
              { path: 'lists/new', element: <ListEditorPage /> },
              { path: 'lists/:listId', element: <ListEditorPage /> },
            ],
          },
        ],
      },
    ],
  },
])
