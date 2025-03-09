import { handleAuthCallback } from "@/actions/auth";

export async function GET() {
  return handleAuthCallback();
}
