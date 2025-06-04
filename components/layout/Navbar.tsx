"use client";

import Link from 'next/link';
import { ShoppingBag, User, LogOut, X, Menu, Store } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCart } from "@/hooks/useCart";
import { supabase } from '@/lib/supabase';
// import { isAdmin } from '@/lib/utils'; // isAdmin check will move to account page

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  // const [profileMenu, setProfileMenu] = useState(false); // Removed
  // const [isAdminUser, setIsAdminUser] = useState(false); // Removed, will be checked on account page
  const { cart } = useCart();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await supabase.auth.signOut();
        setUser(null);
        setIsMenuOpen(false); // Close menu on logout
        window.location.href = '/account';
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 bg-white shadow-md z-50 py-4 px-6">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center font-bold text-xl md:text-2xl" onClick={closeMenu}>
            <Image
              src="/images/brand-logo.png"
              alt="Brand Logo"
              width={180}
              height={180}
              className="mr-2 object-contain"
              priority
            />
          </Link>
        </div>

        {/* Desktop Menu Links - Centered (or more to the left of icons) */}
        <div className="hidden md:flex items-center space-x-8">
          {/* <Link href="/shop" className="nav-link" aria-label="Shop">
            <Store className="h-6 w-6" />
          </Link> // Shop link moved */}
          {/* Add other desktop links here if needed */}
        </div>

        {/* Icons and Hamburger for Desktop/Mobile */}
        <div className="flex items-center space-x-4">
          <Link href="/shop" className="hidden md:block hover:text-gray-600 transition-colors focus:outline-none nav-link" aria-label="Shop">
            <Store className="h-6 w-6" />
          </Link>
          <Link href="/account" className="hidden md:block hover:text-gray-600 transition-colors focus:outline-none" aria-label={user ? 'Open account page' : 'Sign in'}>
            <User className="h-6 w-6" />
          </Link>
          <Link href="/cart" className="hidden md:block hover:text-gray-600 transition-colors relative">
            <ShoppingBag className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-black text-white text-xs rounded-full">{cartCount}</span>
            )}
          </Link>
          {user && (
            <button
              onClick={handleLogout}
              className="hidden md:block hover:text-gray-600 transition-colors focus:outline-none"
              aria-label="Logout"
            >
              <LogOut className="h-6 w-6" />
            </button>
          )}
          {/* Hamburger Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Full width dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg z-40 flex flex-col items-start p-4 space-y-3">
          <Link href="/shop" className="block w-full text-gray-700 hover:bg-gray-100 p-2 rounded" onClick={closeMenu}>
            Shop
          </Link>
          <Link href="/account" className="block w-full text-gray-700 hover:bg-gray-100 p-2 rounded" onClick={closeMenu}>
            {user ? 'Account' : 'Sign In / Sign Up'}
          </Link>
          <Link href="/cart" className="block w-full text-gray-700 hover:bg-gray-100 p-2 rounded relative" onClick={closeMenu}>
            Cart
            {cartCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-black text-white text-xs rounded-full">{/* Adjusted margin if needed if icons were to the left */}
                {cartCount}
              </span>
            )}
          </Link>
          {user && (
            <button
              onClick={handleLogout} 
              className="block w-full text-left text-red-600 hover:bg-gray-100 p-2 rounded"
            >
              Logout
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .nav-link {
          position: relative;
          display: inline-block;
          padding-bottom: 4px;
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
