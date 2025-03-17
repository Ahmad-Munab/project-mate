import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  // Handle errors first
  if (error) {
    let errorMessage = 'Authentication failed';
    if (error === 'access_denied' && type === 'recovery') {
      errorMessage = 'Password reset link has expired. Please request a new one.';
    } else if (error_description) {
      errorMessage = error_description.replace(/\+/g, ' ');
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // If it's a password reset request, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url));
      }
      // Otherwise redirect to dashboard for normal sign-ins
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=Could not authenticate', request.url)
  );
}
