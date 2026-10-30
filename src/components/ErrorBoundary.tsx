import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CrashScreen } from './CrashScreen'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rain delay', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <CrashScreen onReload={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
