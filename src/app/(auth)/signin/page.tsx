import SignInForm from "@/components/auth/sign-in-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | ProjectMate",
  description:
    "Sign in to your ProjectMate account to access your projects and collaborate with your team.",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-950 dark:to-green-950/30 py-12 px-4">
      <SignInForm />
    </main>
  );
}
