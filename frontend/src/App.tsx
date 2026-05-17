import { useState } from 'react'
import OrderList from './components/OrderList'
import TransactionMonitor from './components/TransactionMonitor'
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
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'

  const addNotification = (type: Notification['type'], title: string, message: string) => {
    const id = Date.now().toString()
    setNotifications((previous) => [...previous, { id, type, title, message }])
    window.setTimeout(() => {
      setNotifications((previous) => previous.filter((item) => item.id !== id))
    }, 5000)
  }

  const bumpRefresh = () => {
    window.setTimeout(() => setRefreshTrigger((previous) => previous + 1), 800)
  }

  const handleTestEdi850 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const controlNumber = String(Date.now() % 1000000000).padStart(9, '0')
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const testPayload =
      `ISA*00*          *00*          *ZZ*SERMACROPS     *ZZ*PHILHARVEST   *${today.slice(2)}*1200*^*00501*${controlNumber}*0*P*:~` +
      `GS*PO*SERMACROPS*PHILHARVEST*${today}*1200*1*X*005010~` +
      'ST*850*0001~' +
      `BEG*00*SA*PO-TEST-${controlNumber}**${today}~` +
      'PO1*1*50*KG*125.50**VP*TOMATO-RIP-01~' +
      'PID*F****Tomatoes~' +
      'CTT*1~' +
      'SE*5*0001~' +
      'GE*1*1~' +
      `IEA*1*${controlNumber}~`

    try {
      const response = await fetch(`${apiUrl}/api/edi/850/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/EDI-X12',
          Authorization: `Bearer ${token}`,
        },
        body: testPayload,
      })

      const payload = await response.json()
      if (response.ok || response.status === 202) {
        addNotification(
          'success',
          'EDI 850 accepted',
          `Transaction ${payload.transaction_id ?? 'N/A'} stored with control ${payload.control_number ?? controlNumber}.`,
        )
        setActiveTestForm(null)
        bumpRefresh()
      } else {
        addNotification('error', '850 submission failed', payload.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      addNotification(
        'error',
        '850 submission failed',
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestEdi855 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const payload = {
      po_number: 'PO-TEST-001',
      po_date: '2026-05-17',
      manufacturer_id: 'SERMACROPS',
      acknowledgment_code: 'AA',
      line_acknowledgments: [
        {
          line_number: '1',
          acknowledgment_code: 'AA',
          accepted_quantity: 50,
          quantity_uom: 'KG',
          estimated_delivery_date: '2026-05-20',
        },
      ],
    }

    try {
      const response = await fetch(`${apiUrl}/api/edi/855/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responsePayload = await response.json()
      if (response.ok || response.status === 202) {
        addNotification(
          'success',
          'EDI 855 generated',
          `Transaction ${responsePayload.transaction_id ?? 'N/A'} queued for SERMACROPS.`,
        )
        setActiveTestForm(null)
        bumpRefresh()
      } else {
        addNotification(
          'error',
          '855 submission failed',
          responsePayload.error || `HTTP ${response.status}`,
        )
      }
    } catch (error) {
      addNotification(
        'error',
        '855 submission failed',
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PhilHarvest EDI dashboard</p>
          <h1>Inbound and outbound EDI traffic in one place.</h1>
          <p className="hero-copy">
            Use this page to submit test documents, inspect recent 850 and 990 inbound payloads,
            and verify the outbound documents we send to SERMACROPS and logistics partners.
          </p>
        </div>
        <div className="hero-meta">
          <span>API: {apiUrl}</span>
          <span>Auth token loaded: {token ? 'yes' : 'no'}</span>
        </div>
      </header>

      <nav className="toolbar">
        <button className="nav-btn" onClick={() => setActiveTestForm(activeTestForm === '850' ? null : '850')}>
          {activeTestForm === '850' ? 'Hide test 850' : 'Send test 850'}
        </button>
        <button className="nav-btn" onClick={() => setActiveTestForm(activeTestForm === '855' ? null : '855')}>
          {activeTestForm === '855' ? 'Hide test 855' : 'Send test 855'}
        </button>
      </nav>

      <section className="notification-stack">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification notification-${notification.type}`}>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
        ))}
      </section>

      {activeTestForm === '850' ? (
        <section className="action-card">
          <h2>Send a test inbound 850</h2>
          <p>This posts raw X12 into our inbound `850/receive` endpoint.</p>
          <form onSubmit={handleTestEdi850}>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Submit test 850'}
            </button>
          </form>
        </section>
      ) : null}

      {activeTestForm === '855' ? (
        <section className="action-card">
          <h2>Send a test outbound 855</h2>
          <p>This asks the backend to generate and transmit an 855 to SERMACROPS.</p>
          <form onSubmit={handleTestEdi855}>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Submit test 855'}
            </button>
          </form>
        </section>
      ) : null}

      <main className="dashboard-grid">
        <ErrorBoundary>
          <OrderList refreshTrigger={refreshTrigger} />
        </ErrorBoundary>
        <ErrorBoundary>
          <TransactionMonitor refreshTrigger={refreshTrigger} />
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
