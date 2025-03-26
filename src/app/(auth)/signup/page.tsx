import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient();

  // Check if user is already authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // If there's an invite token, redirect to invite acceptance
    const inviteToken = searchParams.invite;
    if (inviteToken && typeof inviteToken === 'string') {
      redirect(`/invite/${inviteToken}`);
    }
    redirect("/dashboard");
  }

  return (
    <div>
      {/* Your sign-up form */}
      {searchParams.invite && (
        <p className="text-sm text-muted-foreground">
          You've been invited to join. Please sign up to accept the invitation.
        </p>
      )}
    </div>
  );
}
