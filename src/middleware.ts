import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  const response = NextResponse.next();

  // Initialize Supabase client with server-side configuration
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  );

  // Special handling for magic link authentication callbacks
  if (request.nextUrl.pathname === "/auth/callback") {
    const token_hash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");

    // Verify the OTP (One-Time Password) for magic links
    if (token_hash && type === "magiclink") {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      // Redirect to login with error if verification fails
      if (error) {
        return NextResponse.redirect(
          new URL("/login?error=Invalid magic link", request.url)
        );
      }
    }
  }

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if user is not authenticated and trying to access protected routes
  if (!user && !request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
