/**
 * TAPAT discount-card client for PhilHarvest checkout.
 *
 * Sends an ANSI X12 270 (eligibility inquiry) to the TAPAT Hub and returns the
 * computed Philippine PWD / Senior Citizen discount. The Hub validates the card
 * against the Government Registry and applies the correct order of operations
 * (RA 9994 / RA 10754: VAT removal then 20% on general goods; JAO 24-02: 5%
 * capped at ₱2,500/week on basic necessities & prime commodities).
 *
 * PhilHarvest is registered with the Hub as trading partner TP-PH-001.
 */

// The call to the Hub is forwarded through PhilHarvest's own backend relay
// (POST /api/edi/relay). The browser only ever talks to the same-origin HTTPS
// backend, so this avoids both CORS and HTTPS→HTTP mixed-content blocking that
// a direct browser→Hub fetch hits on the deployed (Render, HTTPS) site.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const AUTH_TOKEN = import.meta.env.VITE_EDI_AUTH_TOKEN || 'master_api_key_secret_123456';

const HUB_URL = (import.meta.env.VITE_TAPAT_HUB_URL || 'http://52.202.47.122:3002').replace(/\/+$/, '');
const ESTABLISHMENT_ID = import.meta.env.VITE_TAPAT_ESTABLISHMENT_ID || 'TP-PH-001';
const TERMINAL_ID = import.meta.env.VITE_TAPAT_TERMINAL_ID || 'TERM-PH-WEB-001';

export type ItemCategory = 'GENERAL' | 'BNPC';

export interface TapatLineItem {
  sku: string;
  qty: number;
  unit_price: number; // VAT-inclusive selling price, PHP
  category: ItemCategory;
}

export interface TapatDiscount {
  gross_amount: number;
  vat_removed: number;
  discount_amount: number;
  net_total: number;
  discount_type: 'VAT_PLUS_20PCT' | 'BNPC_5PCT' | 'MIXED' | 'NONE';
  bnpc_total: number;
  general_total: number;
  bnpc_allowed: number;
  bnpc_cap_exceeded: boolean;
  line_items_discounted: Array<TapatLineItem & { discount: number }>;
}

export interface TapatApprovedResult {
  approved: true;
  card_id: string;
  beneficiary_type: 'PWD' | 'SC' | null;
  disability_type: string | null;
  discount_pct: number;
  vat_exempt: boolean;
  discount: TapatDiscount;
  weekly_remaining_after: number;
  bnpc_cap_exceeded: boolean;
}

export interface TapatRejectedResult {
  approved: false;
  card_id: string;
  message: string;
  validation_status: string;
}

export type TapatVerifyResult = TapatApprovedResult | TapatRejectedResult;

/** Total saved versus the gross cart (VAT removed + statutory discount). */
export function tapatSavings(d: TapatDiscount): number {
  return Math.round((d.gross_amount - d.net_total) * 100) / 100;
}

/** Timestamp-based control number, matching the Hub's scheme. */
function nextControlNumber(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

/** Builds the TAPAT 270 envelope the Hub's verification endpoint validates. */
function buildEnvelope(cardId: string, items: TapatLineItem[]) {
  const controlNumber = nextControlNumber();
  const setControlNumber = `ST-${controlNumber.padStart(9, '0')}`;
  return {
    isa: {
      sender_id: ESTABLISHMENT_ID,
      receiver_id: 'TP-001',
      control_number: controlNumber,
      timestamp: new Date().toISOString(),
      version: 'TAPAT-1.0' as const,
    },
    gs: {
      functional_group: 'HB',
      transaction_set: '270',
      group_control_number: `GS-${controlNumber.padStart(6, '0')}`,
    },
    st: { transaction_set_id: '270', set_control_number: setControlNumber },
    body: {
      card_id: cardId,
      tap_token: `web-${controlNumber}`, // simulated tap; real terminals send a MIFARE cryptogram
      establishment_id: ESTABLISHMENT_ID,
      pos_terminal_id: TERMINAL_ID,
      items,
    },
    se: { segment_count: 4, set_control_number: setControlNumber },
  };
}

/**
 * Verifies a TAPAT card and returns the computed discount for the given cart.
 *
 * Throws on network / non-JSON failures; resolves with `{ approved: false }`
 * when the Hub rejects the card (not found, revoked, expired).
 */
export async function verifyTapatCard(
  cardId: string,
  items: TapatLineItem[],
): Promise<TapatVerifyResult> {
  if (!cardId.trim()) throw new Error('Card number is required');
  if (!items.length) throw new Error('Cart is empty');

  const envelope = buildEnvelope(cardId.trim(), items);

  const relayRes = await fetch(`${API_URL}/api/edi/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AUTH_TOKEN}` },
    body: JSON.stringify({
      url: `${HUB_URL}/api/verification/request`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    }),
  });

  const relay = await relayRes.json().catch(() => null);
  if (!relay) throw new Error(`Relay returned a non-JSON response (${relayRes.status})`);
  if (!relayRes.ok || relay.error) {
    throw new Error(relay.message || relay.error || `Relay error (${relayRes.status})`);
  }

  // The relay returns { status, body } where body is the Hub's raw JSON string.
  let data: TapatVerifyResult | { error?: string };
  try {
    data = JSON.parse(relay.body);
  } catch {
    throw new Error('TAPAT Hub returned an unreadable response');
  }
  if (typeof relay.status === 'number' && relay.status >= 400 && !('approved' in data)) {
    const errMsg = 'error' in data ? data.error : undefined;
    throw new Error(errMsg || `TAPAT Hub error (${relay.status})`);
  }
  return data as TapatVerifyResult;
}

/** Client-built record of a completed TAPAT-discounted sale. */
export interface TapatReceipt {
  receipt_number: string;
  transaction_id: string;
  card_id: string;
  beneficiary_type: 'PWD' | 'SC' | null;
  gross_amount: number;
  vat_removed: number;
  discount_amount: number;
  net_total: number;
  transacted_at: string;
}

/** Builds the EDI 826 (tax-information exchange) envelope from an approved result. */
function build826Envelope(result: TapatApprovedResult, controlNumber: string) {
  const now = new Date();
  const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
  const tail = controlNumber.slice(-5);
  const setControlNumber = `ST-${controlNumber.padStart(9, '0')}`;
  const d = result.discount;
  return {
    isa: {
      sender_id: ESTABLISHMENT_ID,
      receiver_id: 'TP-001',
      control_number: controlNumber,
      timestamp: now.toISOString(),
      version: 'TAPAT-1.0' as const,
    },
    gs: {
      functional_group: 'TX',
      transaction_set: '826',
      group_control_number: `GS-${controlNumber.padStart(6, '0')}`,
    },
    st: { transaction_set_id: '826', set_control_number: setControlNumber },
    body: {
      transaction_id: `TXN-${dateTag}-${tail}`,
      beneficiary_id_masked: `CARD-XXXX-${result.card_id.slice(-4)}`,
      beneficiary_type: result.beneficiary_type,
      establishment_id: ESTABLISHMENT_ID,
      pos_terminal_id: TERMINAL_ID,
      transaction_date: now.toISOString(),
      line_items: d.line_items_discounted,
      gross_amount: d.gross_amount,
      vat_removed: d.vat_removed,
      discount_rate: result.discount_pct,
      discount_amount: d.discount_amount,
      net_total: d.net_total,
      discount_type: d.discount_type,
      bnpc_weekly_used: d.bnpc_allowed,
      bnpc_weekly_remaining: result.weekly_remaining_after,
      receipt_number: `OR-${dateTag}-${tail}`,
    },
    se: { segment_count: 8, set_control_number: setControlNumber },
  };
}

/**
 * Posts the completed discounted sale to the Hub as an EDI 826 (tax-information
 * exchange) so it reaches the Government Portal for compliance reporting — the
 * same post-payment step honeycoffee performs. Routed through the backend relay
 * for the same mixed-content/CORS reasons as verification.
 *
 * Fire-and-forget: a failed 826 must never block the customer's receipt, so the
 * relay call runs in the background (errors are logged, not thrown) and the
 * client-built receipt is returned synchronously.
 */
export function recordTapatTransaction(result: TapatApprovedResult): TapatReceipt {
  const controlNumber = nextControlNumber();
  const envelope = build826Envelope(result, controlNumber);

  fetch(`${API_URL}/api/edi/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AUTH_TOKEN}` },
    body: JSON.stringify({
      url: `${HUB_URL}/api/edi/receive`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-EDI-Sender-ID': ESTABLISHMENT_ID },
      body: JSON.stringify(envelope),
    }),
  }).catch((err) => console.warn('[tapat] 826 dispatch failed:', err));

  const d = result.discount;
  return {
    receipt_number: envelope.body.receipt_number,
    transaction_id: envelope.body.transaction_id,
    card_id: result.card_id,
    beneficiary_type: result.beneficiary_type,
    gross_amount: d.gross_amount,
    vat_removed: d.vat_removed,
    discount_amount: d.discount_amount,
    net_total: d.net_total,
    transacted_at: envelope.isa.timestamp,
  };
}

/** Formats a peso amount with two decimals. */
export function formatPeso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
