import { useState } from 'react'
import TransactionMonitor from './components/TransactionMonitor'
import OutboundRequestBuilder from './components/OutboundRequestBuilder'
import TradingPartnerManager from './components/TradingPartnerManager'
import type { TradingPartner } from './components/TradingPartnerManager'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

export interface WorkflowPrefill {
  ediType: '855' | '810' | '856' | '204'
  body: Record<string, unknown>
  sourceDescription: string
  timestamp: number
}

type TestFormType = '850' | '855' | '990' | null

function App() {
  const [activeTestForm, setActiveTestForm] = useState<TestFormType>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workflowPrefill, setWorkflowPrefill] = useState<WorkflowPrefill | null>(null)
  const [partners, setPartners] = useState<TradingPartner[]>([])
  const [showPartnerManager, setShowPartnerManager] = useState(false)

  const handleWorkflowAction = (prefill: Omit<WorkflowPrefill, 'timestamp'>) => {
    setWorkflowPrefill({ ...prefill, timestamp: Date.now() })
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? ''
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

    const controlNumber = String(Date.now() % 10000000000).padStart(10, '0')
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const timeHHMM = new Date().toISOString().slice(11, 16).replace(/:/g, '')
    
    // X12 format matching production successful test
    const testPayload =
      `ISA*00*          *00*          *ZZ*GLOBAL_TRADE   *ZZ*PHILHARVEST    *${today}*${timeHHMM}*U*00501*${controlNumber}*0*T*:~` +
      `GS*PO*GLOBAL_TRADE*PHILHARVEST*${today}*${timeHHMM}*1*X*005010~` +
      'ST*850*0001~' +
      `BEG*00*SA*PO-TEST-${controlNumber}*${today}~` +
      'PO1*1*50*EA*25.00**VP*TEST-ITEM~' +
      'CTT*1~' +
      'SE*6*0001~' +
      'GE*1*1~' +
      `IEA*1*${controlNumber}~`

    try {
      const response = await fetch(`${apiUrl}/api/edi/inbound/x12`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x12',
          Authorization: `Bearer ${token}`,
        },
        body: testPayload,
      })

      const payload = await response.json()
      if (response.ok || response.status === 202) {
        addNotification(
          'success',
          'EDI 850 accepted',
          `Transaction ${payload.transaction_id ?? 'N/A'} queued — check the monitor below to watch it process.`,
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

  const handleTestEdi990 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const controlNumber = String(Date.now() % 10000000000).padStart(10, '0')
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const timeHHMM = new Date().toISOString().slice(11, 16).replace(/:/g, '')

    // X12 990 — Response to Load Tender (AA = Accept)
    // Parser reads: BEG[1]=responseCode, BEG[2]=loadTenderId, N1 CN=carrier
    const testPayload =
      `ISA*00*          *00*          *ZZ*XYZ_CARRIER    *ZZ*PHILHARVEST    *${today}*${timeHHMM}*U*00501*${controlNumber}*0*T*:~` +
      `GS*SR*XYZ_CARRIER*PHILHARVEST*${today}*${timeHHMM}*1*X*005010~` +
      'ST*990*0001~' +
      'BEG*AA*LOAD-TEST-001~' +
      'N1*CN*XYZ Carrier Inc*ZZ*XYZ_CARRIER~' +
      'SE*4*0001~' +
      'GE*1*1~' +
      `IEA*1*${controlNumber}~`

    try {
      const response = await fetch(`${apiUrl}/api/edi/990/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x12',
          Authorization: `Bearer ${token}`,
        },
        body: testPayload,
      })

      const payload = await response.json()
      if (response.ok || response.status === 202) {
        addNotification(
          'success',
          'EDI 990 accepted',
          `Transaction ${payload.transaction_id ?? 'N/A'} queued — response code: ${payload.response_code ?? 'N/A'}, accepted: ${payload.is_accepted ? 'yes' : 'no'}.`,
        )
        setActiveTestForm(null)
        bumpRefresh()
      } else {
        addNotification('error', '990 submission failed', payload.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      addNotification('error', '990 submission failed', error instanceof Error ? error.message : 'Unknown error')
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
        <button className="nav-btn" onClick={() => setActiveTestForm(activeTestForm === '990' ? null : '990')}>
          {activeTestForm === '990' ? 'Hide test 990' : 'Send test 990'}
        </button>
        <button className="nav-btn" onClick={() => setShowPartnerManager((v) => !v)}>
          {showPartnerManager ? 'Hide Partners' : 'Manage Partners'}
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

      {activeTestForm === '990' ? (
        <section className="action-card">
          <h2>Send a test inbound 990</h2>
          <p>Posts a raw X12 990 (Load Tender Response, code AA) to our inbound endpoint to verify end-to-end 990 receipt and parsing.</p>
          <form onSubmit={handleTestEdi990}>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Submit test 990'}
            </button>
          </form>
        </section>
      ) : null}

      <main className="dashboard-grid">
        <ErrorBoundary>
          <OutboundRequestBuilder onNotification={addNotification} workflowPrefill={workflowPrefill} partners={partners} />
        </ErrorBoundary>
        <ErrorBoundary>
          <TransactionMonitor refreshTrigger={refreshTrigger} onWorkflowAction={handleWorkflowAction} partners={partners} />
        </ErrorBoundary>
      </main>

      {showPartnerManager && (
        <ErrorBoundary>
          <TradingPartnerManager
            apiUrl={apiUrl}
            token={token}
            onNotification={addNotification}
            onPartnersChange={setPartners}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}

export default App
