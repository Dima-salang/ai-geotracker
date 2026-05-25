import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — stores PKCE OAuth state in cookies so
 * /auth/callback can exchange the code on the server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
