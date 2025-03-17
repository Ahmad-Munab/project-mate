// components/auth/EmailPasswordForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup, emailLogin } from "@/actions/auth";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional() // Make confirmPassword optional for login
}).refine((data) => {
  // Only validate confirmPassword if it exists (signup form)
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function EmailPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fix the isSignUp check to be more explicit
  const isSignUp = pathname?.startsWith('/signup') ?? false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    // Add default values to ensure form fields are not undefined
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: isSignUp ? '' : undefined
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      setFormError(null);

      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      if (isSignUp) {
        const result = await signup(formData);
        if (result.error) {
          setFormError(result.error);
        } else {
          router.push('/login?message=Check your email to confirm your account');
        }
      } else {
        // Handle login
        const result = await emailLogin(formData);
        
        if (result.error) {
          setFormError(result.error);
          // If account not found, show option to sign up
          if (result.showSignUp) {
            setTimeout(() => {
              router.push('/signup');
            }, 2000); // Wait 2 seconds before redirecting to signup
          }
        } else if (result.success) {
          // Redirect to dashboard on successful login
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setFormError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message from URL params
  const message = searchParams.get('message');

  // Add this debug log
  console.log("Current form state:", { 
    isSignUp, 
    errors, 
    isLoading 
  });

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-4"
      // Add this to debug form submission
      onClick={(e) => console.log("Form clicked", e.target)}
    >
      {message && (
        <div className="p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
          {message}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete={isSignUp ? "email" : "username"}
          disabled={isLoading}
          {...register("email")}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          disabled={isLoading}
          {...register("password")}
          className={errors.password ? "border-red-500" : ""}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      {isSignUp && (
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            {...register("confirmPassword")}
            className={errors.confirmPassword ? "border-red-500" : ""}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
      )}

      {formError && (
        <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {formError}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="mr-2">Processing...</span>
          </span>
        ) : (
          isSignUp ? "Create Account" : "Sign In"
        )}
      </Button>

      <p className="text-sm text-center mt-4">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
