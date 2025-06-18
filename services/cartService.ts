import { supabase } from '@/lib/supabase';
import { CartItem } from '@/hooks/useCart';

export class CartService {
  // We don't need getCartId anymore since cart_items directly uses user_id
  // The cart table in the schema doesn't match what this service expected

  static async getCart(userId: string): Promise<CartItem[]> {
    try {
      console.log(`[CartService] Getting cart items for user: ${userId}`);
      
      // First just get the cart items
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);

      console.log(`[CartService] Cart items fetch result:`, data?.length || 0, error);

      if (error) {
        console.error('[CartService] Error fetching cart items:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Now get details for each variant
      const cartItems: CartItem[] = [];
      
      for (const item of data) {
        // Get variant details
        const { data: variantData, error: variantError } = await supabase
          .from('product_variants')
          .select(`
            id,
            product_id,
            size,
            color,
            stock,
            image_url
          `)
          .eq('id', item.variant_id)
          .single();
          
        if (variantError || !variantData) {
          console.error(`[CartService] Error fetching variant details for ${item.variant_id}:`, variantError);
          continue;
        }
        
        // Get product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('id', variantData.product_id)
          .single();
          
        if (productError || !productData) {
          console.error(`[CartService] Error fetching product details for ${variantData.product_id}:`, productError);
          continue;
        }
        
        // Add to cart items
        cartItems.push({
          variantId: item.variant_id,
          productId: productData.id,
          name: productData.name,
          price: productData.price,
          imageUrl: variantData.image_url || '',
          size: variantData.size,
          color: variantData.color,
          quantity: item.quantity,
          stock: variantData.stock
        });
      }
      
      return cartItems;
    } catch (error) {
      console.error('[CartService] Unexpected error in getCart:', error);
      return [];
    }
  }

  static async syncCart(userId: string, items: CartItem[]): Promise<void> {
    try {
      console.log(`[CartService] Syncing cart for user: ${userId}, items: ${items.length}`);
      
      // Clear existing items using user_id
      console.log(`[CartService] Clearing existing cart items for user: ${userId}`);
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('[CartService] Error deleting cart items:', deleteError);
        throw deleteError;
      }

      if (items.length === 0) return;

      // Insert new items with only the fields that exist in the database
      console.log(`[CartService] Inserting ${items.length} cart items`);
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(
          items.map(item => ({
            user_id: userId,
            variant_id: item.variantId,
            quantity: item.quantity
          }))
        );

      console.log(`[CartService] Cart insert result:`, insertError ? 'Error' : 'Success');

      if (insertError) {
        console.error('[CartService] Error syncing cart:', insertError);
        throw insertError;
      }
    } catch (error) {
      console.error('[CartService] Unexpected error in syncCart:', error);
      throw error;
    }
  }
}
