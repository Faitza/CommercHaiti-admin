import { createClient } from '@supabase/supabase-js'

// Même projet Supabase que l'app mobile CommercHaiti.
// Valeurs dans .env (voir .env.example) ou dans les variables Vercel.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (.env)')
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing')
