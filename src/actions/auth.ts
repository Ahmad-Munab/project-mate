"use server";

import { Provider } from "@/types/auth";
import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

/**
 * Handles OAuth authentication (Google/GitHub)
 * @param provider - The OAuth provider ("google" or "github")
 */
export async function oAuthSignIn(provider: Provider) {
  try {
    // Await the client creation
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error("No OAuth URL returned");
    }

    return { url: data.url };
  } catch (err) {
    console.error("OAuth error:", err);
    throw err;
  }
}

/**
 * Handles magic link (passwordless) authentication
 * @param formData - Contains email for magic link
 */
export async function signInWithMagicLink(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get("email");

    if (!email || typeof email !== "string") {
      return { error: "Please provide a valid email address" };
    }

    // Send magic link email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getURL()}/auth/callback`,
      },
    });

    if (error) {
      console.error("Magic link error:", error);
      return { error: "Could not send magic link" };
    }

    return { success: true, message: "Check your email for the login link!" };
  } catch (error) {
    console.error("Magic link error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Handles authentication callback from OAuth and magic links
 * @param request - Next.js request object containing callback parameters
 */
export async function handleAuthCallback(request?: NextRequest) {
  // Await the client creation
  const supabase = await createClient();
  const searchParams = request?.nextUrl?.searchParams;
  const token_hash = searchParams?.get("token_hash");
  const type = searchParams?.get("type");
  const code = searchParams?.get("code");

  try {
    // Handle magic link authentication
    if (token_hash && type === "magiclink") {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (error) {
        return redirect("/signin?error=Invalid magic link");
      }
    }

    // Handle OAuth callback
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirect("/signin?error=Authentication failed");
      }
    }

    // Get authenticated user details
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return redirect("/signin?error=Authentication failed");
    }

    // Redirect to dashboard after successful authentication
    return redirect("/dashboard");
  } catch (error) {
    console.error("Auth callback error:", error);
    return redirect("/signin?error=Authentication failed");
  }
}
