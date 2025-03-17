import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/auth'];

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

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Only check authentication for non-public routes
  if (!isPublicRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect to login if user is not authenticated
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  // Exclude static files and API routes if needed
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
