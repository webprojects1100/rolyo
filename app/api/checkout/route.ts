import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CheckoutSchema } from '@/schemas/checkoutSchema';

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const body = await req.json();
    parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  const { cart, shipping } = parsed.data;

  // Validate stock for each item
  for (const item of cart) {
    const { data, error } = await supabase
      .from('sizes')
      .select('stock')
      .eq('product_id', item.id)
      .eq('size', item.size)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: `Could not validate stock for ${item.name} (${item.size})` }, { status: 400 });
    }
    if (item.quantity > data.stock) {
      return NextResponse.json({ error: `Not enough stock for ${item.name} (${item.size}). Only ${data.stock} left.` }, { status: 400 });
    }
  }

  // Insert the order into the 'orders' table. The table must have columns: shipping (jsonb), items (jsonb), created_at (timestamp), status (text)
  const { error: orderError } = await supabase.from('orders').insert([
    {
      shipping,
      items: cart,
      created_at: new Date().toISOString(),
      status: 'pending',
    },
  ]);
  if (orderError) {
    return NextResponse.json({ error: 'Failed to save order.' }, { status: 500 });
  }

  // Optionally, update stock in 'sizes' table (decrement by quantity ordered)
  for (const item of cart) {
    const { data: sizeData, error: sizeError } = await supabase
      .from('sizes')
      .select('stock')
      .eq('product_id', item.id)
      .eq('size', item.size)
      .single();

    if (!sizeError && sizeData) {
      const newStock = sizeData.stock - item.quantity;
      await supabase
        .from('sizes')
        .update({ stock: newStock })
        .eq('product_id', item.id)
        .eq('size', item.size);
    }
  }

  return NextResponse.json({ success: true });
}
