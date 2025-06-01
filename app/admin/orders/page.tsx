"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && await isAdmin(user.id)) {
        setAdmin(true);
      } else {
        setAdmin(false);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) return <div className="max-w-2xl mx-auto py-10 text-center">Loading...</div>;
  if (!admin) return <div className="max-w-2xl mx-auto py-10 text-center text-red-600 font-bold">Access Denied: Admins Only</div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin: Manage Orders</h1>
      {/* Order management UI will go here */}
      <div className="text-gray-500">Order management coming soon...</div>
    </div>
  );
}
