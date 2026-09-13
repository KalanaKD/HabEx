/**
 * Supabase connection + auth helpers (web build only). The client is created
 * lazily so importing this module on Android costs nothing.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
    client = createClient(url, key)
  }
  return client
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase().auth.getSession()
  return data.session
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

/** Returns true when the account is usable immediately, false if email confirmation is pending. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase().auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return !!data.session
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut()
}
