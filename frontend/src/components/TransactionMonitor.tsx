import { useEffect, useState } from 'react'
import type { WorkflowPrefill } from '../App'

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
  onWorkflowAction?: (prefill: Omit<WorkflowPrefill, 'timestamp'>) => void
}

// ── Prefill builders ────────────────────────────────────────────────────────

function data(tx: TransactionRecord): Record<string, unknown> {
  return (tx.parsed_data as Record<string, unknown> | null) ?? {}
}

function build855Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = data(tx)
  const lineItems = (d.line_items as Array<Record<string, unknown>> | undefined) ?? []
  return {
    po_number: d.po_number ?? '',
    po_date: d.po_date ?? new Date().toISOString().slice(0, 10),
    manufacturer_id: d.manufacturer_id ?? tx.partner_id ?? '',
    acknowledgment_code: 'AA',
    line_acknowledgments: lineItems.map((li) => ({
      line_number: li.line_number ?? '1',
      acknowledgment_code: 'AA',
      accepted_quantity: li.quantity ?? 0,
      quantity_uom: li.quantity_uom ?? 'EA',
    })),
  }
}

function build204Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = data(tx)
  const poNumber = (d.po_number as string | undefined) ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const deliveryDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
  return {
    load_tender_id: `LOAD-${poNumber}`,
    shipper_company_name: 'PhilHarvest Inc.',
    shipper_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    carrier_code: 'YOUR_CARRIER_CODE',
    ship_to_address: d.ship_to_address ?? { street: '', city: '', state: '', postal_code: '', country: '' },
    shipments: [{ shipment_number: `SHIP-${poNumber}`, weight: 0, weight_uom: 'LB', commodity: 'Agricultural Products' }],
    pickup_date: today,
    delivery_date: deliveryDate,
  }
}

function build856Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = data(tx)
  const loadTenderId = (d.load_tender_id as string | undefined) ?? ''
  const poNumber = loadTenderId.replace(/^LOAD-/, '') || loadTenderId
  const today = new Date().toISOString().slice(0, 10)
  return {
    asn_number: `ASN-${today}-001`,
    po_number: poNumber,
    po_date: today,
    manufacturer_id: tx.partner_id ?? '',
    ship_date: today,
    ship_from_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    ship_to_address: { street: '', city: '', state: '', postal_code: '', country: '' },
    boxes: [{ box_number: '1', weight: 0, weight_uom: 'LB', line_items: [] }],
  }
}

function build810Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = data(tx)
  const today = new Date().toISOString().slice(0, 10)
  const boxes = (d.boxes as Array<Record<string, unknown>> | undefined) ?? []
  const lineItems = boxes.flatMap((box) => {
    const items = (box.line_items as Array<Record<string, unknown>> | undefined) ?? []
    return items.map((li) => ({
      line_number: li.line_number ?? '1',
      po_line_number: li.line_number ?? '1',
      part_number: li.item_id ?? '',
      part_description: li.item_id ?? '',
      invoiced_quantity: li.shipped_quantity ?? 0,
      quantity_uom: li.quantity_uom ?? 'EA',
      unit_price: 0,
    }))
  })
  return {
    invoice_number: `INV-${today.replace(/-/g, '')}-001`,
    invoice_date: today,
    po_number: d.po_number ?? '',
    po_date: d.po_date ?? today,
    manufacturer_id: d.manufacturer_id ?? tx.partner_id ?? '',
    bill_to_name: 'PhilHarvest Inc.',
    bill_to_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    ship_from_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    total_amount: 0,
    line_items: lineItems.length > 0 ? lineItems : [
      { line_number: '1', po_line_number: '1', part_number: '', part_description: '', invoiced_quantity: 0, quantity_uom: 'EA', unit_price: 0 },
    ],
  }
}

export default function TransactionMonitor({ refreshTrigger = 0, onWorkflowAction }: TransactionMonitorProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    void fetchTransactions()
  }, [refreshTrigger])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      void fetchTransactions()
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={() => void fetchTransactions()} className="refresh-btn">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
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
              {onWorkflowAction && transaction.status !== 'FAILED' && (
                <div className="workflow-actions">
                  {transaction.transaction_type === '850' && transaction.direction === 'inbound' && (
                    <>
                      <button
                        className="workflow-btn"
                        onClick={() => onWorkflowAction({ ediType: '855', body: build855Prefill(transaction), sourceDescription: `850 #${transaction.id}` })}
                      >
                        → Send 855 Ack
                      </button>
                      <button
                        className="workflow-btn"
                        onClick={() => onWorkflowAction({ ediType: '204', body: build204Prefill(transaction), sourceDescription: `850 #${transaction.id}` })}
                      >
                        → Send 204 Load Tender
                      </button>
                    </>
                  )}
                  {transaction.transaction_type === '990' && transaction.direction === 'inbound' && (
                    <button
                      className="workflow-btn"
                      onClick={() => onWorkflowAction({ ediType: '856', body: build856Prefill(transaction), sourceDescription: `990 #${transaction.id}` })}
                    >
                      → Send 856 ASN
                    </button>
                  )}
                  {transaction.transaction_type === '856' && transaction.direction === 'outbound' && (
                    <button
                      className="workflow-btn"
                      onClick={() => onWorkflowAction({ ediType: '810', body: build810Prefill(transaction), sourceDescription: `856 #${transaction.id}` })}
                    >
                      → Send 810 Invoice
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
