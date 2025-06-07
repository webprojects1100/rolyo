"use client";

import Link from 'next/link';
import { ShoppingBag, User, LogOut, Store } from 'lucide-react';
import Image from 'next/image';
import { useCart } from "@/hooks/useCart";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
// import { isAdmin } from '@/lib/utils'; // isAdmin check will move to account page

export default function Navbar() {
  const { user } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await supabase.auth.signOut();
        window.location.href = '/account';
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
  };

  // Define logo component for reuse
  const Logo = () => (
    <Link href="/" className="flex items-center font-bold text-xl md:text-2xl">
      <Image
        src="/images/brand-logo.png"
        alt="Brand Logo"
        width={180}
        height={180}
        className="mr-2 object-contain"
        priority
      />
    </Link>
  );

  // Define desktop icons component for reuse
  const DesktopIcons = () => (
    <div className="flex items-center justify-center space-x-5 md:space-x-6">
      <Link href="/shop" className="hover:text-gray-600 transition-colors focus:outline-none nav-link" aria-label="Shop">
        <Store className="h-6 w-6" />
      </Link>
      <Link href="/account" className="hover:text-gray-600 transition-colors focus:outline-none" aria-label={user ? 'Open account page' : 'Sign in'}>
        <User className="h-6 w-6" />
      </Link>
      <Link href="/cart" className="hover:text-gray-600 transition-colors relative">
        <ShoppingBag className="h-6 w-6" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-black text-white text-xs rounded-full">{cartCount}</span>
        )}
      </Link>
      {user && (
        <button
          onClick={handleLogout}
          className="hover:text-gray-600 transition-colors focus:outline-none"
          aria-label="Logout"
        >
          <LogOut className="h-6 w-6" />
        </button>
      )}
    </div>
  );

  return (
    <nav className="sticky top-0 bg-white shadow-md z-50 py-4">
      {/* Header (logo centered, icons below and centered) */}
      <div className="flex flex-col items-center container mx-auto px-6">
        <div className="flex justify-center w-full mb-3"> {/* Increased bottom margin slightly */} 
          <Logo />
        </div>
        <DesktopIcons />
      </div>

      <style jsx>{`
        .nav-link {
          position: relative;
          display: inline-block;
          padding-bottom: 4px; /* For the underline effect */
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background-color: currentColor;
          transition: width 0.3s ease;
        }
        .nav-link:hover::after {
          width: 100%;
        }
      `}</style>
    </nav>
  );
}
