"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// Component to handle the invite token logic
function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get("invite");

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

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
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>
                    {inviteToken
                        ? "You've been invited to join. Please sign up to accept the invitation."
                        : "Create your account to get started."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Your sign-up form components will go here */}
                <div className="space-y-4">
                    {/* Add your form components here */}
                </div>
            </CardContent>
        </Card>
    );
}

// Main SignUp page component with Suspense
export default function SignUpPage() {
    return (
        <div className="container flex items-center justify-center min-h-screen py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <SignUpContent />
            </Suspense>
        </div>
    );
}
