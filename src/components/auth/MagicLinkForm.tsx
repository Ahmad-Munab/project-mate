"use client";
import { useForm } from "react-hook-form";
import { signInWithMagicLink } from "@/actions/auth";

export function MagicLinkForm() {
  const { register } = useForm();

  return (
    <form action={signInWithMagicLink} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          {...register("email", { required: true })}
          type="email"
          className="mt-1 block w-full rounded-md border p-2"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
      >
        Send Magic Link
      </button>
    </form>
  );
}
