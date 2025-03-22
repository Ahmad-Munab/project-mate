"use server";

// import { db } from "@/db";
import { Provider } from "@/types/auth";
import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
// import { z } from "zod";

// // Define validation schema for email/password authentication
// const emailSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// /**
//  * Handles email/password login
//  */
// export async function emailLogin(formData: FormData) {
//   try {
//     const supabase = await createClient();

//     // Validate input
//     const parsed = emailSchema.safeParse(Object.fromEntries(formData));
//     if (!parsed.success) {
//       return { error: "Please enter a valid email and password" };
//     }

//     // Attempt to sign in
//     const { data, error: signInError } = await supabase.auth.signInWithPassword(
//       {
//         email: parsed.data.email,
//         password: parsed.data.password,
//       }
//     );

//     console.log("Login attempt:", {
//       success: !!data.session,
//       error: signInError?.message,
//       hasUser: !!data.user,
//     });

//     if (signInError) {
//       if (signInError.message.includes("Invalid login credentials")) {
//         // Check if user exists in our database
//         const existingUser = await db.query.users.findFirst({
//           where: (users, { eq }) => eq(users.email, parsed.data.email),
//         });

//         if (!existingUser) {
//           return {
//             error: "Account not found. Would you like to sign up?",
//             showSignUp: true,
//           };
//         }
//         return { error: "Incorrect password" };
//       }
//       return { error: signInError.message };
//     }

//     if (!data.user || !data.session) {
//       return { error: "Authentication failed" };
//     }

//     // Make sure we have a valid session before proceeding
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       console.error("Session verification failed:", sessionError);
//       return { error: "Failed to establish session" };
//     }

//     try {
//       // Try to insert/update user in database
//       await db
//         .insert(users)
//         .values({
//           id: data.user.id,
//           email: data.user.email!,
//         })
//         .onConflictDoUpdate({
//           target: [users.email],
//           set: { id: data.user.id },
//         });
//     } catch (dbError) {
//       // If there's a database error, log it but don't fail the login
//       console.error("Database sync error:", dbError);
//       // We can still continue since the auth was successful
//     }

//     // Return success with session
//     return {
//       success: true,
//       session: session,
//     };
//   } catch (error) {
//     console.error("Login error:", error);
//     return { error: "An unexpected error occurred" };
//   }
// }

// /**
//  * Handles new user registration
//  */
// export async function signup(formData: FormData) {
//   try {
//     const supabase = await createClient();

//     // Validate input data
//     const parsed = emailSchema.safeParse(Object.fromEntries(formData));

//     if (!parsed.success) {
//       return { error: "Please enter valid email and password" };
//     }

//     // First check if user already exists in our database
//     const existingUser = await db.query.users.findFirst({
//       where: (users, { eq }) => eq(users.email, parsed.data.email),
//     });

//     if (existingUser) {
//       return { error: "An account with this email already exists" };
//     }

//     // Attempt to create new user in Supabase
//     const {
//       data: { user },
//       error,
//     } = await supabase.auth.signUp({
//       email: parsed.data.email,
//       password: parsed.data.password,
//       options: {
//         emailRedirectTo: `${getURL()}/auth/callback`,
//       },
//     });

//     if (error) {
//       console.error("Signup error:", error);
//       if (error.message.includes("User already registered")) {
//         return { error: "An account with this email already exists" };
//       }
//       return { error: "Failed to create account" };
//     }

//     if (!user) {
//       return { error: "Failed to create account" };
//     }

//     try {
//       // Store user in database
//       await db
//         .insert(users)
//         .values({
//           id: user.id,
//           email: user.email!,
//         })
//         .onConflictDoNothing(); // Changed from onConflictDoUpdate to onConflictDoNothing
//     } catch (dbError) {
//       // If database insertion fails, it's likely because the user already exists
//       // We can safely ignore this as the user will be synced during their first login
//       console.log("DB insertion skipped - user likely exists:", dbError);
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("Signup error:", error);
//     return { error: "An unexpected error occurred" };
//   }
// }

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
        return redirect("/login?error=Invalid magic link");
      }
    }

    // Handle OAuth callback
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirect("/login?error=Authentication failed");
      }
    }

    // Get authenticated user details
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return redirect("/login?error=Authentication failed");
    }

    // console.log("new user being added to bd", user.id, user.email);
    // // Store or update user in our database
    // await db
    //   .insert(users)
    //   .values({
    //     id: user.id,
    //     email: user.email!,
    //   })
    //   .onConflictDoUpdate({
    //     target: users.id,
    //     set: { email: user.email! },
    //   });

    // Redirect to dashboard after successful authentication
    return redirect("/dashboard");
  } catch (error) {
    console.error("Auth callback error:", error);
    return redirect("/login?error=Authentication failed");
  }
}
// /**
//  * Handles password reset request
//  */
// export async function forgotPassword(email: string) {
//   try {
//     const supabase = await createClient();

//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//       redirectTo: `${getURL()}/auth/callback?type=recovery`,
//     });

//     if (error) {
//       return { error: "Failed to send password reset email" };
//     }

//     return {
//       success: true,
//       message: "Password reset instructions sent to your email",
//     };
//   } catch (error) {
//     console.error("Password reset error:", error);
//     return { error: "An unexpected error occurred" };
//   }
// }
