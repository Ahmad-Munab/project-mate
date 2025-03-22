import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(
          `${requestUrl.origin}/signin?error=Authentication failed`
        );
      }

      // Successful authentication
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    } catch (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        `${requestUrl.origin}/signin?error=Unexpected error`
      );
    }
  }

  // No code present in URL
  return NextResponse.redirect(
    `${requestUrl.origin}/signin?error=No code provided`
  );
}
