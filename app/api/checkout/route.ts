import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod'; // Import z for inference
import { CheckoutSchema, ShippingSchema, CartItemSchema } from '@/schemas/checkoutSchema';

// Infer types from Zod schemas
type CartItem = z.infer<typeof CartItemSchema>;
type ShippingInfo = z.infer<typeof ShippingSchema>;

interface OrderPayload {
  shipping: ShippingInfo;
  items: CartItem[];
  created_at: string;
  status: string;
  total_amount: number;
  user_id?: string;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  let parsedRequestData;
  try {
    const body = await req.json();
    parsedRequestData = CheckoutSchema.safeParse(body);
    if (!parsedRequestData.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedRequestData.error.flatten().fieldErrors }, { status: 400 });
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  // Now shipping and cart will have types inferred from CheckoutSchema
  const { cart, shipping }: { cart: CartItem[], shipping: ShippingInfo } = parsedRequestData.data;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Supabase auth error:", authError);
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
  }

  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  let totalAmount = 0;
  for (const item of cart) { // No need to cast cart, it's already CartItem[]
    if (typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      console.error("Invalid item in cart (price/quantity not a number):", item);
      return NextResponse.json({ error: `Invalid item in cart: ${item.name}. Price or quantity is not a number.` }, { status: 400 });
    }
    // Ensure stock is a number if it's used in calculation (though not for totalAmount here)
    // if (typeof item.stock !== 'number') { ... }
    totalAmount += item.price * item.quantity;
  }

  for (const item of cart) {
    const { data: sizeRecord, error: stockError } = await supabase
      .from('sizes')
      .select('stock')
      .eq('product_id', item.id)
      .eq('size', item.size)
      .single();

    if (stockError || !sizeRecord) {
      console.error(`Stock validation error for ${item.name} (${item.size}):`, stockError);
      return NextResponse.json({ error: `Could not validate stock for ${item.name} (${item.size})` }, { status: 400 });
    }
    if (item.quantity > sizeRecord.stock) {
      return NextResponse.json({ error: `Not enough stock for ${item.name} (${item.size}). Only ${sizeRecord.stock} left.` }, { status: 400 });
    }
  }

  const orderPayload: OrderPayload = {
    shipping,
    items: cart,
    created_at: new Date().toISOString(),
    status: 'pending',
    total_amount: totalAmount,
  };

  if (user) {
    orderPayload.user_id = user.id;
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([orderPayload])
    .select()
    .single();

  if (orderError) {
    console.error("Supabase order insert error:", orderError);
    return NextResponse.json({ error: 'Failed to save order.', details: orderError.message }, { status: 500 });
  }

  for (const item of cart) {
    const { data: sizeData, error: sizeError } = await supabase
      .from('sizes')
      .select('stock')
      .eq('product_id', item.id)
      .eq('size', item.size)
      .single();

    if (!sizeError && sizeData) {
      const newStock = sizeData.stock - item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('sizes')
        .update({ stock: newStock })
        .eq('product_id', item.id)
        .eq('size', item.size);
      
      if (stockUpdateError) {
        console.error(`Failed to update stock for ${item.name} (${item.size}):`, stockUpdateError);
      }
    }
  }

  return NextResponse.json({ success: true, orderId: orderData?.id });
}
