// components/auth/OAuthButtons.tsx
"use client"; // Mark as client component since it handles user interactions
import { oAuthSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OAuthButtons() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    try {
      setIsLoading(provider);
      const result = await oAuthSignIn(provider);
      
      // Client-side redirect to the OAuth provider
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      router.push(`/login?error=OAuth configuration error`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* GitHub OAuth Button */}
      <Button
        variant="outline"
        onClick={() => handleOAuthSignIn("github")}
        disabled={isLoading === "github"}
        className="gap-2"
      >
        <Github className="h-4 w-4" />
        {isLoading === "github" ? "Loading..." : "Continue with GitHub"}
      </Button>

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isLoading === "google"}
      >
        <Image
          src="/icons/google.svg"
          alt="Google"
          width={20}
          height={20}
          className="mr-2"
        />
        {isLoading === "google" ? "Signing in..." : "Continue with Google"}
      </Button>
    </div>
  );
}
