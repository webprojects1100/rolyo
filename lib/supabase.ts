import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// TEMPORARY DEBUGGING: Log environment variables during build
console.log('Build-time NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('Build-time NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Exists' : 'MISSING or empty'); // Don't log the key itself for security
console.log('Build-time MY_TEST_VARIABLE:', process.env.MY_TEST_VARIABLE);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
