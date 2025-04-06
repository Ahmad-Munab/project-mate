"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatSentAt = (sentAt: string) => {
    try {
        const date = new Date(sentAt);
        if (isNaN(date.getTime())) {
            return "Invalid date";
        }
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
    }
};

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    sentAt: string;
    token?: string;
}

interface PendingInvitesListProps {
    invites: PendingInvite[];
    onResend: (inviteId: string) => Promise<void>;
    onCancel: (inviteId: string) => Promise<void>;
}

export function PendingInvitesList({
    invites,
    onResend,
    onCancel,
}: PendingInvitesListProps) {
    const [isResending, setIsResending] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState<string | null>(null);

    const handleResend = async (inviteId: string) => {
        try {
            setIsResending(inviteId);
            await onResend(inviteId);
        } finally {
            setIsResending(null);
        }
    };

    const handleCancel = async (inviteId: string) => {
        try {
            setIsCancelling(inviteId);
            await onCancel(inviteId);
        } finally {
            setIsCancelling(null);
        }
    };

    if (!invites.length) {
        return (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-50">
                <Clock className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No Pending Invitations
                </h3>
                <p className="text-sm text-slate-500">
                    There are currently no pending team invitations.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 mb-4">
                Pending Invitations ({invites.length})
            </h1>
            <div className="border rounded-md overflow-hidden p-3">
                <Table>
                    <TableHeader>
                        <TableRow className="font-bold">
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invites.map((invite) => (
                            <TableRow key={invite.id}>
                                <TableCell>
                                    <p className="font-medium text-slate-900">
                                        {invite.email}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            invite.role === "MANAGER"
                                                ? "default"
                                                : "secondary"
                                        }
                                        className={
                                            invite.role === "MANAGER"
                                                ? "bg-blue-500"
                                                : "bg-slate-200 text-slate-700"
                                        }
                                    >
                                        {invite.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger className="text-sm text-slate-600">
                                                {formatSentAt(invite.sentAt)}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Sent {invite.sentAt}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleResend(
                                                                invite.id
                                                            )
                                                        }
                                                        disabled={
                                                            isResending ===
                                                            invite.id
                                                        }
                                                        className="hover:bg-slate-100"
                                                    >
                                                        <RefreshCw
                                                            className={`h-4 w-4 ${
                                                                isResending ===
                                                                invite.id
                                                                    ? "animate-spin"
                                                                    : ""
                                                            }`}
                                                        />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Resend invitation</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleCancel(
                                                                invite.id
                                                            )
                                                        }
                                                        disabled={
                                                            isCancelling ===
                                                            invite.id
                                                        }
                                                        className="hover:bg-red-50 text-red-600 hover:text-red-700"
                                                    >
                                                        {isCancelling ===
                                                        invite.id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                                        ) : (
                                                            <X className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Cancel invitation</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
