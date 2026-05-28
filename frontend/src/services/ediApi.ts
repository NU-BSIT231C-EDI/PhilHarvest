const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456';

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

function jsonHeaders(): HeadersInit {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

/** Turns a Laravel validation error bag (object or string) into a readable sentence */
function extractErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object') {
    const lines = Object.values(msg as Record<string, string[]>).flat();
    return lines.length ? lines.join('; ') : (data.error as string | undefined) ?? fallback;
  }
  return (data.error as string | undefined) ?? fallback;
}

// ─── Types matching backend /api/edi/transactions response ───────────────────

export type BackendStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING' | 'VALIDATED' | 'REJECTED';

export interface BackendTransaction {
  id: number;
  transaction_type: string;
  control_number: string;
  partner_id: string;
  status: BackendStatus;
  direction: 'inbound' | 'outbound';
  payload_preview: string;
  parsed_data: Record<string, unknown> | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  '846': 'Inventory Advice',
  '850': 'Purchase Order',
  '855': 'PO Acknowledgment',
  '856': 'Advance Ship Notice',
  '861': 'Receiving Advice',
  '810': 'Invoice',
  '204': 'Load Tender',
  '990': 'Load Tender Response',
  '997': 'Functional Ack.',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/** Maps backend status values → frontend status tokens */
export function mapStatus(status: BackendStatus): 'delivered' | 'pending' | 'validated' | 'error' {
  if (status === 'SENT') return 'delivered';
  if (status === 'VALIDATED') return 'validated';
  if (status === 'FAILED' || status === 'REJECTED') return 'error';
  return 'pending';
}

/** ISO datetime → "YYYY-MM-DD HH:mm" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** GET /api/edi/transactions — returns 25 most recent */
export async function fetchTransactions(): Promise<BackendTransaction[]> {
  const res = await fetch(`${API_URL}/api/edi/transactions`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);
  return res.json();
}

/** POST /api/edi/transmissions/{id}/retry — only works for FAILED transactions */
export async function retryTransmission(transactionId: number): Promise<{ success: boolean; message: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/transmissions/${transactionId}/retry`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Retry failed (${res.status})`);
  return data;
}

/**
 * POST /api/edi/850/receive — sends raw X12 as the inbound 850 endpoint.
 * Content-Type must be application/EDI-X12.
 */
export async function sendRaw850(x12Payload: string): Promise<{ transaction_id: number; control_number: string }> {
  const res = await fetch(`${API_URL}/api/edi/850/receive`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/EDI-X12' },
    body: x12Payload,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(data.error ?? `Send failed (${res.status})`);
  return data;
}

/** POST /api/edi/856/send — expects JSON body */
export async function send856(payload: {
  asn_number: string;
  po_number: string;
  po_date: string;
  manufacturer_id: string;
  ship_date: string;
  ship_from_address: Record<string, string>;
  ship_to_address: Record<string, string>;
  boxes: Array<{
    box_number: string;
    line_items: Array<{
      line_number: string;
      part_number: string;
      part_description: string;
      shipped_quantity: number;
      quantity_uom: string;
    }>;
  }>;
}): Promise<{ transaction_id: number; control_number: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/856/send`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(extractErrorMessage(data, `Send failed (${res.status})`));
  return data;
}

/** POST /api/edi/810/send — expects JSON body */
export async function send810(payload: {
  invoice_number: string;
  invoice_date: string;
  po_number: string;
  po_date: string;
  manufacturer_id: string;
  bill_to_name: string;
  bill_to_address: Record<string, string>;
  ship_from_address: Record<string, string>;
  line_items: Array<{
    line_number: string;
    po_line_number: string;
    part_number: string;
    part_description: string;
    invoiced_quantity: number;
    quantity_uom: string;
    unit_price: number;
  }>;
  total_amount: number;
}): Promise<{ transaction_id: number; control_number: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/810/send`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(extractErrorMessage(data, `Send failed (${res.status})`));
  return data;
}

/** POST /api/edi/846/send — inventory advice triggered on stock update */
export async function send846(payload: {
  items: Array<{ sku: string; upc?: string; quantity: number; uom?: string }>;
  reference_number?: string;
  warehouse_name?: string;
  vendor_id?: string;
}): Promise<{ transaction_id: number; control_number: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/846/send`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(extractErrorMessage(data, `Send failed (${res.status})`));
  return data;
}

/** POST /api/edi/855/send */
export async function send855(payload: Record<string, unknown>): Promise<{ transaction_id: number; control_number: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/855/send`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(extractErrorMessage(data, `Send failed (${res.status})`));
  return data;
}

/** POST /api/edi/204/send */
export async function send204(payload: Record<string, unknown>): Promise<{ transaction_id: number; control_number: string; status: string }> {
  const res = await fetch(`${API_URL}/api/edi/204/send`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(extractErrorMessage(data, `Send failed (${res.status})`));
  return data;
}

/** POST /api/edi/{type}/preview — returns { x12_content: string } */
export async function previewEdi(type: '855' | '856' | '810' | '204', payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_URL}/api/edi/${type}/preview`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(extractErrorMessage(data, `Preview failed (${res.status})`));
  return data.x12_payload ?? data.x12_content ?? data.preview ?? data.edi ?? '';
}

/** GET /api/edi/trading-partners */
export async function fetchTradingPartners(): Promise<TradingPartner[]> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load partners (${res.status})`);
  return res.json();
}

/** POST /api/edi/trading-partners */
export async function createTradingPartner(data: Omit<TradingPartner, 'id' | 'auth_token_masked' | 'n1_segments' | 'created_at' | 'updated_at'>): Promise<TradingPartner> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Failed (${res.status})`);
  return json;
}

/** PUT /api/edi/trading-partners/:id */
export async function updateTradingPartner(id: number, data: Partial<TradingPartner>): Promise<TradingPartner> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Failed (${res.status})`);
  return json;
}

/** DELETE /api/edi/trading-partners/:id */
export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/edi/transactions/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function deleteTradingPartner(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function archiveTradingPartner(id: number): Promise<TradingPartner> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners/${id}/archive`, { method: 'PATCH', headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Archive failed (${res.status})`);
  return json;
}

export async function unarchiveTradingPartner(id: number): Promise<TradingPartner> {
  const res = await fetch(`${API_URL}/api/edi/trading-partners/${id}/unarchive`, { method: 'PATCH', headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Unarchive failed (${res.status})`);
  return json;
}

export interface TradingPartner {
  id: number;
  label: string;
  isa_receiver_id: string;
  company_name: string;
  edi_role: 'BY' | 'SE' | 'SF' | 'ST';
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  po_number_format: string;
  default_currency: string;
  api_endpoint: string;
  auth_token: string;
  auth_token_masked?: string;
  excluded_skus?: string[] | null;
  is_archived?: boolean;
  n1_segments?: string[];
  created_at?: string;
  updated_at?: string;
}
