"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { ReactNode, useEffect, useRef } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/hooks/useCart';

// This component is the key to solving the problem.
// It sits inside both AuthProvider and CartProvider, so it can use both hooks.
function AuthCartManager() {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const previousUserRef = useRef(user);

  useEffect(() => {
    // Check if the user has changed from a logged-in state to a logged-out state,
    // or from one user to another.
    if (previousUserRef.current && (!user || previousUserRef.current.id !== user.id)) {
      clearCart();
    }
    // Update the ref to the current user for the next render.
    previousUserRef.current = user;
  }, [user, clearCart]);

  return null; // This component does not render anything.
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <AuthCartManager />
      </CartProvider>
    </AuthProvider>
  );
} 