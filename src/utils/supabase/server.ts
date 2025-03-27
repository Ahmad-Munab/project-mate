import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient(cookieStore?: ReturnType<typeof cookies>) {
  // In Next.js 15, cookies() is async and needs to be awaited
  const cookieHandler = cookieStore || await cookies();

  // Get all cookies synchronously (we've already awaited the cookies() call)
  const cookieList = await cookieHandler.getAll();
  const cookieMap = new Map(cookieList.map(cookie => [cookie.name, cookie.value]));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          // Use the pre-fetched cookie map instead of async call
          return cookieMap.get(name) || null;
        },
        set: (name, value, options) => {
          try {
            if (options?.maxAge) {
              options.expires = new Date(Date.now() + options.maxAge * 1000);
            }
            // We can't await here, but we can still call the method
            cookieHandler.set(name, value, options);
            // Update our local map for future gets
            cookieMap.set(name, value);
          } catch (error) {
            console.error('Cookie setting error:', error);
          }
        },
        remove: (name, options) => {
          try {
            cookieHandler.set(name, '', { ...options, expires: new Date(0) });
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
