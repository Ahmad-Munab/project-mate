"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithMagicLink } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="magic-link-email">Email</Label>
        <Input
          {...register("email")}
          type="email"
          id="magic-link-email"
          placeholder="you@example.com"
          disabled={isLoading}
          aria-invalid={!!errors.email}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {status.message && (
        <div
          className={`p-3 rounded text-sm ${
            status.type === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-green-100 text-green-700 border border-green-200"
          }`}
        >
          {status.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Magic Link"}
      </Button>
    </form>
  );
}
