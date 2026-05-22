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

const HUB_URL = (import.meta.env.VITE_TAPAT_HUB_URL || 'http://98.88.77.137:3002').replace(/\/+$/, '');
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

  const res = await fetch(`${HUB_URL}/api/verification/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEnvelope(cardId.trim(), items)),
  });

  const data = await res.json().catch(() => null);
  if (!data) throw new Error(`TAPAT Hub returned a non-JSON response (${res.status})`);
  if (!res.ok && data.approved === undefined) {
    throw new Error(data.error || `TAPAT Hub error (${res.status})`);
  }
  return data as TapatVerifyResult;
}

/** Formats a peso amount with two decimals. */
export function formatPeso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
