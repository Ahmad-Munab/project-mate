"use client";

import SignInForm from "@/components/auth/sign-in-form";
import { ArrowLeft } from "lucide-react";
// import type { Metadata } from "next";

// export const metadata: Metadata = {
//   title: "Sign In | ProjectMate",
//   description:
//     "Sign in to your ProjectMate account to access your projects and collaborate with your team.",
// };

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col md:gap-8 gap-6 items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-950 dark:to-green-950/30 py-12 px-4">
      <div
        className="flex items-center gap-2 hover:underline cursor-pointer"
        onClick={() => {
          window.history.back();
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Go Back</span>
      </div>
      <SignInForm />
    </main>
  );
}
