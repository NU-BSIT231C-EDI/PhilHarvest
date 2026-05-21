import { useEffect, useState } from 'react'
import type { WorkflowPrefill } from '../App'

type Direction = 'inbound' | 'outbound'
type AckCode = 'AA' | 'RE' | 'IA'

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function txData(tx: TransactionRecord): Record<string, unknown> {
  return (tx.parsed_data as Record<string, unknown> | null) ?? {}
}

function formatX12(raw: string | null): string {
  if (!raw) return 'No payload stored.'
  return raw
    .split('~')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('~\n') + '~'
}

// ── 855 Acknowledgment Panel ─────────────────────────────────────────────────

interface LineAckState {
  lineNumber: string
  partNumber: string
  orderedQty: number
  qtyUom: string
  ackCode: AckCode
  acceptedQty: number
  rejectedQty: number
  rejectionReason: string
  estimatedDeliveryDate: string
}

interface AckPanelProps {
  transaction: TransactionRecord
  onConfirm: (body: Record<string, unknown>) => void
  onCancel: () => void
}

function Edi855AckPanel({ transaction, onConfirm, onCancel }: AckPanelProps) {
  const d = txData(transaction)
  const rawLines = (d.line_items as Array<Record<string, unknown>> | undefined) ?? []

  const [lines, setLines] = useState<LineAckState[]>(
    rawLines.map((li) => ({
      lineNumber: String(li.line_number ?? '1'),
      partNumber: String(li.part_number ?? li.product_id_qualifier ?? '—'),
      orderedQty: Number(li.quantity ?? 0),
      qtyUom: String(li.quantity_uom ?? 'EA'),
      ackCode: 'AA',
      acceptedQty: Number(li.quantity ?? 0),
      rejectedQty: 0,
      rejectionReason: '',
      estimatedDeliveryDate: '',
    }))
  )

  const headerAckCode: AckCode =
    lines.every((l) => l.ackCode === 'AA') ? 'AA'
    : lines.every((l) => l.ackCode === 'RE') ? 'RE'
    : 'IA'

  const updateLine = (index: number, patch: Partial<LineAckState>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        const next = { ...l, ...patch }
        if (patch.ackCode === 'AA') {
          next.acceptedQty = l.orderedQty
          next.rejectedQty = 0
          next.rejectionReason = ''
        } else if (patch.ackCode === 'RE') {
          next.acceptedQty = 0
          next.rejectedQty = l.orderedQty
        }
        return next
      })
    )
  }

  const applyAll = (code: AckCode) => {
    setLines((prev) =>
      prev.map((l) => {
        if (code === 'AA') return { ...l, ackCode: 'AA', acceptedQty: l.orderedQty, rejectedQty: 0, rejectionReason: '' }
        if (code === 'RE') return { ...l, ackCode: 'RE', acceptedQty: 0, rejectedQty: l.orderedQty }
        return { ...l, ackCode: 'IA' }
      })
    )
  }

  const handleConfirm = () => {
    const body: Record<string, unknown> = {
      po_number: d.po_number ?? '',
      po_date: d.po_date ?? new Date().toISOString().slice(0, 10),
      manufacturer_id: d.manufacturer_id ?? transaction.partner_id ?? '',
      acknowledgment_code: headerAckCode,
      line_acknowledgments: lines.map((l) => ({
        line_number: l.lineNumber,
        acknowledgment_code: l.ackCode,
        accepted_quantity: l.acceptedQty,
        quantity_uom: l.qtyUom,
        ...(l.rejectedQty > 0 ? { rejected_quantity: l.rejectedQty } : {}),
        ...(l.rejectionReason ? { rejection_reason: l.rejectionReason } : {}),
        ...(l.estimatedDeliveryDate ? { estimated_delivery_date: l.estimatedDeliveryDate } : {}),
      })),
    }
    onConfirm(body)
  }

  const ackLabel: Record<AckCode, string> = { AA: 'Accept', RE: 'Reject', IA: 'Partial' }
  const ackColor: Record<AckCode, string> = { AA: 'var(--green,#2e7d32)', RE: '#c62828', IA: '#e65100' }

  return (
    <div className="ack-panel">
      <div className="ack-panel-header">
        <span>
          Build 855 for <strong>PO {String(d.po_number ?? '')}</strong>
        </span>
        <span className="ack-code-badge" style={{ background: ackColor[headerAckCode] }}>
          Overall: {headerAckCode} – {ackLabel[headerAckCode]}
        </span>
        <button className="ack-close-btn" onClick={onCancel} title="Cancel">✕</button>
      </div>

      <div className="ack-bulk-row">
        <span className="ack-bulk-label">Apply all lines:</span>
        {(['AA', 'RE', 'IA'] as AckCode[]).map((code) => (
          <button
            key={code}
            className="ack-bulk-btn"
            style={{ borderColor: ackColor[code], color: ackColor[code] }}
            onClick={() => applyAll(code)}
          >
            {code} – {ackLabel[code]}
          </button>
        ))}
      </div>

      {lines.length === 0 ? (
        <p className="ack-no-lines">No line items found in this 850's parsed data.</p>
      ) : (
        <div className="ack-table-wrap">
          <table className="ack-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Part</th>
                <th>Ordered</th>
                <th>Response</th>
                <th>Accepted qty</th>
                <th>Rejected qty</th>
                <th>Reason</th>
                <th>Est. delivery</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.lineNumber} className={`ack-row ack-row-${line.ackCode.toLowerCase()}`}>
                  <td>{line.lineNumber}</td>
                  <td>{line.partNumber}</td>
                  <td className="ack-td-num">{line.orderedQty} {line.qtyUom}</td>
                  <td>
                    <select
                      className="ack-select"
                      value={line.ackCode}
                      onChange={(e) => updateLine(i, { ackCode: e.target.value as AckCode })}
                    >
                      <option value="AA">AA – Accept</option>
                      <option value="RE">RE – Reject</option>
                      <option value="IA">IA – Partial</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="ack-qty-input"
                      type="number"
                      min={0}
                      max={line.orderedQty}
                      value={line.acceptedQty}
                      disabled={line.ackCode === 'RE'}
                      onChange={(e) => updateLine(i, { acceptedQty: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    {line.ackCode !== 'AA' ? (
                      <input
                        className="ack-qty-input"
                        type="number"
                        min={0}
                        value={line.rejectedQty || ''}
                        onChange={(e) => updateLine(i, { rejectedQty: Number(e.target.value) })}
                      />
                    ) : '—'}
                  </td>
                  <td>
                    {line.ackCode !== 'AA' ? (
                      <input
                        className="ack-text-input"
                        type="text"
                        value={line.rejectionReason}
                        placeholder="required for RE/IA"
                        onChange={(e) => updateLine(i, { rejectionReason: e.target.value })}
                      />
                    ) : '—'}
                  </td>
                  <td>
                    <input
                      className="ack-date-input"
                      type="date"
                      value={line.estimatedDeliveryDate}
                      onChange={(e) => updateLine(i, { estimatedDeliveryDate: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ack-panel-footer">
        <button className="workflow-btn ack-confirm-btn" onClick={handleConfirm}>
          Pre-fill builder with this 855 →
        </button>
        <button className="ack-cancel-link" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Other prefill builders ───────────────────────────────────────────────────

function build204Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = txData(tx)
  const poNumber = (d.po_number as string | undefined) ?? ''
  const today = new Date().toISOString().slice(0, 10)

  // ship_to_address from the 850 = SERMACROPS (buyer/consignee — where goods are delivered).
  // Normalize null → '' so the 204 builder shows empty-but-editable fields, not literal nulls.
  const rawShipTo = d.ship_to_address as Record<string, string | null> | null | undefined
  const shipToAddress = {
    company_name: rawShipTo?.company_name ?? '',
    street:       rawShipTo?.street       ?? '',
    city:         rawShipTo?.city         ?? '',
    state:        rawShipTo?.state        ?? '',
    postal_code:  rawShipTo?.postal_code  ?? '',
    country:      rawShipTo?.country      ?? '',
  }

  return {
    load_tender_id:       `LOAD-${poNumber}`,
    // PhilHarvest is the shipper (seller). Address will come from our own partner profile once added.
    shipper_company_name: 'PhilHarvest Inc.',
    shipper_address:      { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    carrier_code:         'YOUR_CARRIER_CODE',
    ship_to_address:      shipToAddress,
    shipments: [{ shipment_number: `SHIP-${poNumber}`, weight: 0, weight_uom: 'LB', commodity: 'Agricultural Products' }],
    pickup_date:   (d.shipping_date as string | null | undefined) ?? today,
    delivery_date: (d.delivery_date as string | null | undefined) ?? new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
  }
}

function build856Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = txData(tx)
  const loadTenderId = (d.load_tender_id as string | undefined) ?? ''
  const poNumber = loadTenderId.replace(/^LOAD-/, '') || loadTenderId
  const today = new Date().toISOString().slice(0, 10)

  // In the 990: N1*SH = SERMACROPS (buyer/destination), N1*CN = PhilHarvest (our address).
  // For the 856: ship_from = PhilHarvest (cn_address), ship_to = SERMACROPS (sh_address).
  type Addr = Record<string, string>
  const shAddr = (d.sh_address ?? {}) as Addr
  const cnAddr = (d.cn_address ?? {}) as Addr

  const normalize = (a: Addr, fallbackCountry: string) => ({
    street:       a.street        ?? '',
    city:         a.city          ?? '',
    state:        a.state         ?? '',
    postal_code:  a.postal_code   ?? '',
    country:      a.country       || fallbackCountry,
  })

  return {
    asn_number:       `ASN-${today}-001`,
    po_number:        poNumber,
    po_date:          today,
    manufacturer_id:  (d.carrier_id as string | undefined) ?? tx.partner_id ?? '',
    ship_date:        today,
    ship_from_address: normalize(cnAddr, 'PH'),
    ship_to_address:   normalize(shAddr, ''),
    boxes: [{ box_number: '1', weight: 0, weight_uom: 'LB', line_items: [] }],
  }
}

function build856From850Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = txData(tx)
  const today = new Date().toISOString().slice(0, 10)
  return {
    asn_number: `ASN-${today}-001`,
    po_number: (d.po_number as string | undefined) ?? '',
    po_date: (d.po_date as string | undefined) ?? today,
    manufacturer_id: tx.partner_id ?? '',
    ship_date: today,
    ship_from_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    ship_to_address: { street: '', city: '', state: '', postal_code: '', country: '' },
    boxes: [{ box_number: '1', weight: 0, weight_uom: 'LB', line_items: [] }],
  }
}

function build810From850Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = txData(tx)
  const today = new Date().toISOString().slice(0, 10)
  const rawLines = (d.line_items as Array<Record<string, unknown>> | undefined) ?? []
  const lineItems = rawLines.length > 0
    ? rawLines.map((li, i) => ({
        line_number: String(li.line_number ?? (i + 1)),
        po_line_number: String(li.line_number ?? (i + 1)),
        part_number: String(li.part_number ?? li.product_id_qualifier ?? ''),
        part_description: String(li.description ?? li.part_number ?? ''),
        invoiced_quantity: Number(li.quantity ?? 0),
        quantity_uom: String(li.quantity_uom ?? 'EA'),
        unit_price: 0,
      }))
    : [{ line_number: '1', po_line_number: '1', part_number: '', part_description: '', invoiced_quantity: 0, quantity_uom: 'EA', unit_price: 0 }]
  return {
    invoice_number: `INV-${today.replace(/-/g, '')}-001`,
    invoice_date: today,
    po_number: (d.po_number as string | undefined) ?? '',
    po_date: (d.po_date as string | undefined) ?? today,
    manufacturer_id: tx.partner_id ?? '',
    bill_to_name: 'PhilHarvest Inc.',
    bill_to_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    ship_from_address: { street: '', city: '', state: '', postal_code: '', country: 'PH' },
    total_amount: 0,
    line_items: lineItems,
  }
}

function build810Prefill(tx: TransactionRecord): Record<string, unknown> {
  const d = txData(tx)
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
    line_items:
      lineItems.length > 0
        ? lineItems
        : [{ line_number: '1', po_line_number: '1', part_number: '', part_description: '', invoiced_quantity: 0, quantity_uom: 'EA', unit_price: 0 }],
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TransactionMonitor({ refreshTrigger = 0, onWorkflowAction }: TransactionMonitorProps) {
  const PAGE_SIZE = 5

  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [ackingId, setAckingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [clearing, setClearing] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    void fetchTransactions()
  }, [refreshTrigger])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => void fetchTransactions(), 3000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'
      const response = await fetch(`${apiUrl}/api/edi/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setTransactions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(`Failed to fetch transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAckConfirm = (tx: TransactionRecord, body: Record<string, unknown>) => {
    onWorkflowAction?.({ ediType: '855', body, sourceDescription: `850 #${tx.id}` })
    setAckingId(null)
  }

  const handleDeleteTransaction = async (id: number) => {
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'
      await fetch(`${apiUrl}/api/edi/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearHistory = async (keep: number) => {
    if (!window.confirm(`Delete all but the ${keep} most recent transactions?`)) return
    setClearing(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'
      await fetch(`${apiUrl}/api/edi/transactions?keep=${keep}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setPage(1)
      await fetchTransactions()
    } finally {
      setClearing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedTransactions = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <section className="monitor-panel">
      <div className="monitor-header">
        <div>
          <h2>EDI Traffic</h2>
          <p>Recent inbound 850/990 and outbound 855/856/810/204 documents.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button onClick={() => void fetchTransactions()} className="refresh-btn">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => void handleClearHistory(3)}
            className="refresh-btn"
            disabled={clearing}
            style={{ color: 'var(--red, #c0392b)' }}
          >
            {clearing ? 'Clearing...' : 'Clear history'}
          </button>
        </div>
      </div>

      {loading ? <div className="loading">Loading transactions...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {!loading && transactions.length === 0 ? <p className="no-data">No transactions yet.</p> : null}

      {!loading && transactions.length > 0 ? (
        <div className="monitor-list">
          {pagedTransactions.map((transaction) => (
            <article key={transaction.id} className="monitor-card">
              <div className="monitor-card-top">
                <span className={`direction-pill direction-${transaction.direction}`}>{transaction.direction}</span>
                <span className="type-pill">{transaction.transaction_type}</span>
                <span className="status-pill">{transaction.status}</span>
                {transaction.direction === 'inbound' && (
                  <span style={{ marginLeft: 'auto' }}>
                    {confirmDeleteId === transaction.id ? (
                      <>
                        <span style={{ fontSize: '0.8rem', marginRight: 6 }}>Delete?</span>
                        <button
                          className="workflow-btn"
                          style={{ color: '#c62828', borderColor: '#c62828', padding: '2px 8px', fontSize: '0.78rem' }}
                          disabled={deletingId === transaction.id}
                          onClick={() => void handleDeleteTransaction(transaction.id)}
                        >
                          {deletingId === transaction.id ? '…' : 'Yes'}
                        </button>
                        <button
                          className="ack-cancel-link"
                          style={{ marginLeft: 4 }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="workflow-btn"
                        style={{ color: '#888', borderColor: '#888', padding: '2px 8px', fontSize: '0.78rem' }}
                        onClick={() => setConfirmDeleteId(transaction.id)}
                      >
                        Delete
                      </button>
                    )}
                  </span>
                )}
              </div>
              <p className="monitor-meta">
                Partner: <strong>{transaction.partner_id}</strong> | Control: <code>{transaction.control_number}</code>
              </p>
              <p className="monitor-meta">
                Received/Sent: {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'}
              </p>
              <details className="monitor-details">
                <summary>Payload preview</summary>
                <pre>{formatX12(transaction.payload_preview)}</pre>
              </details>
              <details className="monitor-details">
                <summary>Parsed data</summary>
                <pre>{JSON.stringify(transaction.parsed_data ?? {}, null, 2)}</pre>
              </details>

              {/* 855 ACK panel — inline when open */}
              {ackingId === transaction.id && (
                <Edi855AckPanel
                  transaction={transaction}
                  onConfirm={(body) => handleAckConfirm(transaction, body)}
                  onCancel={() => setAckingId(null)}
                />
              )}

              {/* Workflow action buttons */}
              {onWorkflowAction && transaction.status !== 'FAILED' && ackingId !== transaction.id && (
                <div className="workflow-actions">
                  {transaction.transaction_type === '850' && transaction.direction === 'inbound' && (
                    <>
                      <button className="workflow-btn" onClick={() => setAckingId(transaction.id)}>
                        → Send 855 Ack
                      </button>
                      <button
                        className="workflow-btn"
                        onClick={() =>
                          onWorkflowAction({ ediType: '204', body: build204Prefill(transaction), sourceDescription: `850 #${transaction.id}` })
                        }
                      >
                        → Send 204 Load Tender
                      </button>
                      <button
                        className="workflow-btn"
                        onClick={() =>
                          onWorkflowAction({ ediType: '856', body: build856From850Prefill(transaction), sourceDescription: `850 #${transaction.id}` })
                        }
                      >
                        → Send 856 ASN
                      </button>
                      <button
                        className="workflow-btn"
                        onClick={() =>
                          onWorkflowAction({ ediType: '810', body: build810From850Prefill(transaction), sourceDescription: `850 #${transaction.id}` })
                        }
                      >
                        → Send 810 Invoice
                      </button>
                    </>
                  )}
                  {transaction.transaction_type === '990' && transaction.direction === 'inbound' && (
                    <button
                      className="workflow-btn"
                      onClick={() =>
                        onWorkflowAction({ ediType: '856', body: build856Prefill(transaction), sourceDescription: `990 #${transaction.id}` })
                      }
                    >
                      → Send 856 ASN
                    </button>
                  )}
                  {transaction.transaction_type === '856' && transaction.direction === 'outbound' && (
                    <button
                      className="workflow-btn"
                      onClick={() =>
                        onWorkflowAction({ ediType: '810', body: build810Prefill(transaction), sourceDescription: `856 #${transaction.id}` })
                      }
                    >
                      → Send 810 Invoice
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="page-info">
                Page {page} of {totalPages} &nbsp;·&nbsp; {transactions.length} total
              </span>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
