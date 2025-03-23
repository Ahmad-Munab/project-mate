// Middleware to handle authentication and protected routes
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/signin", "/auth"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Initialize Supabase client for auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          // Get all cookies that start with the name
          const cookies = request.cookies
            .getAll()
            .filter((cookie) => cookie.name.startsWith(name))
            .sort((a, b) => a.name.localeCompare(b.name));

          // If we have split cookies, combine them
          if (cookies.length > 1) {
            return cookies.map((c) => c.value).join("");
          }

          // Otherwise return the single cookie value
          return request.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          // Handle cookie size limits by splitting if necessary
          if (value.length > 4000) {
            const chunks = value.match(/.{1,4000}/g) || [];
            chunks.forEach((chunk, i) => {
              response.cookies.set({
                name: `${name}.${i}`,
                value: chunk,
                ...options,
                path: "/",
              });
            });
          } else {
            response.cookies.set({
              name,
              value,
              ...options,
              path: "/",
            });
          }
        },
        remove: (name, options) => {
          // Remove all related cookies
          const cookies = request.cookies
            .getAll()
            .filter((cookie) => cookie.name.startsWith(name));

          cookies.forEach((cookie) => {
            response.cookies.set({
              name: cookie.name,
              value: "",
              ...options,
              path: "/",
              expires: new Date(0),
            });
          });
        },
      },
    }
  );

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!isPublicRoute) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.redirect(new URL("/signin", request.url));
      }
    } catch (error) {
      console.error("Auth check error:", error);
      return NextResponse.redirect(new URL("/signin", request.url));
    }
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  // Exclude static files and API routes if needed
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
