import { supabase } from '@/lib/supabase';
import { CartItem } from '@/hooks/useCart';

export class CartService {
  private static async getCartId(userId: string): Promise<string> {
    // Get or create a cart for the user
    const { data, error } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Create a new cart if none exists
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;
      return newCart.id;
    }

    return data.id;
  }

  static async getCart(userId: string): Promise<CartItem[]> {
    const cartId = await this.getCartId(userId);
    
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId);

    if (error) {
      console.error('Error fetching cart:', error);
      return [];
    }

    if (!data) return [];

    return data.map(item => ({
      variantId: item.variant_id,
      productId: item.product_id,
      name: item.name,
      price: item.price,
      imageUrl: item.image_url,
      size: item.size,
      color: item.color_name,
      quantity: item.quantity,
      stock: item.stock || 0
    }));
  }

  static async syncCart(userId: string, items: CartItem[]): Promise<void> {
    const cartId = await this.getCartId(userId);
    
    // Clear existing items
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    if (items.length === 0) return;

    // Insert new items
    const { error } = await supabase
      .from('cart_items')
      .insert(
        items.map(item => ({
          cart_id: cartId,
          variant_id: item.variantId,
          product_id: item.productId,
          name: item.name,
          price: item.price,
          image_url: item.imageUrl,
          size: item.size,
          color_name: item.color,
          quantity: item.quantity,
          stock: item.stock
        }))
      );

    if (error) {
      console.error('Error syncing cart:', error);
      throw error;
    }
  }
}
