import { useCallback, useEffect, useState } from 'react'

export interface TradingPartner {
  id: number
  label: string
  isa_receiver_id: string
  company_name: string
  edi_role: 'BY' | 'SE' | 'SF' | 'ST'
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string | null
  postal_code: string
  country: string
  po_number_format: string
  default_currency: string
  api_endpoint: string
  auth_token: string
  auth_token_masked: string
  n1_segments: string[]
  created_at: string
  updated_at: string
}

type PartnerFormData = Omit<TradingPartner, 'id' | 'auth_token_masked' | 'n1_segments' | 'created_at' | 'updated_at'>

const BLANK_FORM: PartnerFormData = {
  label: '',
  isa_receiver_id: '',
  company_name: '',
  edi_role: 'BY',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'PH',
  po_number_format: '',
  default_currency: 'PHP',
  api_endpoint: '',
  auth_token: '',
}

const EDI_ROLE_LABELS: Record<string, string> = {
  BY: 'BY — Buying Party',
  SE: 'SE — Selling Party',
  SF: 'SF — Ship From',
  ST: 'ST — Ship To',
}

const CURRENCIES = ['PHP', 'USD', 'EUR', 'SGD', 'JPY', 'AUD', 'CAD', 'GBP']

interface Props {
  apiUrl: string
  token: string
  onNotification: (type: 'success' | 'error' | 'info', title: string, message: string) => void
  onPartnersChange: (partners: TradingPartner[]) => void
}

export default function TradingPartnerManager({ apiUrl, token, onNotification, onPartnersChange }: Props) {
  const [partners, setPartners] = useState<TradingPartner[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PartnerFormData>(BLANK_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [revealedTokens, setRevealedTokens] = useState<Set<number>>(new Set())
  const [showTokenInForm, setShowTokenInForm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/edi/trading-partners`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: TradingPartner[] = await res.json()
      setPartners(data)
      onPartnersChange(data)
    } catch (e) {
      onNotification('error', 'Failed to load partners', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  useEffect(() => { fetchPartners() }, [fetchPartners])

  const openAdd = () => {
    setEditingId(null)
    setForm(BLANK_FORM)
    setShowTokenInForm(false)
    setIsModalOpen(true)
  }

  const openEdit = (p: TradingPartner) => {
    setEditingId(p.id)
    setForm({
      label: p.label,
      isa_receiver_id: p.isa_receiver_id.trimEnd(),
      company_name: p.company_name,
      edi_role: p.edi_role,
      address_line_1: p.address_line_1,
      address_line_2: p.address_line_2 ?? '',
      city: p.city,
      state: p.state ?? '',
      postal_code: p.postal_code,
      country: p.country,
      po_number_format: p.po_number_format,
      default_currency: p.default_currency,
      api_endpoint: p.api_endpoint,
      auth_token: '',
    })
    setShowTokenInForm(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const field = (key: keyof PartnerFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const payload: Record<string, string | null | undefined> = { ...form }
    if (editingId !== null && payload['auth_token'] === '') {
      delete payload['auth_token']
    }

    try {
      const url = editingId !== null
        ? `${apiUrl}/api/edi/trading-partners/${editingId}`
        : `${apiUrl}/api/edi/trading-partners`
      const method = editingId !== null ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      const data = await res.json()

      if (res.ok || res.status === 201) {
        onNotification('success', editingId ? 'Partner updated' : 'Partner added', `"${data.label}" saved.`)
        closeModal()
        fetchPartners()
      } else {
        const msg = data.message
          ? (typeof data.message === 'object' ? JSON.stringify(data.message) : data.message)
          : `HTTP ${res.status}`
        onNotification('error', 'Save failed', msg)
      }
    } catch (e) {
      onNotification('error', 'Save failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number, label: string) => {
    if (!window.confirm(`Delete partner "${label}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`${apiUrl}/api/edi/trading-partners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 204 || res.ok) {
        onNotification('success', 'Partner deleted', `"${label}" removed.`)
        fetchPartners()
      } else {
        onNotification('error', 'Delete failed', `HTTP ${res.status}`)
      }
    } catch (e) {
      onNotification('error', 'Delete failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleReveal = (id: number) => {
    setRevealedTokens((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <section className="monitor-panel" style={{ marginTop: '24px' }}>
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2>Trading Partner / Company Profiles</h2>
          <p>Stored profiles auto-populate endpoint and auth headers in the outbound builder.</p>
        </div>
        <button className="nav-btn" onClick={openAdd} style={{ whiteSpace: 'nowrap' }}>
          + Add Company
        </button>
      </div>

      {loading && <p style={{ padding: '16px', color: 'var(--muted)' }}>Loading partners…</p>}

      {!loading && partners.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>
          No trading partners yet. Click <strong>+ Add Company</strong> to create one.
        </div>
      )}

      {partners.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface, #f5f5f5)', borderBottom: '2px solid var(--border, #ddd)' }}>
                {['Label', 'Company Name', 'Role', 'ISA Receiver ID', 'Currency', 'API Endpoint', 'Auth Token', ''].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.label}</td>
                  <td style={{ padding: '8px 12px' }}>{p.company_name}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: 'var(--blue, #1565c0)', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {p.edi_role}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {p.isa_receiver_id}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{p.default_currency}</td>
                  <td style={{ padding: '8px 12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span title={p.api_endpoint}>{p.api_endpoint}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {revealedTokens.has(p.id) ? p.auth_token : p.auth_token_masked}
                    {' '}
                    <button
                      type="button"
                      onClick={() => toggleReveal(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue, #1565c0)', fontSize: '0.75rem', padding: '0 2px' }}
                    >
                      {revealedTokens.has(p.id) ? 'hide' : 'show'}
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      style={{ background: 'none', border: '1px solid var(--border, #ccc)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', marginRight: '6px', fontSize: '0.8rem' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.label)}
                      disabled={deletingId === p.id}
                      style={{ background: 'none', border: '1px solid #c62828', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', color: '#c62828', fontSize: '0.8rem' }}
                    >
                      {deletingId === p.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* N1 segment preview strip for last selected / hovered — shown in a collapsible per row */}
      {partners.length > 0 && (
        <details style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--muted)', userSelect: 'none' }}>Show N1 segment preview for all partners</summary>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {partners.map((p) => (
              <div key={p.id} style={{ background: 'var(--surface, #f5f5f5)', borderRadius: '6px', padding: '8px 12px' }}>
                <strong style={{ fontSize: '0.85rem' }}>{p.label}</strong>
                <pre style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '0.78rem', color: '#333', whiteSpace: 'pre-wrap' }}>
                  {p.n1_segments.map((s) => `${s}~`).join('\n')}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add / Edit Modal                                                     */}
      {/* ------------------------------------------------------------------ */}
      {isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit Company Profile' : 'Add Company Profile'}</h3>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <FormRow>
                <FormField label="Internal Label *" hint="UI display name">
                  <input required value={form.label} onChange={(e) => field('label', e.target.value)} placeholder="e.g. SERMACROPS Manufacturer" />
                </FormField>
                <FormField label="EDI Role *" hint="N101 qualifier">
                  <select required value={form.edi_role} onChange={(e) => field('edi_role', e.target.value as PartnerFormData['edi_role'])}>
                    {Object.entries(EDI_ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="ISA/GS Receiver ID *" hint="ISA08 / GS03 — auto-padded to 15 chars">
                  <input required maxLength={15} value={form.isa_receiver_id} onChange={(e) => field('isa_receiver_id', e.target.value)} placeholder="SERMACROPS" style={{ fontFamily: 'monospace' }} />
                </FormField>
                <FormField label="Company Legal Name *" hint="N102 — max 35 chars">
                  <input required maxLength={35} value={form.company_name} onChange={(e) => field('company_name', e.target.value)} placeholder="Serma Crops International Inc." />
                </FormField>
              </FormRow>

              <FormField label="Address Line 1 *" hint="N301 — max 55 chars">
                <input required maxLength={55} value={form.address_line_1} onChange={(e) => field('address_line_1', e.target.value)} placeholder="458 Mabini St., Brgy. Santo Nino" />
              </FormField>

              <FormField label="Address Line 2" hint="N302 — optional">
                <input maxLength={55} value={form.address_line_2 ?? ''} onChange={(e) => field('address_line_2', e.target.value)} placeholder="Suite 200" />
              </FormField>

              <FormRow>
                <FormField label="City *" hint="N401">
                  <input required maxLength={30} value={form.city} onChange={(e) => field('city', e.target.value)} placeholder="General Santos City" />
                </FormField>
                <FormField label="State/Province" hint="N402">
                  <input maxLength={3} value={form.state ?? ''} onChange={(e) => field('state', e.target.value)} placeholder="SC" style={{ fontFamily: 'monospace' }} />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Postal Code *" hint="N403">
                  <input required maxLength={15} value={form.postal_code} onChange={(e) => field('postal_code', e.target.value)} placeholder="9500" />
                </FormField>
                <FormField label="Country *" hint="N404 — ISO 3166-1 alpha-2">
                  <input required minLength={2} maxLength={2} value={form.country} onChange={(e) => field('country', e.target.value.toUpperCase())} placeholder="PH" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="PO Number Format *" hint="BEG03 prefix/pattern">
                  <input required value={form.po_number_format} onChange={(e) => field('po_number_format', e.target.value)} placeholder="PO-{YYYY}-{SEQ}" />
                </FormField>
                <FormField label="Default Currency *" hint="CUR03 — ISO 4217">
                  <select required value={form.default_currency} onChange={(e) => field('default_currency', e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
              </FormRow>

              <FormField label="API Endpoint *" hint="HTTPS outbound transmission URL">
                <input required type="url" value={form.api_endpoint} onChange={(e) => field('api_endpoint', e.target.value)} placeholder="https://partner.example.com/api/edi/inbound" />
              </FormField>

              <FormField
                label={editingId ? 'Auth Token (leave blank to keep existing)' : 'Auth Token *'}
                hint="Stored encrypted at rest — Bearer or API-Key value"
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    required={editingId === null}
                    type={showTokenInForm ? 'text' : 'password'}
                    value={form.auth_token}
                    onChange={(e) => field('auth_token', e.target.value)}
                    placeholder={editingId ? '(unchanged)' : 'sk-live-...'}
                    style={{ flex: 1, fontFamily: 'monospace' }}
                  />
                  <button type="button" onClick={() => setShowTokenInForm((v) => !v)} style={{ border: '1px solid var(--border,#ccc)', background: '#fff', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {showTokenInForm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </FormField>

              {/* N1 segment live preview */}
              {(form.edi_role && form.company_name) && (
                <div style={{ background: '#f5f0e6', borderRadius: '6px', padding: '10px 12px', marginTop: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', fontFamily: 'sans-serif', fontSize: '0.75rem', color: '#888' }}>N1 segment preview</div>
                  <div>N1*{form.edi_role}*{form.company_name || '…'}~</div>
                  {form.address_line_1 && <div>N3*{form.address_line_1}{form.address_line_2 ? `*${form.address_line_2}` : ''}~</div>}
                  {form.city && <div>N4*{form.city}*{form.state || ''}*{form.postal_code || ''}*{form.country || ''}~</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 20px', border: '1px solid var(--border,#ccc)', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="submit-btn" style={{ padding: '8px 20px' }}>
                  {isSaving ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Company')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

// Small layout helpers — avoids importing a UI library
function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--muted, #888)' }}>{hint}</p>}
    </div>
  )
}
