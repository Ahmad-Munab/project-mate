import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient(cookieStore?: ReturnType<typeof cookies>) {
  const cookieHandler = cookieStore || cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return cookieHandler.get(name)?.value;
        },
        set: (name, value, options) => {
          try {
            if (options?.maxAge) {
              options.expires = new Date(Date.now() + options.maxAge * 1000);
            }
            cookieHandler.set(name, value, options);
          } catch (error) {
            console.error('Cookie setting error:', error);
          }
        },
        remove: (name, options) => {
          try {
            cookieHandler.set(name, '', { ...options, expires: new Date(0) });
          } catch (error) {
            console.error('Cookie removal error:', error);
          }
        },
      },
    }
  );
}
