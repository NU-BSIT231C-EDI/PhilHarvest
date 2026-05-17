import { useState } from 'react'
import OrderList from './components/OrderList'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

type TestFormType = '850' | '855' | null

function App() {
  const [activeTestForm, setActiveTestForm] = useState<TestFormType>(null)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const addNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const handleTestEdi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Generate unique control number (ISA13) using timestamp
    const controlNumber = String(Date.now() % 1000000000).padStart(9, '0')
    
    // X12 850 with proper ~ segment terminators (no newlines)
    const testPayload = `ISA*00*          *00*          *ZZ*TESTPARTNER  *ZZ*PHILHARVEST    *240501*1200*U*00501*${controlNumber}*0*P*:~GS*PO*TESTPARTNER*PHILHARVEST*20240501*1200*1*X*005010~ST*850*0001~BEG*00*SA*PO-TEST-001*20240501~PO1*1*50*KG*125.50**VC*TOMATO-RIP-01~PID*F****Tomatoes~Ripe~Grade A~CTT*1*50~SE*7*0001~GE*1*1~IEA*1*${controlNumber}~`

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'
      const response = await fetch(`${apiUrl}/api/edi/850/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/edi-x12',
          'Authorization': `Bearer ${token}`,
        },
        body: testPayload,
      })

      // Try to parse JSON response
      let data: any = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        const errorMsg = `Invalid response format from server`
        addNotification('error', 'Parse Error', errorMsg)
        setIsSubmitting(false)
        return
      }
      
      if (response.ok || response.status === 202) {
        addNotification('success', 'EDI 850 Accepted!', `Transaction ID: ${data.transaction_id || 'N/A'} | Control: ${data.control_number || 'N/A'}`)
        // Refresh orders after successful submission
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000)
        setActiveTestForm(null)
      } else {
        addNotification('error', 'Submission Failed', data.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('EDI 850 Error:', error)
      addNotification('error', 'Connection Error', errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestEdi855 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // EDI 855 is OUTBOUND (we send acknowledgments TO manufacturers)
    // Use JSON format for the /send endpoint
    const testPayload = {
      po_number: 'PO-TEST-001',
      po_date: '2024-05-01',
      manufacturer_id: 'TESTPARTNER',
      acknowledgment_code: 'AA',  // AA = Accepted
      line_acknowledgments: [
        {
          line_number: '1',
          acknowledgment_code: 'AA',
          accepted_quantity: 50,
          quantity_uom: 'KG',
          estimated_delivery_date: '2024-05-15'
        }
      ]
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'
      const response = await fetch(`${apiUrl}/api/edi/855/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(testPayload),
      })

      // Try to parse JSON response
      let data: any = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        const errorMsg = `Invalid response format from server`
        addNotification('error', 'Parse Error', errorMsg)
        setIsSubmitting(false)
        return
      }
      
      if (response.ok || response.status === 202) {
        addNotification('success', 'EDI 855 Accepted!', `Transaction ID: ${data.transaction_id || 'N/A'} | Control: ${data.control_number || 'N/A'}`)
        // Refresh orders after successful submission
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000)
        setActiveTestForm(null)
      } else {
        addNotification('error', 'Submission Failed', data.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('EDI 855 Error:', error)
      addNotification('error', 'Connection Error', errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌾 PhilHarvest EDI Dashboard</h1>
        <p className="subtitle">B2B Supply Chain Automation</p>
      </header>

      <nav className="app-nav">
        <button 
          className="nav-btn"
          onClick={() => setActiveTestForm(activeTestForm === '850' ? null : '850')}
        >
          {activeTestForm === '850' ? '✕ Hide' : '+ Test EDI'} 850
        </button>
        <button 
          className="nav-btn"
          onClick={() => setActiveTestForm(activeTestForm === '855' ? null : '855')}
        >
          {activeTestForm === '855' ? '✕ Hide' : '+ Test EDI'} 855
        </button>
      </nav>

      {/* Notification Container */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '400px'
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.3s ease',
              backgroundColor: notification.type === 'success' ? '#d1fae5' : 
                               notification.type === 'error' ? '#fee2e2' : '#dbeafe',
              borderLeft: `4px solid ${
                notification.type === 'success' ? '#10b981' :
                notification.type === 'error' ? '#ef4444' : '#3b82f6'
              }`,
              color: notification.type === 'success' ? '#065f46' :
                     notification.type === 'error' ? '#7f1d1d' : '#1e40af'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {notification.type === 'success' && '✓ '}
              {notification.type === 'error' && '✕ '}
              {notification.type === 'info' && 'ℹ '}
              {notification.title}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {notification.message}
            </div>
          </div>
        ))}
      </div>

      {activeTestForm === '850' && (
        <div className="test-form-container">
          <form onSubmit={handleTestEdi} className="test-form">
            <div>
              <h3>Test EDI 850 Submission</h3>
              <p className="form-help">
                Click "Send Test EDI" to submit a sample purchase order to the backend.
                This will create a test transaction in the system.
              </p>
            </div>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? '⏳ Sending...' : '📤 Send Test EDI 850'}
            </button>
          </form>
        </div>
      )}

      {activeTestForm === '855' && (
        <div className="test-form-container">
          <form onSubmit={handleTestEdi855} className="test-form">
            <div>
              <h3>Test EDI 855 Submission</h3>
              <p className="form-help">
                Click "Send Test EDI" to submit a sample ship notice to the backend.
                This will create a test shipment notification in the system.
              </p>
            </div>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? '⏳ Sending...' : '📤 Send Test EDI 855'}
            </button>
          </form>
        </div>
      )}

      <main className="app-main">
        <ErrorBoundary>
          <OrderList refreshTrigger={refreshTrigger} />
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <p>PhilHarvest EDI System v1.0 | Backend: {import.meta.env.VITE_API_URL}</p>
      </footer>
    </div>
  )
}

export default App
