"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { Provider } from "@/types/auth";
import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function emailLogin(formData: FormData) {
  const supabase = createClient();
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return redirect("/login?error=Invalid input");
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return redirect("/login?error=Could not authenticate");
  }

  return redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = createClient();
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return redirect("/signup?error=Invalid input");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp(parsed.data);

  if (error || !user) {
    return redirect("/signup?error=Signup failed");
  }

  // Insert user into Drizzle table
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email! },
    });

  return redirect("/login?success=Check your email to confirm");
}

export async function oAuthSignIn(provider: Provider) { 
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${getURL()}/auth/callback` },
  });

  if (error || !data.url) {
    return redirect("/login?error=OAuth failed");
  }

  return redirect(data.url);
}

// actions/auth.ts
export async function signInWithMagicLink(formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getURL()}/auth/callback`,
    }
  });

  if (error) {
    return redirect("/login?error=Could not send magic link");
  }

  return redirect("/login?success=Check your email for the login link!");
}

// Update handleAuthCallback
export async function handleAuthCallback(request?: NextRequest) {
  const supabase = createClient();
  const searchParams = request?.nextUrl?.searchParams;
  const token_hash = searchParams?.get("token_hash");
  const type = searchParams?.get("type");

  if (token_hash && type === "magiclink") {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (error) {
      return redirect("/login?error=Invalid magic link");
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return redirect("/login?error=Authentication failed");
  }

  await db.insert(users).values({
    id: user.id,
    email: user.email!,
  }).onConflictDoUpdate({
    target: users.id,
    set: { email: user.email! }
  });

  return redirect("/dashboard");
}