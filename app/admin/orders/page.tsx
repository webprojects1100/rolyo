"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";

// Define Interfaces for Order Data
interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  // Add other fields if present in your shipping jsonb, e.g., postalCode, email
}

interface OrderItem {
  id: string; // Product ID
  name: string;
  price: number;
  quantity: number;
  size: string;
  imageUrl?: string; // Assuming imageUrl is stored or can be derived for display
}

// Interface for the raw data from Supabase before processing
interface RawSupabaseOrder {
  id: string;
  shipping: string | ShippingInfo; // Can be a JSON string or an object
  items: string | OrderItem[];    // Can be a JSON string or an array
  created_at: string;
  status: string;
}

interface Order extends RawSupabaseOrder {
  // Inherits from RawSupabaseOrder, but shipping and items will be processed
  shipping: ShippingInfo;
  items: OrderItem[];
  totalAmount: number; 
}

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function fetchOrders() {
    try {
      // setLoading(true); // setLoading(true) is called in checkAdminAndFetch
      setFetchError(null);
      const { data, error } = await supabase
        .from("orders")
        .select("id, shipping, items, created_at, status")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        setFetchError(error.message);
        setOrders([]);
        return;
      }

      if (data) {
        const processedOrders: Order[] = data.map((order: RawSupabaseOrder) => {
          let total = 0;
          const itemsArray: OrderItem[] = typeof order.items === 'string' 
            ? JSON.parse(order.items) 
            : Array.isArray(order.items) ? order.items : [];
          
          itemsArray.forEach((item: OrderItem) => {
            total += (item.price || 0) * (item.quantity || 0);
          });
          
          const shippingInfo: ShippingInfo = typeof order.shipping === 'string' 
            ? JSON.parse(order.shipping) 
            : order.shipping;

          return {
            id: order.id,
            created_at: order.created_at,
            status: order.status,
            shipping: shippingInfo,
            items: itemsArray,
            totalAmount: total,
          };
        });
        setOrders(processedOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Unexpected error in fetchOrders:", err);
      setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
      setOrders([]);
    } finally {
      // setLoading(false); // Loading will be set to false by checkAdminAndFetch in useEffect
    }
  }

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && await isAdmin(user.id)) {
        setAdmin(true);
        await fetchOrders(); 
      } else {
        setAdmin(false);
        setOrders([]);
      }
      setLoading(false);
    };
    checkAdminAndFetch();
  }, []);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatusOrderId(orderId);
    setUpdateError(null);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        setUpdateError(`Failed to update status for order ${orderId.substring(0,8)}: ${error.message}`);
        setUpdatingStatusOrderId(null);
        return;
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      // Optionally, show a success message/toast here
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      setUpdateError(err instanceof Error ? err.message : 'An unknown error occurred during status update.');
    } finally {
      setUpdatingStatusOrderId(null);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto py-10 text-center">Loading...</div>;
  if (!admin) return <div className="max-w-2xl mx-auto py-10 text-center text-red-600 font-bold">Access Denied: Admins Only</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin: Manage Orders</h1>
      
      {fetchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold\">Error fetching orders: </strong>
          <span className="block sm:inline">{fetchError}</span>
        </div>
      )}
      {updateError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mt-2" role="alert">
          <strong className="font-bold\">Update Error: </strong>
          <span className="block sm:inline">{updateError}</span>
        </div>
      )}

      {orders.length === 0 && !loading && !fetchError && (
         <div className="text-gray-500 text-center py-10">No orders found.</div>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border bg-white shadow-sm rounded-md">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 border text-left text-sm font-semibold text-gray-700">Order ID</th>
                <th className="p-3 border text-left text-sm font-semibold text-gray-700\">Customer</th>
                <th className="p-3 border text-left text-sm font-semibold text-gray-700\">Phone</th>
                <th className="p-3 border text-left text-sm font-semibold text-gray-700\">Order Date</th>
                <th className="p-3 border text-right text-sm font-semibold text-gray-700\">Total</th>
                <th className="p-3 border text-left text-sm font-semibold text-gray-700 min-w-[150px]">Status</th>
                <th className="p-3 border text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border text-xs text-gray-600">{order.id.substring(0,8)}...</td>
                  <td className="p-3 border text-sm text-gray-800">{order.shipping?.name || 'N/A'}</td>
                  <td className="p-3 border text-sm text-gray-600">{order.shipping?.phone || 'N/A'}</td>
                  <td className="p-3 border text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="p-3 border text-sm text-gray-800 text-right">₱{order.totalAmount.toFixed(2)}</td>
                  <td className="p-3 border text-sm">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      disabled={updatingStatusOrderId === order.id}
                      className={`border rounded px-2 py-1 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500
                        ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                          order.status === 'processing' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800 border-blue-300' : 
                          order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-300' : 
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-100 text-gray-800 border-gray-300'}
                      `}
                    >
                      {ORDER_STATUSES.map(statusOption => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>
                    {updatingStatusOrderId === order.id && <span className="text-xs ml-2">Updating...</span>}
                  </td>
                  <td className="p-3 border text-sm">
                    <button 
                      onClick={() => handleViewDetails(order)} 
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button onClick={closeDetailsModal} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-1">Order Information</h3>
                <p className="text-sm text-gray-600"><strong>ID:</strong> {selectedOrder.id}</p>
                <p className="text-sm text-gray-600"><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-600"><strong>Status:</strong> <span className={`font-medium ${selectedOrder.status === 'pending' ? 'text-yellow-600' : selectedOrder.status === 'shipped' ? 'text-blue-600' : selectedOrder.status === 'delivered' ? 'text-green-600' : selectedOrder.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'}`}>{selectedOrder.status}</span></p>
                <p className="text-sm text-gray-600 font-bold mt-1"><strong>Total: ₱{selectedOrder.totalAmount.toFixed(2)}</strong></p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-1">Shipping Details</h3>
                <p className="text-sm text-gray-600"><strong>Name:</strong> {selectedOrder.shipping.name}</p>
                <p className="text-sm text-gray-600"><strong>Phone:</strong> {selectedOrder.shipping.phone}</p>
                <p className="text-sm text-gray-600"><strong>Address:</strong> {selectedOrder.shipping.address}</p>
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-800 mb-2">Items Ordered</h3>
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Optional: Item Image - <th className="p-2 text-left font-medium text-gray-600">Image</th> */}
                    <th className="p-2 text-left font-medium text-gray-600">Product</th>
                    <th className="p-2 text-left font-medium text-gray-600">Size</th>
                    <th className="p-2 text-right font-medium text-gray-600">Price</th>
                    <th className="p-2 text-center font-medium text-gray-600">Qty</th>
                    <th className="p-2 text-right font-medium text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, index) => (
                    <tr key={item.id + index} className="border-t">
                      {/* Optional: Item Image placeholder
                      <td className="p-2">
                        {item.imageUrl ? 
                          <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded"/> : 
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs">NoImg</div>}
                      </td> 
                      */}
                      <td className="p-2 text-gray-700">{item.name}</td>
                      <td className="p-2 text-gray-700">{item.size}</td>
                      <td className="p-2 text-gray-700 text-right">₱{item.price.toFixed(2)}</td>
                      <td className="p-2 text-gray-700 text-center">{item.quantity}</td>
                      <td className="p-2 text-gray-700 text-right">₱{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-right">
              <button 
                onClick={closeDetailsModal} 
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
