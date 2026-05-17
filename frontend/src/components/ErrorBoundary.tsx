import { ReactNode, Component, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem',
          backgroundColor: '#fee2e2',
          border: '2px solid #fecaca',
          borderRadius: '0.75rem',
          color: '#7f1d1d',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#991b1b', fontSize: '1.4rem' }}>
            ⚠️ Something went wrong
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: '#7f1d1d', lineHeight: 1.6 }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <details style={{ 
            whiteSpace: 'pre-wrap', 
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#fecaca',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            color: '#7f1d1d'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            {this.state.error?.toString()}
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'
              ;(e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#ef4444'
              ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
            }}
          >
            ↻ Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
