"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// Using Supabase client directly for auth
import { supabase } from '@/lib/supabase';
import { CartService } from '@/services/cartService';

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  isLoading: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUserId(session?.user?.id || null);
    });

    // Set initial user
    const getInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getInitialUser();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Load cart from localStorage or database
  useEffect(() => {
    let didCancel = false;
    const loadCart = async () => {
      setIsLoading(true);
      try {
        if (userId) {
          // Load from database if user is logged in
          const dbCart = await CartService.getCart(userId);
          if (!didCancel) {
            setCart(dbCart);
            // Save to localStorage for offline access
            localStorage.setItem("cart", JSON.stringify(dbCart));
          }
        } else {
          // Load from localStorage if not logged in
          const stored = localStorage.getItem("cart");
          if (stored && !didCancel) {
            setCart(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        // Fallback to localStorage if database fails
        const stored = localStorage.getItem("cart");
        if (stored && !didCancel) {
          setCart(JSON.parse(stored));
        }
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    };
    loadCart();
    return () => { didCancel = true; };
  }, [userId]);

  // Save cart to localStorage and database
  const saveCart = async (newCart: CartItem[]) => {
    // Always save to localStorage for immediate UI update
    localStorage.setItem("cart", JSON.stringify(newCart));
    // Save to database if user is logged in
    if (userId) {
      try {
        await CartService.syncCart(userId, newCart);
      } catch (error) {
        console.error('Error saving cart:', error);
        throw error;
      }
    }
  };

  const addToCart = async (itemToAdd: CartItem) => {
    const newCart = [...cart];
    const existingIndex = newCart.findIndex(i => i.variantId === itemToAdd.variantId);
    if (existingIndex >= 0) {
      // Update existing item
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: newCart[existingIndex].quantity + itemToAdd.quantity
      };
    } else {
      // Add new item
      newCart.push(itemToAdd);
    }
    setCart(newCart);
    await saveCart(newCart);
  };

  const removeFromCart = async (variantId: string) => {
    const newCart = cart.filter(item => item.variantId !== variantId);
    setCart(newCart);
    await saveCart(newCart);
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    const newCart = cart
      .map(item => 
        item.variantId === variantId 
          ? { ...item, quantity: Math.max(0, quantity) } 
          : item
      )
      .filter(item => item.quantity > 0);
    setCart(newCart);
    await saveCart(newCart);
  };

  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem("cart");
    if (userId) {
      try {
        await CartService.syncCart(userId, []);
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
