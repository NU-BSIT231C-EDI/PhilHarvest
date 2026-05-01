import { useEffect, useState } from "react";

interface OrderItem {
  id: number;
  line_number: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  line_total: number;
}

interface Order {
  id: number;
  po_number: string;
  partner_id: string;
  status: string;
  total_amount: number;
  order_date?: string;
  delivery_date?: string;
  items?: OrderItem[];
}

interface OrderListProps {
  refreshTrigger?: number;
}

export default function OrderList({ refreshTrigger = 0 }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = import.meta.env.VITE_EDI_AUTH_TOKEN || 'partner_test_token_abc123';
      
      const response = await fetch(`${apiUrl}/api/edi/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Handle both paginated and direct array responses
      const orderData = data.data || data;
      const normalizedOrders = (Array.isArray(orderData) ? orderData : []).map((order: any) => ({
        ...order,
        total_amount: typeof order.total_amount === 'string' 
          ? parseFloat(order.total_amount) 
          : order.total_amount,
        items: (order.items || []).map((item: any) => ({
          ...item,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          line_total: typeof item.line_total === 'string' ? parseFloat(item.line_total) : item.line_total,
        })),
      }));
      setOrders(normalizedOrders);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);
      console.error("Error fetching orders:", err);

      // Use mock data as fallback
      const mockOrders: Order[] = [
        {
          id: 1,
          po_number: "PO-001",
          partner_id: "TESTPARTNER",
          status: "PENDING",
          total_amount: 5000,
          items: [
            {
              id: 1,
              line_number: 1,
              product_code: "PROD-001",
              product_name: "Sample Product",
              quantity: 50,
              unit_of_measure: "KG",
              unit_price: 100,
              line_total: 5000,
            },
          ],
        },
      ];
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="order-list">
      {error && <div className="error-banner">{error}</div>}

      <div className="list-header">
        <h2>Purchase Orders</h2>
        <button onClick={fetchOrders} className="refresh-btn">
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="no-data">No orders found</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th></th>
              <th>PO Number</th>
              <th>Partner</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tbody key={order.id}>
                <tr className={`status-${order.status.toLowerCase()}`}>
                  <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                    {expandedId === order.id ? '▼' : '▶'}
                  </td>
                  <td className="po-number">{order.po_number}</td>
                  <td>{order.partner_id}</td>
                  <td className="status-badge">{order.status}</td>
                  <td>{order.order_date || 'N/A'}</td>
                  <td className="amount">
                    ₱{order.total_amount?.toFixed(2) || "0.00"}
                  </td>
                </tr>
                {expandedId === order.id && (
                  <>
                    {order.items && order.items.length > 0 ? (
                      <>
                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                          <td colSpan={6} style={{ padding: '0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#e8e8e8' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Line</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Product Code</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Product Name</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '8px' }}>{item.line_number}</td>
                                    <td style={{ padding: '8px' }}>{item.product_code}</td>
                                    <td style={{ padding: '8px' }}>{item.product_name}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity?.toFixed(2)}</td>
                                    <td style={{ padding: '8px' }}>{item.unit_of_measure}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>₱{item.unit_price?.toFixed(2)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₱{item.line_total?.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ backgroundColor: '#f9f9f9' }}>
                        <td colSpan={6} style={{ padding: '8px', textAlign: 'center', fontStyle: 'italic', color: '#999' }}>
                          No line items
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
