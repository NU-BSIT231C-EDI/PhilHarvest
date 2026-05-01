const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  async getOrders() {
    const response = await fetch(`${API_URL}/api/edi/orders`);
    return response.json();
  },

  async getOrder(id) {
    const response = await fetch(`${API_URL}/api/edi/orders/${id}`);
    return response.json();
  },

  async submitEdi(payload) {
    const response = await fetch(`${API_URL}/api/edi/850/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/edi-x12' },
      body: payload,
    });
    return response.json();
  },
};