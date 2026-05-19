import { useState } from 'react'

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  headers: Record<string, string>
  body: string
  ediType: '855' | '810' | '856' | '204'
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

interface OutboundRequestBuilderProps {
  onNotification: (type: Notification['type'], title: string, message: string) => void
}

export default function OutboundRequestBuilder({ onNotification }: OutboundRequestBuilderProps) {
  const apiUrl = import.meta.env.VITE_API_URL ?? ''
  const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'

  const generateSampleBody = (type: '855' | '810' | '856' | '204') => {
    const templates: Record<string, object> = {
      '855': {
        po_number: 'PO-2025-8842',
        po_date: '2025-05-15',
        manufacturer_id: 'ACME_CORP',
        acknowledgment_code: 'AA',
        line_acknowledgments: [
          {
            line_number: '1',
            acknowledgment_code: 'AA',
            item_id: 'WIDGET-A',
            accepted_quantity: 50,
            quantity_uom: 'EA',
            unit_price: 12.50,
            ack_status: 'Accepted',
          },
          {
            line_number: '2',
            acknowledgment_code: 'AA',
            item_id: 'BOLT-STEEL',
            accepted_quantity: 200,
            quantity_uom: 'LB',
            unit_price: 4.25,
            ack_status: 'Accepted',
          },
        ],
      },
      '810': {
        po_number: 'PO-2025-8842',
        invoice_number: 'INV-2025-001',
        invoice_date: '2025-05-19',
        manufacturer_id: 'ACME_CORP',
        total_amount: 1475.0,
        line_items: [
          {
            line_number: '1',
            item_id: 'WIDGET-A',
            quantity: 50,
            quantity_uom: 'EA',
            unit_price: 12.50,
            line_amount: 625.0,
          },
          {
            line_number: '2',
            item_id: 'BOLT-STEEL',
            quantity: 200,
            quantity_uom: 'LB',
            unit_price: 4.25,
            line_amount: 850.0,
          },
        ],
      },
      '856': {
        shipment_number: 'SHIP-2025-001',
        po_number: 'PO-2025-8842',
        shipment_date: new Date().toISOString().slice(0, 10),
        destination_code: 'SERMACROPS',
        total_quantity: 250,
        line_items: [
          {
            line_number: '1',
            item_id: 'WIDGET-A',
            shipped_quantity: 50,
            quantity_uom: 'EA',
          },
          {
            line_number: '2',
            item_id: 'BOLT-STEEL',
            shipped_quantity: 200,
            quantity_uom: 'LB',
          },
        ],
      },
      '204': {
        load_number: 'LOAD-001',
        shipment_number: 'SHIP-2025-001',
        total_weight: 250,
        weight_uom: 'LB',
        carrier_code: 'XYZ_CARRIER',
        destination: 'SERMACROPS',
      },
    }

    return JSON.stringify(templates[type], null, 2)
  }

  const [config, setConfig] = useState<RequestConfig>({
    method: 'POST',
    endpoint: '/api/edi/855/send',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: generateSampleBody('855'),
    ediType: '855',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [x12Preview, setX12Preview] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const handleEdiTypeChange = (type: '855' | '810' | '856' | '204') => {
    const endpoints: Record<string, string> = {
      '855': '/api/edi/855/send',
      '810': '/api/edi/810/send',
      '856': '/api/edi/856/send',
      '204': '/api/edi/204/send',
    }
    setConfig({
      ...config,
      ediType: type,
      endpoint: endpoints[type],
      body: generateSampleBody(type),
    })
  }

  const handleHeaderChange = (key: string, value: string) => {
    setConfig({
      ...config,
      headers: { ...config.headers, [key]: value },
    })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Build full URL - handle both relative and absolute endpoints
      let fullUrl = config.endpoint
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `${apiUrl}${config.endpoint}`
      }

      const response = await fetch(fullUrl, {
        method: config.method,
        headers: config.headers,
        body: config.method !== 'GET' ? config.body : undefined,
      })

      const data = await response.json()
      if (response.ok || response.status === 202) {
        onNotification('success', `EDI ${config.ediType} sent`, `Status ${response.status}: ${JSON.stringify(data).slice(0, 100)}...`)
      } else {
        onNotification('error', 'Send failed', data.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      onNotification('error', 'Send failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true)
    try {
      // Try to parse body as JSON
      const bodyObj = JSON.parse(config.body)
      
      // Call backend preview endpoint
      let previewUrl = config.endpoint.replace('/send', '/preview')
      if (!previewUrl.startsWith('http://') && !previewUrl.startsWith('https://')) {
        previewUrl = `${apiUrl}${previewUrl}`
      }

      const response = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.headers['Authorization'],
        },
        body: JSON.stringify(bodyObj),
      })

      if (response.ok) {
        const data = await response.json()
        setX12Preview(data.x12_payload || 'No X12 generated')
        onNotification('success', 'X12 Preview Generated', 'Review below before sending')
      } else {
        onNotification('error', 'Preview failed', `HTTP ${response.status}`)
      }
    } catch (error) {
      onNotification('error', 'Preview failed', error instanceof Error ? error.message : 'Invalid JSON')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  return (
    <section className="request-builder-panel">
      <div className="panel-header">
        <h2>Outbound EDI Request Builder</h2>
        <p>Send 855/810/856/204 to SERMACROPS trading partner</p>
      </div>

      <form onSubmit={handleSend} className="request-form">
        {/* EDI Type Selection */}
        <div className="form-group">
          <label>EDI Type</label>
          <div className="edi-type-buttons">
            {(['855', '810', '856', '204'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`edi-type-btn ${config.ediType === type ? 'active' : ''}`}
                onClick={() => handleEdiTypeChange(type)}
              >
                {type === '855' && '855 - PO Ack'}
                {type === '810' && '810 - Invoice'}
                {type === '856' && '856 - ASN'}
                {type === '204' && '204 - Load Tender'}
              </button>
            ))}
          </div>
        </div>

        {/* Method & Endpoint */}
        <div className="form-row">
          <div className="form-group">
            <label>Method</label>
            <select value={config.method} onChange={(e) => setConfig({ ...config, method: e.target.value as any })}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          <div className="form-group">
            <label>Endpoint</label>
            <input
              type="text"
              value={config.endpoint}
              onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
              placeholder="/api/edi/855/send"
            />
          </div>
        </div>

        {/* Headers */}
        <div className="form-group">
          <label>Headers (edit auth token as needed)</label>
          <div className="headers-container">
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <input type="text" value={key} disabled className="header-key" title="Header name" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleHeaderChange(key, e.target.value)}
                  className="header-value"
                  title={key === 'Authorization' ? 'Use SERMACROPS token (Bearer xxx)' : undefined}
                />
              </div>
            ))}
          </div>
          <p className="form-help" style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            💡 Change the Authorization value to your trading partner's token
          </p>
        </div>

        {/* Body */}
        {config.method !== 'GET' && (
          <div className="form-group">
            <label>Body (JSON)</label>
            <textarea
              value={config.body}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              className="request-body"
              rows={10}
              placeholder='{"po_number": "...", "line_acknowledgments": [...]}'
            />
          </div>
        )}

        {/* Preview Section */}
        {x12Preview && (
          <div className="form-group">
            <label>X12 Preview (generated from JSON above)</label>
            <textarea
              value={x12Preview}
              readOnly
              className="request-body"
              rows={8}
              style={{ background: '#f5f0e6', color: '#666' }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isGeneratingPreview || isSubmitting}
            className="send-btn"
            style={{ background: 'var(--blue)', flex: 1 }}
          >
            {isGeneratingPreview ? 'Generating...' : 'Generate X12 Preview'}
          </button>
          <button type="submit" disabled={isSubmitting} className="send-btn" style={{ flex: 1 }}>
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </section>
  )
}
