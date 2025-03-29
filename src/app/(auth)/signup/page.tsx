"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // If there's an invite token, redirect to invite acceptance
        if (inviteToken) {
          router.push(`/invite/${inviteToken}`);
        } else {
          router.push("/dashboard");
        }
      }
    };

    checkAuth();
  }, [router, inviteToken]);

  return (
    <div>
      {/* Your sign-up form */}
      {inviteToken && (
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited to join. Please sign up to accept the invitation.
        </p>
      )}
    </div>
  );
}
