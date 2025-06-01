"use client";

import Link from 'next/link';
import { ShoppingBag, User, LogOut } from 'lucide-react';
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
    // Simplified useEffect: just get user state
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
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
        // setProfileMenu(false); // Removed
        window.location.href = '/account'; // Redirect to account page (which will show login)
      } catch (error) {
        console.error("Error during logout:", error);
        // Optionally, display an error to the user if logout fails
      }
    }
  };

  // Removed handleProfileMenuToggle and useEffect for closing menu

  return (
    <nav className="sticky top-0 bg-white shadow-md z-50 py-4 px-6 flex items-center">
      <div className="flex items-center flex-shrink-0 space-x-8">
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
        <div className="hidden md:flex space-x-8 justify-center items-center flex-grow">
          <Link href="/shop" className="nav-link">
            Shop
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-4 flex-shrink-0 ml-auto">
        {/* User icon now links directly to /account */}
        <Link href="/account" className="hover:text-gray-600 transition-colors focus:outline-none" aria-label={user ? 'Open account page' : 'Sign in'}>
          <User className="h-6 w-6" />
        </Link>
        
        {/* Removed profileMenu dropdown */}

        <Link href="/cart" className="hover:text-gray-600 transition-colors relative">
          <ShoppingBag className="h-6 w-6" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 bg-black text-white text-xs rounded-full">{cartCount}</span>
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

      {/* Hamburger Menu */}
      <div className="md:hidden flex items-center ml-auto">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md z-40 flex flex-col items-center space-y-4 py-4">
          {/* Removed Collection/Shop link */}
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