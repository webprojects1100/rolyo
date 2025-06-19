import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod'; // Import z for inference
import { CheckoutSchema, ShippingSchema, CartItemSchema } from '@/schemas/checkoutSchema';

// Infer types from Zod schemas
type CartItem = z.infer<typeof CartItemSchema>;
type ShippingInfo = z.infer<typeof ShippingSchema>;

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
  const { cart, shipping, user }: { cart: CartItem[], shipping: ShippingInfo, user: { id: string } } = parsedRequestData.data;

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to place an order.' }, { status: 401 });
  }

  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  for (const item of cart) {
    if (typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      console.error("Invalid item in cart (price/quantity not a number):", item);
      return NextResponse.json({ error: `Invalid item in cart: ${item.name}. Price or quantity is not a number.` }, { status: 400 });
    }
    // Ensure stock is a number if it's used in calculation (though not for totalAmount here)
    // if (typeof item.stock !== 'number') { ... }
    // You can calculate total here if needed in the future
  }

  for (const item of cart) {
    const variantIdentifier = item.variantId ?? item.id!;
    // Validate stock using unique variant identifier
    console.log(`Checking stock for variant ID: ${variantIdentifier}`);
    const { data: variantRecord, error: stockError } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', variantIdentifier)
      .maybeSingle();

    if (stockError) {
      console.error(`Stock validation error for ${item.name} (${item.size}, Variant: ${variantIdentifier}):`, stockError);
      if (stockError.code === 'PGRST116') {
        console.error(`No product variant found with ID: ${variantIdentifier}`);
        return NextResponse.json({ error: `Product variant not found for ${item.name} (${item.size})` }, { status: 400 });
      }
      return NextResponse.json({ error: `Could not validate stock for ${item.name} (${item.size})` }, { status: 400 });
    }
    if (!variantRecord) {
      console.error(`No stock information found for variant: ${variantIdentifier}`);
      return NextResponse.json({ error: `No stock information for ${item.name} (${item.size})` }, { status: 400 });
    }

    if (item.quantity > variantRecord.stock) {
      return NextResponse.json({ error: `Not enough stock for ${item.name} (${item.size}). Only ${variantRecord.stock} left.` }, { status: 400 });
    }
  }

  // FIX: Match the orders table schema (shipping, items as JSONB)
  const orderPayload = {
    shipping, // as JSONB
    items: cart, // as JSONB
    created_at: new Date().toISOString(),
    status: 'pending',
    // Optionally add user_id if you add it to your schema
    // user_id: user.id,
    // Optionally add total_amount if you add it to your schema
    // total_amount: totalAmount,
  };

  console.log("Inserting order with payload:", JSON.stringify(orderPayload));
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([orderPayload])
    .select()
    .maybeSingle();

  // Variable to store the order ID, either from the initial response or fallback query
  let finalOrderId = orderData?.id;

  if (orderError) {
    console.error("Supabase order insert error:", orderError);
    if (orderError.code === 'PGRST116') {
      console.error("Order was created but no data was returned. This may be due to RLS policies.");
      // Attempt to retrieve the created order ID through a separate query
      const { data: fallbackOrderData, error: fallbackError } = await supabase
        .from('orders')
        .select('id')
        .eq('created_at', orderPayload.created_at)
        .maybeSingle();

      if (fallbackError) {
        console.error("Fallback query error:", fallbackError);
        return NextResponse.json({ error: "Order creation failed and fallback query also failed." }, { status: 500 });
      }

      finalOrderId = fallbackOrderData?.id;
      if (!finalOrderId) {
        console.error("Fallback query did not return an order ID.");
        return NextResponse.json({ error: "Order creation failed and no order ID was found." }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Failed to save order.', details: orderError.message }, { status: 500 });
    }
  }

  for (const item of cart) {
    const variantIdentifier = item.variantId ?? item.id!;
    const { data: variantRecord, error: fetchError } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', variantIdentifier)
      .single();

    if (!fetchError && variantRecord) {
      const newStock = variantRecord.stock - item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('product_variants')
        .update({ stock: newStock })
        .eq('id', variantIdentifier);
      
      if (stockUpdateError) {
        // Log the error but don't fail the entire order, as the payment has already been processed.
        // This should be handled by a reconciliation process.
        console.error(`Failed to update stock for ${item.name} (${item.size}, Variant: ${variantIdentifier}):`, stockUpdateError);
      }
    }
  }

  return NextResponse.json({ success: true, orderId: finalOrderId });
}
