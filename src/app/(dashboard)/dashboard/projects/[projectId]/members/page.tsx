"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PendingInvitesList } from "@/components/dashboard/members/PendingInvitesList";
import { MembersList } from "@/components/dashboard/members/MembersList";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InviteDialog } from "@/components/dashboard/members/InviteDialog";

// Types for our component
interface Member {
    id: string;
    email: string;
    role: string;
    joinedAt: string;
    name: string;
    avatar?: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    sentAt: string;
    token?: string;
}

export default function MembersPage() {
    const { projectId } = useParams();
    const [members, setMembers] = useState<Member[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch members and invites
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch project members
            const membersResponse = await fetch(
                `/api/projects/${projectId}/members`
            );
            if (!membersResponse.ok) {
                throw new Error("Failed to fetch members");
            }
            const membersData = await membersResponse.json();
            setMembers(membersData);

            // Fetch pending invites
            const invitesResponse = await fetch(
                `/api/projects/${projectId}/invites`
            );
            if (!invitesResponse.ok) {
                throw new Error("Failed to fetch invites");
            }
            const invitesData = await invitesResponse.json();
            setPendingInvites(invitesData);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "An error occurred";
            console.error("Error fetching data:", err);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle resending invites
    const handleResendInvite = async (inviteId: string) => {
        try {
            const response = await fetch(
                `/api/projects/${projectId}/invites/${inviteId}/resend`,
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to resend invite");
            }

            toast.success("Invitation resent successfully");
        } catch (error) {
            console.error("Error resending invite:", error);
            toast.error("Failed to resend invitation");
        }
    };

    // Handle canceling invites
    const handleCancelInvite = async (inviteId: string) => {
        try {
            const response = await fetch(
                `/api/projects/${projectId}/invites/${inviteId}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to cancel invite");
            }

            setPendingInvites((prevInvites) =>
                prevInvites.filter((invite) => invite.id !== inviteId)
            );
            toast.success("Invitation cancelled");
        } catch (error) {
            console.error("Error cancelling invite:", error);
            toast.error("Failed to cancel invitation");
        }
    };

    // Handle role changes
    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(
                `/api/projects/${projectId}/members/${memberId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ role: newRole }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update member role");
            }

            setMembers((prevMembers) =>
                prevMembers.map((member) =>
                    member.id === memberId
                        ? { ...member, role: newRole }
                        : member
                )
            );
            toast.success("Member role updated successfully");
        } catch (error) {
            console.error("Role update error:", error);
            toast.error("Failed to update member role");
        }
    };

    const handleInviteCreated = (newInvite: PendingInvite) => {
        setPendingInvites((prev) => [...prev, newInvite]);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading members...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900">
                    Error Loading Members
                </h3>
                <p className="text-slate-500 max-w-md mb-6">{error}</p>
                <Button
                    onClick={() => fetchData()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                        Team Members
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your project team members and invitations
                    </p>
                </div>
                <InviteDialog
                    projectId={projectId as string}
                    onInviteCreated={handleInviteCreated}
                />
            </div>

            <div className="space-y-8">
                <MembersList
                    members={members}
                    onRoleChange={handleRoleChange}
                />

                <PendingInvitesList
                    invites={pendingInvites}
                    onResend={handleResendInvite}
                    onCancel={handleCancelInvite}
                />
            </div>
        </div>
    );
}
