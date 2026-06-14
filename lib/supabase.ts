import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfigError } from './supabase-config'

let client: SupabaseClient | null = null

export function isSupabaseReady(): boolean {
  return getSupabaseConfigError() === null
}

export function getSupabase(): SupabaseClient {
  const configError = getSupabaseConfigError()
  if (configError) throw new Error(configError)
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    )
  }
  return client
}
