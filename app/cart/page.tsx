"use client";
import { useCart } from "@/hooks/useCart";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, totalItems, isLoading } = useCart();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 min-h-[70vh] flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading your cart...</div>
      </div>
    );
  }

  // The handler now only needs the variantId
  const handleRemove = (variantId: string) => {
    removeFromCart(variantId);
  };

  // The handler now only needs the variantId and new quantity
  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    const item = cart.find(i => i.variantId === variantId);
    if (!item) return;

    // Clamp the quantity between 1 and the available stock
    const quantity = Math.max(1, Math.min(newQuantity, item.stock));
    updateQuantity(variantId, quantity);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 min-h-[70vh]">
      <h1 className="text-2xl font-bold mb-6">Your Cart ({totalItems} items)</h1>
      {cart.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>Your cart is empty.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {cart.map((item) => (
            <div key={item.variantId} className="flex items-center gap-4 border-b pb-4">
              <Link href={`/product/${item.productId}`}>
                <Image src={item.imageUrl} alt={item.name} width={80} height={80} className="rounded object-cover" />
              </Link>
              <div className="flex-1">
                <Link href={`/product/${item.productId}`} className="font-semibold hover:underline">{item.name}</Link>
                <div className="text-sm text-gray-500">Color: {item.color}</div>
                <div className="text-sm text-gray-500">Size: {item.size}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => handleQuantityChange(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} className="border px-2 rounded">-</button>
                  <span className="w-10 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.variantId, item.quantity + 1)}
                    className="border px-2 rounded"
                    disabled={item.quantity >= item.stock}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</div>
              <button
                onClick={() => handleRemove(item.variantId)}
                className="text-red-500 hover:text-red-700 ml-4 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center mt-8">
            <div className="text-xl font-bold">Total: ₱{total.toFixed(2)}</div>
            <Link href="/checkout" className="bg-black text-white px-6 py-2 rounded-xl hover:bg-gray-800 transition-colors">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
