import { useEffect, useState } from 'react'

type Direction = 'inbound' | 'outbound'

interface TransactionRecord {
  id: number
  transaction_type: string
  control_number: string
  partner_id: string
  status: string
  direction: Direction
  payload_preview: string | null
  parsed_data: unknown
  created_at: string | null
}

interface TransactionMonitorProps {
  refreshTrigger?: number
}

export default function TransactionMonitor({ refreshTrigger = 0 }: TransactionMonitorProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchTransactions()
  }, [refreshTrigger])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'

      const response = await fetch(`${apiUrl}/api/edi/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setTransactions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to fetch transactions: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="monitor-panel">
      <div className="monitor-header">
        <div>
          <h2>EDI Traffic</h2>
          <p>Recent inbound 850/990 and outbound 855/856/810/204 documents.</p>
        </div>
        <button onClick={() => void fetchTransactions()} className="refresh-btn">
          Refresh traffic
        </button>
      </div>

      {loading ? <div className="loading">Loading transactions...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!loading && transactions.length === 0 ? (
        <p className="no-data">No transactions yet.</p>
      ) : null}

      {!loading && transactions.length > 0 ? (
        <div className="monitor-list">
          {transactions.map((transaction) => (
            <article key={transaction.id} className="monitor-card">
              <div className="monitor-card-top">
                <span className={`direction-pill direction-${transaction.direction}`}>
                  {transaction.direction}
                </span>
                <span className="type-pill">{transaction.transaction_type}</span>
                <span className="status-pill">{transaction.status}</span>
              </div>
              <p className="monitor-meta">
                Partner: <strong>{transaction.partner_id}</strong> | Control:{' '}
                <code>{transaction.control_number}</code>
              </p>
              <p className="monitor-meta">
                Received/Sent:{' '}
                {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'}
              </p>
              <details className="monitor-details">
                <summary>Payload preview</summary>
                <pre>{transaction.payload_preview || 'No payload stored.'}</pre>
              </details>
              <details className="monitor-details">
                <summary>Parsed data</summary>
                <pre>{JSON.stringify(transaction.parsed_data ?? {}, null, 2)}</pre>
              </details>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
