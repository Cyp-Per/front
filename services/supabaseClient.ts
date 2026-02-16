
import { createClient } from '@supabase/supabase-js';

// Access environment variables safely, with fallbacks for the provided credentials
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    return process.env[key];
  } catch (e) {
    return undefined;
  }
};

// Use provided credentials
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://api.cyplom.com';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_WgyK6CEUDNK-xQ8PzfCCYg_mt720xIn';

export const supabase = createClient(supabaseUrl, supabaseKey);
