const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456';

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

function jsonHeaders(): HeadersInit {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

// ─── Types matching backend /api/edi/transactions response ───────────────────

export type BackendStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

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
  '850': 'Purchase Order',
  '855': 'PO Acknowledgment',
  '856': 'Advance Ship Notice',
  '810': 'Invoice',
  '204': 'Load Tender',
  '990': 'Load Tender Response',
  '997': 'Functional Ack.',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/** Maps backend PENDING/SENT/FAILED/RETRYING → frontend status tokens */
export function mapStatus(status: BackendStatus): 'delivered' | 'pending' | 'validated' | 'error' {
  if (status === 'SENT') return 'delivered';
  if (status === 'FAILED') return 'error';
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
      quantity: number;
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
  if (!res.ok && res.status !== 202) throw new Error(data.message ?? `Send failed (${res.status})`);
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
  if (!res.ok && res.status !== 202) throw new Error(data.message ?? `Send failed (${res.status})`);
  return data;
}
