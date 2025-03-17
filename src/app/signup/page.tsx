import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Join Project Mate to start managing your projects
          </p>
        </div>

        <OAuthButtons />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <EmailPasswordForm />
      </div>
    </div>
  );
}