"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/utils';
import { ClipboardList, Package, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && await isAdmin(user.id)) {
        setAdmin(true);
      } else {
        setAdmin(false);
        router.push('/'); // Redirect non-admins to homepage
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!admin) {
    // This will be shown briefly before the redirect happens
    return <div className="flex justify-center items-center min-h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Link href="/admin/products" className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-4">
            <Package className="w-8 h-8 text-gray-500" />
            <h5 className="text-2xl font-bold tracking-tight text-gray-900">Manage Products</h5>
          </div>
          <p className="font-normal text-gray-700 mt-2">Create, view, and manage your product inventory and variants.</p>
        </Link>
        
        <Link href="/admin/orders" className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-4">
            <ClipboardList className="w-8 h-8 text-gray-500" />
            <h5 className="text-2xl font-bold tracking-tight text-gray-900">View Orders</h5>
          </div>
          <p className="font-normal text-gray-700 mt-2">Browse and review all customer orders and their details.</p>
        </Link>
        
        {/* Placeholder for a future feature */}
        <div className="block p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm cursor-not-allowed opacity-60">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-gray-400" />
            <h5 className="text-2xl font-bold tracking-tight text-gray-600">Manage Users</h5>
          </div>
          <p className="font-normal text-gray-500 mt-2">(Coming Soon) View and manage customer accounts and roles.</p>
        </div>

      </div>
    </div>
  );
} 
