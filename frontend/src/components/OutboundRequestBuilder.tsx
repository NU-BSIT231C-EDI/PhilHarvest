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
  const philHarvestToken = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'

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
        invoice_number: 'INV-2025-001',
        invoice_date: '2025-05-19',
        po_number: 'PO-2025-8842',
        po_date: '2025-05-15',
        manufacturer_id: 'ACME_CORP',
        bill_to_name: 'PhilHarvest Inc.',
        bill_to_address: { street: '123 Farm Road', city: 'Manila', state: 'NCR', postal_code: '1000', country: 'PH' },
        ship_from_address: { street: '456 Harvest Ave', city: 'Quezon City', state: 'NCR', postal_code: '1100', country: 'PH' },
        total_amount: 1475.0,
        line_items: [
          { line_number: '1', po_line_number: '1', part_number: 'WIDGET-A', part_description: 'Widget A Component', invoiced_quantity: 50, quantity_uom: 'EA', unit_price: 12.50 },
          { line_number: '2', po_line_number: '2', part_number: 'BOLT-STEEL', part_description: 'Steel Bolt', invoiced_quantity: 200, quantity_uom: 'LB', unit_price: 4.25 },
        ],
      },
      '856': {
        asn_number: 'ASN-2025-001',
        po_number: 'PO-2025-8842',
        po_date: '2025-05-15',
        manufacturer_id: 'ACME_CORP',
        ship_date: new Date().toISOString().slice(0, 10),
        ship_from_address: { street: '456 Harvest Ave', city: 'Quezon City', state: 'NCR', postal_code: '1100', country: 'PH' },
        ship_to_address: { street: '789 Delivery Blvd', city: 'Makati', state: 'NCR', postal_code: '1200', country: 'PH' },
        boxes: [
          {
            box_number: '1',
            weight: 25,
            weight_uom: 'LB',
            line_items: [
              { line_number: '1', item_id: 'WIDGET-A', shipped_quantity: 50, quantity_uom: 'EA' },
              { line_number: '2', item_id: 'BOLT-STEEL', shipped_quantity: 200, quantity_uom: 'LB' },
            ],
          },
        ],
      },
      '204': {
        load_tender_id: 'LOAD-001',
        shipper_company_name: 'PhilHarvest Inc.',
        shipper_address: { street: '456 Harvest Ave', city: 'Quezon City', state: 'NCR', postal_code: '1100', country: 'PH' },
        carrier_code: 'XYZ_CARRIER',
        ship_to_address: { street: '789 Delivery Blvd', city: 'Makati', state: 'NCR', postal_code: '1200', country: 'PH' },
        shipments: [
          { shipment_number: 'SHIP-2025-001', weight: 250, weight_uom: 'LB', commodity: 'Agricultural Products' },
        ],
        pickup_date: new Date().toISOString().slice(0, 10),
        delivery_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      },
    }

    return JSON.stringify(templates[type], null, 2)
  }

  const philHarvestEndpoints: Record<string, string> = {
    '855': '/api/edi/855/send',
    '810': '/api/edi/810/send',
    '856': '/api/edi/856/send',
    '204': '/api/edi/204/send',
  }

  const previewEndpoints: Record<string, string> = {
    '855': '/api/edi/855/preview',
    '810': '/api/edi/810/preview',
    '856': '/api/edi/856/preview',
    '204': '/api/edi/204/preview',
  }

  const [config, setConfig] = useState<RequestConfig>({
    method: 'POST',
    endpoint: '/api/edi/855/send',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${philHarvestToken}`,
    },
    body: generateSampleBody('855'),
    ediType: '855',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingX12, setIsSendingX12] = useState(false)
  const [x12Preview, setX12Preview] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const isAbsoluteEndpoint =
    config.endpoint.startsWith('http://') || config.endpoint.startsWith('https://')

  const handleEdiTypeChange = (type: '855' | '810' | '856' | '204') => {
    setConfig({
      ...config,
      ediType: type,
      endpoint: philHarvestEndpoints[type],
      body: generateSampleBody(type),
    })
  }

  const handleHeaderChange = (key: string, value: string) => {
    setConfig({
      ...config,
      headers: { ...config.headers, [key]: value },
    })
  }

  const handleSendX12ToPartner = async () => {
    setIsSendingX12(true)
    try {
      // Step 1: generate X12 from JSON body via PhilHarvest preview endpoint
      const bodyObj = JSON.parse(config.body)
      const previewUrl = `${apiUrl}${previewEndpoints[config.ediType]}`
      const previewResponse = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${philHarvestToken}`,
        },
        body: JSON.stringify(bodyObj),
      })

      if (!previewResponse.ok) {
        const previewData = await previewResponse.json()
        onNotification('error', 'X12 generation failed', previewData.message || `HTTP ${previewResponse.status}`)
        return
      }

      const previewData = await previewResponse.json()
      const x12String = previewData.x12_payload as string
      setX12Preview(x12String)

      // Step 2: relay to partner with x12Content wrapper
      const relayResponse = await fetch(`${apiUrl}/api/edi/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${philHarvestToken}`,
        },
        body: JSON.stringify({
          url: config.endpoint,
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify({ x12Content: x12String }),
        }),
      })

      const relayData = await relayResponse.json()
      if (relayResponse.ok) {
        const partnerStatus = relayData.status as number
        if (partnerStatus >= 200 && partnerStatus < 300) {
          onNotification('success', `EDI ${config.ediType} sent to partner`, `HTTP ${partnerStatus}: ${String(relayData.body).slice(0, 120)}`)
        } else {
          onNotification('error', `Partner rejected (HTTP ${partnerStatus})`, String(relayData.body).slice(0, 200))
        }
      } else {
        onNotification('error', 'Relay failed', relayData.message || `HTTP ${relayResponse.status}`)
      }
    } catch (error) {
      onNotification('error', 'Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSendingX12(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isAbsoluteEndpoint) {
        // Route through PhilHarvest relay to avoid browser CORS on cross-origin calls
        const relayUrl = `${apiUrl}/api/edi/relay`
        const relayResponse = await fetch(relayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${philHarvestToken}`,
          },
          body: JSON.stringify({
            url: config.endpoint,
            method: config.method,
            headers: config.headers,
            body: config.method !== 'GET' ? config.body : null,
          }),
        })

        const relayData = await relayResponse.json()
        if (relayResponse.ok) {
          const partnerStatus = relayData.status as number
          if (partnerStatus >= 200 && partnerStatus < 300) {
            onNotification(
              'success',
              `EDI ${config.ediType} sent`,
              `Partner returned ${partnerStatus}: ${String(relayData.body).slice(0, 120)}`,
            )
          } else {
            onNotification(
              'error',
              `Partner rejected (HTTP ${partnerStatus})`,
              String(relayData.body).slice(0, 200),
            )
          }
        } else {
          onNotification('error', 'Relay failed', relayData.message || `HTTP ${relayResponse.status}`)
        }
      } else {
        // Direct call to PhilHarvest's own endpoints
        const fullUrl = `${apiUrl}${config.endpoint}`
        const response = await fetch(fullUrl, {
          method: config.method,
          headers: config.headers,
          body: config.method !== 'GET' ? config.body : undefined,
        })

        const data = await response.json()
        if (response.ok || response.status === 202) {
          onNotification(
            'success',
            `EDI ${config.ediType} sent`,
            `Status ${response.status}: ${JSON.stringify(data).slice(0, 100)}...`,
          )
        } else {
          onNotification('error', 'Send failed', data.error || `HTTP ${response.status}`)
        }
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
      const bodyObj = JSON.parse(config.body)

      // Preview always calls PhilHarvest's own preview endpoints (needs JSON body)
      const previewUrl = `${apiUrl}${previewEndpoints[config.ediType]}`
      const response = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${philHarvestToken}`,
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
        <p>Generate and send EDI documents to any trading partner</p>
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
            <select
              value={config.method}
              onChange={(e) => setConfig({ ...config, method: e.target.value as RequestConfig['method'] })}
            >
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
              placeholder="/api/edi/855/send  or  https://partner.com/api/edi/inbound"
            />
            {isAbsoluteEndpoint && (
              <p className="form-help" style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--blue)' }}>
                External URL — request will be relayed via PhilHarvest backend (no CORS issues)
              </p>
            )}
          </div>
        </div>

        {/* Headers */}
        <div className="form-group">
          <label>
            {isAbsoluteEndpoint
              ? 'Request Headers (sent to partner endpoint)'
              : 'Request Headers (sent to PhilHarvest endpoint)'}
          </label>
          <div className="headers-container">
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <input type="text" value={key} disabled className="header-key" title="Header name" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleHeaderChange(key, e.target.value)}
                  className="header-value"
                />
              </div>
            ))}
          </div>
          <p className="form-help" style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            {isAbsoluteEndpoint
              ? 'These headers go directly to the partner — update Authorization to the partner\'s token'
              : 'Authorization is PhilHarvest\'s API token for authenticating with the backend'}
          </p>
        </div>

        {/* Body */}
        {config.method !== 'GET' && (
          <div className="form-group">
            <label>Body</label>
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
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isGeneratingPreview || isSubmitting || isSendingX12}
            className="send-btn"
            style={{ background: 'var(--blue)', flex: 1 }}
          >
            {isGeneratingPreview ? 'Generating...' : 'Generate X12 Preview'}
          </button>
          {isAbsoluteEndpoint ? (
            <button
              type="button"
              onClick={handleSendX12ToPartner}
              disabled={isSendingX12 || isSubmitting || isGeneratingPreview}
              className="send-btn"
              style={{ background: 'var(--green, #2e7d32)', flex: 1 }}
            >
              {isSendingX12 ? 'Generating & Sending...' : 'Generate X12 & Send to Partner'}
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting} className="send-btn" style={{ flex: 1 }}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
