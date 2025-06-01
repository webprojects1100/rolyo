"use client";

import { useState } from 'react';
import { addSubscription } from '@/lib/utils';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    console.log('Submitting email:', email); // Debug: log email

    try {
      const result = await addSubscription(email);
      console.log('addSubscription result:', result); // Debug: log result
      setMessage(result.message);

      if (result.success) {
        setEmail('');
      }
    } catch (err) {
      console.error('SubscribeForm error:', err); // Debug: log error
      setMessage('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-row w-full gap-2">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 p-2 rounded border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-black/60 transition placeholder-gray-400 shadow-sm"
          required
        />
        <button
          type="submit"
          className="px-5 py-2 rounded bg-black text-white font-medium hover:bg-gray-900 transition focus:outline-none focus:ring-2 focus:ring-black/60 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-[110px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? '...' : 'Subscribe'}
        </button>
      </form>
      {message && <p className="text-sm mt-2 text-gray-500 text-center">{message}</p>}
    </>
  );
}