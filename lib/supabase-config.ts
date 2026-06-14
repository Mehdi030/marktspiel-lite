export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) {
    return 'Supabase ist nicht konfiguriert. Trage NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local ein.'
  }

  if (
    url.includes('DEIN-PROJECT') ||
    key.includes('DEIN-') ||
    url.includes('your-project') ||
    key === 'dein-anon-key'
  ) {
    return 'In .env.local stehen noch Platzhalter. Kopiere URL und anon key aus Supabase → Project Settings → API.'
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    return 'NEXT_PUBLIC_SUPABASE_URL sieht ungültig aus (erwartet: https://xxxx.supabase.co).'
  }

  return null
}
