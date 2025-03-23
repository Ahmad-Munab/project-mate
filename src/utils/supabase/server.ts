"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set: async (name, value, options) => {
          try {
            const cookieStore = await cookies();
            cookieStore.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          } catch (error) {
            console.error("Error setting cookie:", error);
          }
        },
        remove: async (name, options) => {
          try {
            const cookieStore = await cookies();
            cookieStore.set(name, "", {
              ...options,
              path: "/",
              expires: new Date(0),
            });
          } catch (error) {
            console.error("Error removing cookie:", error);
          }
        },
      },
    }
  );
}
