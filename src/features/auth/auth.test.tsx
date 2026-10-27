import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider, useAuth } from '../../data/auth'
import { StoreContext } from '../../data/store'
import { createLocalStore } from '../../data/local-store'
import { createLocalAuth } from '../../data/auth'
import { RegisterPage } from './RegisterPage'
import { LoginPage } from './LoginPage'

function WhoAmI() {
  const { user } = useAuth()
  return <div data-testid="whoami">{user ? user.email : 'nobody'}</div>
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/register', element: <RegisterPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/players', element: <WhoAmI /> },
    ],
    { initialEntries: [path] },
  )
  return render(
    <AuthProvider backend={createLocalAuth()}>
      <StoreContext.Provider value={createLocalStore()}>
        <RouterProvider router={router} />
      </StoreContext.Provider>
    </AuthProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('registration and sign-in (local backend)', () => {
  it('registers a parent and lands on /players signed in', async () => {
    const user = userEvent.setup()
    renderAt('/register')
    await user.type(screen.getByLabelText(/email/i), 'mom@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'secret-pass-1')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByTestId('whoami')).toHaveTextContent('mom@example.com'))
  })

  it('rejects a wrong password with a friendly message', async () => {
    const user = userEvent.setup()
    const auth = createLocalAuth()
    await auth.signUp('mom@example.com', 'right-pass')
    await auth.signOut()
    renderAt('/login')
    await user.type(screen.getByLabelText(/email/i), 'mom@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText("That email or password doesn't match.")).toBeInTheDocument()
  })
})
