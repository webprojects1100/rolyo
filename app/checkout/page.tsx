"use client";
import { useCart } from "@/hooks/useCart";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const [shipping, setShipping] = useState({ 
    name: "", 
    address: "", 
    phone: "", 
    postalCode: "" 
  });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (authLoading) {
      setProfileLoading(true);
      return;
    }

    if (user) {
      setProfileLoading(true);
      supabase
        .from('profiles')
        .select('name, address, phone, postalCode')
        .eq('id', user.id)
        .single()
        .then(
          ({ data: profileData, error: profileError }) => {
            if (profileData) {
              setShipping(prev => ({
                ...prev,
                name: profileData.name || '',
                address: profileData.address || '',
                phone: profileData.phone || '',
                postalCode: profileData.postalCode || '',
              }));
            }
            if (profileError && profileError.code !== 'PGRST116') {
              console.error("Error fetching profile for checkout:", profileError);
            }
            setProfileLoading(false);
          },
          (error) => {
            console.error("Unhandled promise rejection:", error);
            setProfileLoading(false);
          }
        );
    } else {
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShipping({ ...shipping, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, shipping, user }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Order failed. Please try again.");
        setPlacingOrder(false);
        return;
      }
      setOrderSuccess(true);
      if (clearCart) clearCart();
      setPlacingOrder(false);
    } catch {
      setError("Order failed. Please try again.");
      setPlacingOrder(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Placed!</h1>
        <p className="mb-6">Thank you for your purchase. You will receive a confirmation soon.</p>
        <Link href="/shop" className="bg-black text-white px-6 py-2 rounded-xl">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Shipping Information</h2>
          {user && (
            <Link href="/account" className="text-sm text-indigo-600 hover:underline">
              Edit Info
            </Link>
          )}
        </div>
        {profileLoading || authLoading ? (
          <div>Loading shipping information...</div>
        ) : (
          <div className="flex flex-col gap-3">
            <input name="name" value={shipping.name} onChange={handleInput} placeholder="Full Name" className="border rounded px-3 py-2" required />
            <input name="address" value={shipping.address} onChange={handleInput} placeholder="Address" className="border rounded px-3 py-2" required />
            <input name="postalCode" value={shipping.postalCode} onChange={handleInput} placeholder="Postal Code" className="border rounded px-3 py-2" required />
            <input name="phone" value={shipping.phone} onChange={handleInput} placeholder="Phone Number" className="border rounded px-3 py-2" required />
          </div>
        )}
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
        {cart.length === 0 ? (
          <div>Your cart is empty.</div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.variantId} className="flex items-center gap-4 border-b pb-2">
                <Image src={item.imageUrl} alt={item.name} width={60} height={60} className="rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-500">Size: {item.size}</div>
                  <div className="text-sm">Qty: {item.quantity}</div>
                </div>
                <div className="font-semibold">₱{item.price * item.quantity}</div>
              </div>
            ))}
            <div className="flex justify-between items-center mt-4">
              <div className="text-xl font-bold">Total: ₱{total}</div>
            </div>
          </div>
        )}
      </div>
      <button
        className="bg-black text-white px-6 py-2 rounded-xl w-full disabled:opacity-60"
        onClick={handlePlaceOrder}
        disabled={profileLoading || authLoading || placingOrder || cart.length === 0 || !shipping.name || !shipping.address || !shipping.phone || !shipping.postalCode}
      >
        {placingOrder ? "Placing Order..." : "Place Order"}
      </button>
    </div>
  );
}
