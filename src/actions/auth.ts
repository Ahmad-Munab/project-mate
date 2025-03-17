"use server"; // Marks this file as server-side only code

import { db } from "@/db";
import { users } from "@/db/schema";
import { Provider } from "@/types/auth";
import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";

// Define validation schema for email/password authentication
const emailSchema = z.object({
  email: z.string().email(), // Must be valid email format
  password: z.string().min(6), // Password must be at least 6 characters
});

/**
 * Handles email/password login
 * @param formData - Contains email and password from login form
 */
export async function emailLogin(formData: FormData) {
  // Create new Supabase client for server-side operations
  const supabase = createClient();
  
  // Convert FormData to object and validate against schema
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));

  // If validation fails, redirect with error
  if (!parsed.success) {
    return redirect("/login?error=Invalid input");
  }

  // Attempt to sign in with Supabase
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Handle authentication error
  if (error) {
    return redirect("/login?error=Could not authenticate");
  }

  // Success - redirect to dashboard
  return redirect("/dashboard");
}

/**
 * Handles new user registration
 * @param formData - Contains email and password from signup form
 */
export async function signup(formData: FormData) {
  const supabase = createClient();
  
  // Validate input data
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return redirect("/signup?error=Invalid input");
  }

  // Attempt to create new user in Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.signUp(parsed.data);

  if (error || !user) {
    return redirect("/signup?error=Signup failed");
  }

  // If successful, store user in our database
  // Using Drizzle ORM to handle database operations
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
    })
    .onConflictDoUpdate({ // If user exists, update their email
      target: users.id,
      set: { email: user.email! },
    });

  // Redirect to login page with success message
  return redirect("/login?success=Check your email to confirm");
}

/**
 * Handles OAuth authentication (Google/GitHub)
 * @param provider - The OAuth provider ("google" or "github")
 */
export async function oAuthSignIn(provider: Provider) {
  try {
    const supabase = await createClient();
    
    if (!supabase || !supabase.auth) {
      throw new Error("Failed to initialize Supabase client");
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error("No OAuth URL returned");
    }

    // Return the URL instead of redirecting
    return { url: data.url };
  } catch (err) {
    console.error('OAuth error:', err);
    throw err;
  }
}

/**
 * Handles magic link (passwordless) authentication
 * @param formData - Contains email for magic link
 */
export async function signInWithMagicLink(formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  
  // Send one-time password (OTP) to user's email
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Where to redirect after clicking email link
      emailRedirectTo: `${getURL()}/auth/callback`,
    }
  });

  if (error) {
    return redirect("/login?error=Could not send magic link");
  }

  return redirect("/login?success=Check your email for the login link!");
}

/**
 * Handles authentication callback from OAuth and magic links
 * @param request - Next.js request object containing callback parameters
 */
export async function handleAuthCallback(request?: NextRequest) {
  const supabase = createClient();
  const searchParams = request?.nextUrl?.searchParams;
  const token_hash = searchParams?.get("token_hash");
  const type = searchParams?.get("type");

  // Handle magic link authentication
  if (token_hash && type === "magiclink") {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (error) {
      return redirect("/login?error=Invalid magic link");
    }
  }

  // Get authenticated user details
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return redirect("/login?error=Authentication failed");
  }

  // Store or update user in our database
  await db.insert(users).values({
    id: user.id,
    email: user.email!,
  }).onConflictDoUpdate({
    target: users.id,
    set: { email: user.email! }
  });

  // Redirect to dashboard after successful authentication
  return redirect("/dashboard");
}