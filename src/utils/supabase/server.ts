import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type CookieOptions } from '@supabase/ssr';

export async function createClient(cookieStore?: ReturnType<typeof cookies>) {
  // In Next.js 15, cookies() is async and needs to be awaited
  const cookieHandler = cookieStore || await cookies();

  // Create a map to store cookie values
  const cookieMap = new Map<string, string>();

  // Manually get all cookies and store them in the map
  // This avoids the type error with getAll()
  const cookieString = cookieHandler.toString();
  if (cookieString) {
    const cookies = cookieString.split('; ');
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name && value) {
        cookieMap.set(name, value);
      }
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string): string | undefined => {
          // Use the pre-fetched cookie map instead of async call
          return cookieMap.get(name) || undefined;
        },
        set: (name: string, value: string, options?: CookieOptions): void => {
          try {
            if (options?.maxAge) {
              options.expires = new Date(Date.now() + options.maxAge * 1000);
            }
            // We can't await here, but we can still call the method
            // Use type assertion to avoid the type error
            (cookieHandler as { set(name: string, value: string, options: unknown): void }).set(name, value, options as unknown);
            // Update our local map for future gets
            cookieMap.set(name, value);
          } catch (error) {
            console.error('Cookie setting error:', error);
          }
        },
        remove: (name: string, options?: CookieOptions): void => {
          try {
            // Use type assertion to avoid the type error
            (cookieHandler as { set(name: string, value: string, options: unknown): void }).set(name, '', { ...options, expires: new Date(0) } as unknown);
            // Update our local map
            cookieMap.delete(name);
          } catch (error) {
            console.error('Cookie removal error:', error);
          }
        },
      },
    }
  );
}
