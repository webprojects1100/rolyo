"use client";
import { useCart } from "@/hooks/useCart";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const [stockMessage, setStockMessage] = useState<string | null>(null);

  const handleRemove = (id: string, size: string) => {
    if (removeFromCart) removeFromCart(id, size);
  };

  const handleQuantity = (id: string, size: string, quantity: number) => {
    const item = cart.find(i => i.id === id && i.size === size);
    if (!item) return;
    if (quantity > (item.stock ?? Infinity)) {
      setStockMessage(`Only ${item.stock} item${item.stock === 1 ? '' : 's'} available in stock. Quantity updated to maximum available.`);
      setTimeout(() => setStockMessage(null), 2500);
      return;
    }
    if (updateQuantity) updateQuantity(id, size, quantity);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      {stockMessage && (
        <div className="mb-4 text-center text-sm bg-yellow-100 text-yellow-800 px-4 py-2 rounded">
          {stockMessage}
        </div>
      )}
      {cart.length === 0 ? (
        <div className="text-center text-gray-500">Your cart is empty.</div>
      ) : (
        <div className="space-y-6">
          {cart.map((item) => (
            <div key={item.id + item.size} className="flex items-center gap-4 border-b pb-4">
              <Image src={item.imageUrl} alt={item.name} width={80} height={80} className="rounded object-cover" />
              <div className="flex-1">
                <div className="font-semibold">{item.name}</div>
                <div className="text-sm text-gray-500">Size: {item.size}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => handleQuantity(item.id, item.size, item.quantity - 1)} disabled={item.quantity <= 1} className="border px-2 rounded">-</button>
                  <input
                    type="number"
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={e => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val)) val = 1;
                      if (val < 1) val = 1;
                      if (val > item.stock) val = item.stock;
                      handleQuantity(item.id, item.size, val);
                    }}
                    className="w-14 text-center border rounded"
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <button
                    onClick={() => handleQuantity(item.id, item.size, item.quantity + 1)}
                    className="border px-2 rounded"
                    disabled={item.quantity >= item.stock}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="font-semibold">₱{item.price * item.quantity}</div>
              <button
                onClick={() => handleRemove(item.id, item.size)}
                className="text-red-500 ml-4"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center mt-8">
            <div className="text-xl font-bold">Total: ₱{total}</div>
            <Link href="/checkout" className="bg-black text-white px-6 py-2 rounded-xl">Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
