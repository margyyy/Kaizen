import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lpnjxkzeyiifzzycmftg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwbmp4a3pleWlpZnp6eWNtZnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjA4NzYsImV4cCI6MjA5MzEzNjg3Nn0.bX05RBSSSjHT8Ng2lwNnadFAH7VUJ_Pogxy3tKd2mjM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
