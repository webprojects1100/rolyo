"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { isAdmin } from "@/lib/utils";
import Link from 'next/link';

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<{ id: string; created_at: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupData, setSignupData] = useState({ email: '', password: '' });
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Updated state for more detailed profile data
  const [profile, setProfile] = useState<{
    name: string | null;
    address: string | null;
    phone: string | null;
    postalCode: string | null;
  }>({ 
    name: null,
    address: null,
    phone: null,
    postalCode: null
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    async function fetchUserAndProfileData() {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) {
        // Check if user is admin
        const adminStatus = await isAdmin(authUser.id);
        setIsAdminUser(adminStatus);

        // Fetch profile data with new fields
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('name, address, phone, postalCode')
          .eq('id', authUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
        if (profileFetchError && profileFetchError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine
          console.error('Error fetching profile:', profileFetchError);
          // Check if profileFetchError has a message property before accessing it
          const errorMessage = typeof profileFetchError === 'object' && profileFetchError !== null && 'message' in profileFetchError 
            ? (profileFetchError as { message: string }).message 
            : 'Could not load profile data due to an unexpected error.';
          setProfileError(errorMessage);
        }

        // Fetch orders for this user
        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, created_at, status") // Specify columns
          .eq('user_id', authUser.id) // Assuming you have a user_id column in orders
          .order("created_at", { ascending: false });
        setOrders(ordersData || []);
      }
      setLoading(false);
    }
    fetchUserAndProfileData();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    if (!user || !user.id) { // Guard against missing user or user.id
      setProfileError("User not available. Cannot update profile.");
      setProfileLoading(false);
      return;
    }
    console.log("Attempting to update profile for user ID:", user.id);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        postalCode: profile.postalCode
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      setProfileError(updateError.message);
    } else {
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false); 
    }
    setProfileLoading(false);
  };

  if (loading) return <div className="max-w-2xl mx-auto py-10 text-center">Loading...</div>;
  if (!user) return (
    <div className="max-w-2xl mx-auto py-10 text-center">
      {showSignup ? (
        <>
          <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
          <form
            className="max-w-sm mx-auto flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSignupError('');
              const result = signupSchema.safeParse({ email: signupData.email, password: signupData.password });
              if (!result.success) {
                setSignupError(result.error.errors[0].message);
                return;
              }
              setSignupLoading(true);
              const { email, password } = signupData;
              const { error, data } = await supabase.auth.signUp({ email, password });
              if (error) {
                setSignupError(error.message);
                setSignupLoading(false);
                return;
              }
              // Optionally, store extra fields in a 'profiles' table
              if (data.user) {
                // Provide default empty strings for NOT NULL fields
                try {
                  const { error: profileUpsertError } = await supabase.from('profiles').upsert({
                    id: data.user.id,
                    name: ' ', // Or some other placeholder like 'New User'
                    address: ' ',
                    phone: ' ',
                    "postalCode": ' ' // Ensure this matches your DB column name if it's quoted
                  });

                  if (profileUpsertError) {
                    console.error("Error upserting profile during signup:", profileUpsertError);
                    // Optionally, set a signup error to inform the user, though this might be too technical
                    // setSignupError("Could not create user profile. Please contact support.");
                  } else {
                    console.log("Profile upserted successfully for new user:", data.user.id);
                  }
                } catch (e) {
                  console.error("Exception during profile upsert in signup:", e);
                }
              }
              setSignupLoading(false);
              setShowSignup(false);
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={signupData.email}
              onChange={e => setSignupData({ ...signupData, email: e.target.value })}
              className="border rounded px-3 py-2 w-full"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={signupData.password}
              onChange={e => setSignupData({ ...signupData, password: e.target.value })}
              className="border rounded px-3 py-2 w-full"
              required
            />
            {signupError && <div className="text-red-600 text-sm">{signupError}</div>}
            <button
              type="submit"
              className="bg-black text-white rounded px-4 py-2 font-semibold hover:bg-gray-800 transition"
              disabled={signupLoading}
            >
              {signupLoading ? 'Signing up...' : 'Sign Up'}
            </button>
            <button
              type="button"
              className="text-sm text-gray-600 mt-2 underline"
              onClick={() => setShowSignup(false)}
            >
              Already have an account? Sign In
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4">Sign In</h2>
          <form
            className="max-w-sm mx-auto flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setLoadingLogin(true);
              try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                  setError(error.message);
                } else {
                  window.location.reload(); // Reload to update user state
                }
              } catch (err) {
                setError('An unexpected error occurred.');
                console.error(err);
              } finally {
                setLoadingLogin(false);
              }
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              required
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="bg-black text-white rounded px-4 py-2 font-semibold hover:bg-gray-800 transition"
              disabled={loadingLogin}
            >
              {loadingLogin ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              className="text-sm text-gray-600 mt-2 underline"
              onClick={() => setShowSignup(true)}
            >
              Don&apos;t have an account? Sign Up
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>
      
      {/* Admin Dashboard Link (conditionally rendered) */}
      {isAdminUser && (
        <div className="mb-6">
          <Link 
            href="/admin/products" 
            className="inline-block bg-blue-600 text-white rounded px-6 py-3 font-semibold hover:bg-blue-700 transition shadow-md"
          >
            Go to Admin Dashboard
          </Link>
        </div>
      )}

      {/* Profile Info & Edit Form */}
      <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
          {!isEditingProfile && (
            <button
              onClick={() => {
                setIsEditingProfile(true);
                setProfileError('');
                setProfileSuccess('');
              }}
              className="bg-gray-200 text-gray-700 rounded px-4 py-2 font-medium hover:bg-gray-300 transition text-sm"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                id="profileName"
                placeholder="Your Full Name"
                value={profile.name || ''} 
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="border rounded px-3 py-2 w-full focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="profileAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input 
                type="text"
                id="profileAddress"
                placeholder="Street Address, P.O. Box, etc."
                value={profile.address || ''} 
                onChange={(e) => setProfile({...profile, address: e.target.value})}
                className="border rounded px-3 py-2 w-full focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="profilePostalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input 
                type="text" 
                id="profilePostalCode"
                placeholder="Your Postal Code"
                value={profile.postalCode || ''} 
                onChange={(e) => setProfile({...profile, postalCode: e.target.value})}
                className="border rounded px-3 py-2 w-full focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="profilePhone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input 
                type="text" 
                id="profilePhone"
                placeholder="Your Phone Number"
                value={profile.phone || ''} 
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                className="border rounded px-3 py-2 w-full focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            {profileError && <div className="text-red-600 text-sm">{profileError}</div>}
            {profileSuccess && <div className="text-green-600 text-sm">{profileSuccess}</div>}
            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                className="bg-black text-white rounded px-6 py-2 font-semibold hover:bg-gray-800 transition"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="bg-gray-200 text-gray-700 rounded px-6 py-2 font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-900">Full Name:</span>
              <p>{profile.name || <span className="text-gray-400">Not set</span>}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Address:</span>
              <p>{profile.address || <span className="text-gray-400">Not set</span>}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Postal Code:</span>
              <p>{profile.postalCode || <span className="text-gray-400">Not set</span>}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Phone:</span>
              <p>{profile.phone || <span className="text-gray-400">Not set</span>}</p>
            </div>
            {profileError && <div className="text-red-600 text-sm mt-2">{profileError}</div>}
            {profileSuccess && <div className="text-green-600 text-sm mt-2">{profileSuccess}</div>}
          </div>
        )}
        <div className="mt-4 text-sm text-gray-600"><span className="font-medium">Email:</span> {user.email}</div>
      </div>

      {/* Order History */}
      <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Order History</h2>
        {orders.length === 0 ? (
          <div className="text-gray-500">No orders found.</div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="border-b pb-2">
                <div className="font-medium">Order #{order.id.slice(0, 8)}...</div>
                <div className="text-sm text-gray-600">Placed: {new Date(order.created_at).toLocaleString()}</div>
                <div className="text-sm">Status: <span className="font-semibold">{order.status}</span></div>
                {/* You can display order items, shipping, etc. here */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
