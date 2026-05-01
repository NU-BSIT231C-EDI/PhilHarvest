const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN = import.meta.env.VITE_EDI_AUTH_TOKEN || 'partner_test_token_abc123';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${AUTH_TOKEN}`,
});

export interface Order {
  id: number;
  po_number: string;
  partner_id: string;
  status: string;
  total_amount: number;
  order_date?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export const api = {
  async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${API_URL}/api/edi/orders`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  async getOrder(id: number): Promise<Order> {
    try {
      const response = await fetch(`${API_URL}/api/edi/orders/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  async submitEdi(payload: string, partnerId: string = 'TESTPARTNER'): Promise<ApiResponse<{ transaction_id: number; control_number: string }>> {
    try {
      const response = await fetch(`${API_URL}/api/edi/850/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/edi-x12',
          ...getAuthHeaders(),
        },
        body: payload,
      });

      const data = await response.json();
      
      if (!response.ok && response.status !== 202) {
        throw new Error(data.error || 'Failed to submit EDI');
      }

      return data;
    } catch (error) {
      console.error('Error submitting EDI:', error);
      throw error;
    }
  },
};
