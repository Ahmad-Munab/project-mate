// components/auth/OAuthButtons.tsx
"use client"; // Mark as client component since it handles user interactions
import { oAuthSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import Image from "next/image";

export function OAuthButtons() {
  // Render OAuth provider buttons (GitHub and Google)
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* GitHub OAuth Button */}
      <Button
        variant="outline"
        onClick={() => oAuthSignIn("github")}
        className="gap-2"
      >
        <Github className="h-4 w-4" />
        Continue with GitHub
      </Button>

      {/* Google OAuth Button */}
      <Button
        variant="outline"
        onClick={() => oAuthSignIn("google")}
        className="gap-2"
      >
        <Image src="/icons/google.svg" alt="Google" width={16} height={16} />
        Continue with Google
      </Button>
    </div>
  );
}
