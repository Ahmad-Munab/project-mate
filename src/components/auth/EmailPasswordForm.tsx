// components/auth/EmailPasswordForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup, emailLogin } from "@/actions/auth";
import { useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function EmailPasswordForm() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const message = searchParams.get("message");
  const error = searchParams.get("error");

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const isLogin = pathname === "/login";

  const onSubmit = async (data: FormValues) => {
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    try {
      if (isLogin) {
        await emailLogin(formData);
      } else {
        await signup(formData);
      }
    } catch (err) {
      console.error("Authentication error:", err);
    }
  };

  if (!mounted) {
    return null; // or a loading spinner
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          {...register("email")}
          id="email"
          type="email"
          placeholder="you@example.com"
          className="mt-1"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          {...register("password")}
          id="password"
          type="password"
          placeholder="••••••••"
          className="mt-1"
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {message && (
        <p className="text-sm text-green-500 text-center">{message}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Processing..."
          : isLogin
          ? "Sign In"
          : "Create Account"}
      </Button>

      {isLogin ? (
        <p className="text-sm text-center mt-4">
          {"Don't have an account? "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      ) : (
        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}
