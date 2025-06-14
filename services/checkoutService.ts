import { supabase } from '../lib/supabase';
import { CartItem } from '@/hooks/useCart';


export class CheckoutService {
  async createOrder(checkoutData: { user: { id: string }, cart: CartItem[] }) {
    const totalAmount = this.calculateTotalAmount(checkoutData.cart);

    try {
      // 1. Create the order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: checkoutData.user.id,
          status: 'pending',
          shipping_address: {},
          billing_address: {},
          total_amount: totalAmount,
          payment_method: 'pending',
          payment_status: 'pending'
        })
        .select('*')
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error('Failed to create order');

      // 2. Prepare order items
      const orderItems = checkoutData.cart.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color_name: item.color,
        image_url: item.imageUrl
      }));

      // 3. Insert order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. Return the complete order with items
      const { data: completeOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', order.id)
        .single();

      if (fetchError) throw fetchError;

      return completeOrder;
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw new Error('Failed to process your order. Please try again.');
    }
  }

  private calculateTotalAmount(cart: CartItem[]) {
    return cart.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  async getOrder(orderId: string) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            product_variants (
              *,
              product_colors(*)
            )
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error('Failed to fetch order. Please try again.');
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    return data;
  }

  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            product_variants (
              *,
              product_colors(*)
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch your orders. Please try again.');
    }

    return data || [];
  }
}
