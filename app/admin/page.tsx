"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";
import { ShoppingBag, ListOrdered } from 'lucide-react'; // Removed Users icon for now

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAndFetchUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.email || user.id); // Use email or ID as a fallback name
        if (await isAdmin(user.id)) {
          setAdmin(true);
        } else {
          setAdmin(false);
        }
      } else {
        setAdmin(false);
        setUserName(null);
      }
      setLoading(false);
    };
    checkAdminAndFetchUser();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="text-center p-10">
        <p className="text-lg text-gray-600">Loading Admin Dashboard...</p>
        {/* Optional: Add a spinner here */}
      </div>
    </div>
  );
  
  if (!admin) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="text-center p-10 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700">You do not have permission to view this page.</p>
        <Link href="/" className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors">
          Go to Homepage
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Admin Dashboard
        </h1>
        {userName && (
          <p className="mt-4 text-xl text-gray-600">
            Welcome, <span className="font-semibold">{userName}</span>!
          </p>
        )}
        <p className="mt-2 text-md text-gray-500">
          Manage your store products, orders, and other settings from here.
        </p>
      </header>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Manage Products Card */}
        <Link href="/admin/products" className="group block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-lg mb-4 group-hover:bg-indigo-600 transition-colors">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">Manage Products</h2>
          <p className="text-sm text-gray-600">View, add, edit, or delete products in your store.</p>
        </Link>

        {/* Manage Orders Card */}
        <Link href="/admin/orders" className="group block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
          <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mb-4 group-hover:bg-green-600 transition-colors">
            <ListOrdered className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">Manage Orders</h2>
          <p className="text-sm text-gray-600">View and process customer orders, update statuses.</p>
        </Link>

        {/* Placeholder for Future: Manage Users/Admins */}
        {/* 
        <Link href="#" className="group block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 opacity-50 cursor-not-allowed">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mb-4">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Manage Users</h2>
          <p className="text-sm text-gray-600">(Coming Soon) View and manage user accounts and admin roles.</p>
        </Link>
        */}
      </div>
    </div>
  );
} 