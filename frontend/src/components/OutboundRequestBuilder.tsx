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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456'

  const [config, setConfig] = useState<RequestConfig>({
    method: 'POST',
    endpoint: '/api/edi/855/send',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
    ediType: '855',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdiTypeChange = (type: '855' | '810' | '856' | '204') => {
    const endpoints: Record<string, string> = {
      '855': '/api/edi/855/send',
      '810': '/api/edi/810/send',
      '856': '/api/edi/856/send',
      '204': '/api/edi/204/send',
    }
    setConfig({ ...config, ediType: type, endpoint: endpoints[type] })
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
      const response = await fetch(`${apiUrl}${config.endpoint}`, {
        method: config.method,
        headers: config.headers,
        body: config.method !== 'GET' ? config.body : undefined,
      })

      const data = await response.json()
      if (response.ok) {
        onNotification('success', `EDI ${config.ediType} sent`, `Response: ${JSON.stringify(data).slice(0, 100)}...`)
      } else {
        onNotification('error', 'Send failed', data.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      onNotification('error', 'Send failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
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
          <label>Headers</label>
          <div className="headers-container">
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <input type="text" value={key} disabled className="header-key" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleHeaderChange(key, e.target.value)}
                  className="header-value"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        {config.method !== 'GET' && (
          <div className="form-group">
            <label>Body (JSON)</label>
            <textarea
              value={config.body}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              className="request-body"
              rows={8}
              placeholder='{"control_number": "123456", ...}'
            />
          </div>
        )}

        {/* Send Button */}
        <button type="submit" disabled={isSubmitting} className="send-btn">
          {isSubmitting ? 'Sending...' : 'Send Request'}
        </button>
      </form>
    </section>
  )
}
