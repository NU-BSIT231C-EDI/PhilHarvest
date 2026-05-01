import { useState } from 'react'
import OrderList from './components/OrderList'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

function App() {
  const [showTestForm, setShowTestForm] = useState<boolean>(false)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  const handleTestEdi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Generate unique control number (ISA13) using timestamp
    const controlNumber = String(Date.now() % 1000000000).padStart(9, '0')
    
    const testPayload = `ISA*00*          *00*          *ZZ*TESTPARTNER  *ZZ*PHILHARVEST    *240501*1200*U*00501*${controlNumber}*0*P*>
GS*PO*TESTPARTNER*PHILHARVEST*20240501*1200*1*X*005010
ST*850*0001
BEG*00*SA*PO-TEST-001*20240501
PO1*1*50*KG*125.50**VC*TOMATO-RIP-01
PID*F****Tomatoes~Ripe~Grade A
CTT*1*50
SE*7*0001
GE*1*1
IEA*1*${controlNumber}`

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await fetch(`${apiUrl}/api/edi/850/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/edi-x12',
          'Authorization': 'Bearer partner_test_token_abc123',
        },
        body: testPayload,
      })

      const data = await response.json()
      
      if (response.ok || response.status === 202) {
        alert(`✅ EDI Accepted!\nTransaction ID: ${data.transaction_id}\nControl: ${data.control_number}`)
        // Refresh orders after successful submission
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000)
        setShowTestForm(false)
      } else {
        alert(`❌ Error: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`❌ Failed to submit EDI: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          onClick={() => setShowTestForm(!showTestForm)}
        >
          {showTestForm ? 'Hide' : 'Test EDI'} 850
        </button>
      </nav>

      {showTestForm && (
        <div className="test-form-container">
          <form onSubmit={handleTestEdi} className="test-form">
            <h3>Test EDI 850 Submission</h3>
            <p className="form-help">
              Click "Send Test EDI" to submit a sample purchase order to the backend.
            </p>
            <button type="submit" className="submit-btn">
              Send Test EDI 850
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
