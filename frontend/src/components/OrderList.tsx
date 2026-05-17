import { useEffect, useState, Fragment } from "react";
import "./OrderList.css"

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
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch orders: ${errorMessage}`);
      console.error("Error fetching orders:", err);

      // Use mock data as fallback
      const mockOrders: Order[] = [
        {
          id: 1,
          po_number: "PO-001",
          partner_id: "TESTPARTNER",
          status: "PENDING",
          total_amount: 5000,
          order_date: new Date().toISOString().split('T')[0],
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
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="no-data">No orders found. Submit a test EDI 850 to get started.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>PO Number</th>
              <th>Partner</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr className={`status-${order.status.toLowerCase()}`}>
                  <td className="expand-button" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
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
                  <tr className="order-details-row">
                    <td colSpan={6} style={{ padding: '0' }}>
                      {order.items && order.items.length > 0 ? (
                        <table className="order-details-table">
                          <thead className="order-details-header">
                            <tr>
                              <th>Line</th>
                              <th>Product Code</th>
                              <th>Product Name</th>
                              <th>Qty</th>
                              <th>Unit</th>
                              <th>Unit Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="order-details-body">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.line_number}</td>
                                <td>{item.product_code}</td>
                                <td>{item.product_name}</td>
                                <td className="line-item-qty">{item.quantity?.toFixed(2)}</td>
                                <td>{item.unit_of_measure}</td>
                                <td className="line-item-price">₱{item.unit_price?.toFixed(2)}</td>
                                <td className="line-item-total">₱{item.line_total?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="no-items-message">No line items</div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
