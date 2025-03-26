'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const permissionsList: { [key: string]: string[] } = {
  MEMBER: [
    "View project boards",
    "Add and edit tasks",
    "Comment on tasks",
    "Move tasks between columns",
  ],
  MANAGER: [
    "View project boards",
    "Add and edit tasks",
    "Comment on tasks",
    "Move tasks between columns",
    "Manage project members",
    "Edit project settings",
  ],
  OWNER: [
    "View project boards",
    "Add and edit tasks",
    "Comment on tasks",
    "Move tasks between columns",
    "Manage project members",
    "Edit project settings",
    "Delete the project",
  ],
};

export default function InvitePageClient({ token }: { token: string }) {
  const router = useRouter();
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInviteDetails() {
      try {
        console.log("Fetching invite details for token:", token);
        const response = await fetch(`/api/invites/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invalid or expired invitation");
          toast.error(data.error || "Invalid or expired invitation");
        } else {
          // Ensure the role is uppercase and exists in permissionsList
          const role = data.role?.toUpperCase();
          if (!permissionsList[role]) {
            console.error("Invalid role received:", role);
            setError("Invalid invitation role");
            toast.error("Invalid invitation role");
            return;
          }
          
          setInviteDetails({
            ...data,
            role: role
          });
          console.log("Received invite details:", data);
        }
      } catch (error) {
        console.error("Error fetching invite details:", error);
        setError("Failed to load invitation details");
        toast.error("Failed to load invitation details");
      } finally {
        setLoading(false);
      }
    }

    fetchInviteDetails();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      if (!token) {
        throw new Error("Invalid invitation token");
      }

      const response = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      toast.success(data.message || "Invitation accepted successfully");
      
      // Redirect to the project's board page
      if (data.projectId) {
        router.push(`/dashboard/projects/${data.projectId}`);
      } else {
        router.push('/dashboard'); // Fallback to dashboard only if no projectId
      }

    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">Loading invitation details...</div>
        </Card>
      </div>
    );
  }

  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              {error || "Invalid invitation"}
            </h2>
            <p className="text-gray-600">
              This invitation link may be expired or invalid.
            </p>
            <Button
              onClick={() => router.push("/signup")}
              className="mt-4"
              variant="outline"
            >
              Go to Sign Up
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <h1 className="text-2xl font-bold">Project Invitation</h1>
        <div className="space-y-4">
          <p>
            You've been invited to join <strong>{inviteDetails.projectName}</strong> as a{" "}
            <strong>{inviteDetails.role.toLowerCase()}</strong>.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">You'll be able to:</h3>
            <ul className="list-disc list-inside space-y-1">
              {permissionsList[inviteDetails.role]?.map((perm, index) => (
                <li key={index}>{perm}</li>
              ))}
            </ul>
          </div>
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
