"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithMagicLink } from "@/actions/auth";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'error' | 'success' | null;
    message: string | null;
  }>({ type: null, message: null });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      setStatus({ type: null, message: null });

      const formData = new FormData();
      formData.append("email", data.email);

      const result = await signInWithMagicLink(formData);

      if (result.error) {
        setStatus({ type: 'error', message: result.error });
      } else if (result.success) {
        setStatus({ 
          type: 'success', 
          message: result.message || "Check your email for the login link!" 
        });
      }
    } catch (error) {
      console.error("Magic link submission error:", error);
      setStatus({ 
        type: 'error', 
        message: "Failed to send magic link. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="you@example.com"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {status.message && (
        <div className={`p-3 rounded ${
          status.type === 'error' 
            ? 'bg-red-100 text-red-700 border-red-300' 
            : 'bg-green-100 text-green-700 border-green-300'
        }`}>
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send Magic Link"}
      </button>
    </form>
  );
}
