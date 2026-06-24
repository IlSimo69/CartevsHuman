import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variabili VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY non trovate nel file .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
