"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { motion } from "framer-motion";
import { oAuthSignIn, signInWithMagicLink } from "@/actions/auth/auth";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [oAuthLoading, setOAuthLoading] = useState<string | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<{
    type: "error" | "success" | null;
    message: string | null;
  }>({ type: null, message: null });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      setStatus({ type: null, message: null });

      const formData = new FormData();
      formData.append("email", data.email);

      const result = await signInWithMagicLink(formData);

      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else if (result.success) {
        setStatus({
          type: "success",
          message: result.message || "Check your email for the login link!",
        });
      }
    } catch (error) {
      console.error("Magic link submission error:", error);
      setStatus({
        type: "error",
        message: "Failed to send magic link. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    try {
      setOAuthLoading(provider);
      const result = await oAuthSignIn(provider);

      // Client-side redirect to the OAuth provider
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      router.push(`/signin?error=OAuth configuration error`);
    } finally {
      setOAuthLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="w-full max-w-md"
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-20"></div>
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Sign in to your ProjectMate account
              </p>
            </div>

            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={oAuthLoading === "github"}
                className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300"
              >
                <Github className="h-4 w-4 mr-2" />
                {oAuthLoading === "github"
                  ? "Signing in..."
                  : "Continue with GitHub"}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={oAuthLoading === "google"}
                className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300"
              >
                <div className="mr-2 h-4 w-4 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                {oAuthLoading === "google"
                  ? "Signing in..."
                  : "Continue with Google"}
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-slate-700 dark:text-slate-300"
                >
                  Email address
                </Label>
                <Input
                  {...register("email")}
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className={`border-slate-300 dark:border-slate-600 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500 dark:focus:ring-green-500 ${
                    errors.email ? "border-red-500 dark:border-red-500" : ""
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {status.message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    status.type === "error"
                      ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30"
                      : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30"
                  }`}
                >
                  {status.message}
                </div>
              )}

              {status.type !== "success" && (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send Magic Link"
                  )}
                </Button>
              )}
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              You can conitnue directly with the above methods
              <p className="text-green-600 dark:text-green-400 hover:underline font-medium">
                No need to register.
              </p>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
