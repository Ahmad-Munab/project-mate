import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  );

  // Handle OTP callback
  if (request.nextUrl.pathname === "/auth/callback") {
    const token_hash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");

    if (token_hash && type === "magiclink") {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (error) {
        return NextResponse.redirect(
          new URL("/login?error=Invalid magic link", request.url)
        );
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
