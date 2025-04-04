"use client";

import { useState } from "react";
import { Mail, LinkIcon, Check, Copy } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface InviteDialogProps {
    projectId: string;
    onInviteCreated: (invite: {
        id: string;
        email: string;
        role: "MANAGER" | "MEMBER";
        sentAt: string;
        token?: string;
    }) => void;
}

export function InviteDialog({
    projectId,
    onInviteCreated,
}: InviteDialogProps) {
    const [open, setOpen] = useState(false);
    const [inviteMethod, setInviteMethod] = useState("email");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"MEMBER" | "MANAGER">(
        "MEMBER"
    );
    const [inviteLink, setInviteLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => {
        setInviteEmail("");
        setInviteRole("MEMBER");
        setInviteLink("");
        setInviteMethod("email");
    };

    const handleClose = () => {
        setOpen(false);
        resetForm();
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success("Link copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy link:", error);
            toast.error("Failed to copy link");
        }
    };

    const sendInvite = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || "Failed to send invite");

            onInviteCreated({
                id: data.invite.id,
                email: inviteEmail,
                role: inviteRole,
                sentAt: "Just now",
            });

            toast.success("Invitation sent successfully");
            handleClose();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to send invitation"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const generateInviteLink = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: inviteRole }),
            });

            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || "Failed to generate invite link");

            const inviteUrl = `${window.location.origin}/invite/${data.invite.token}`;
            setInviteLink(inviteUrl);

            onInviteCreated({
                id: data.invite.id,
                email: "No email (link invite)",
                role: inviteRole,
                sentAt: "Just now",
                token: data.invite.token,
            });

            toast.success("Invite link generated successfully");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to generate invite link"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg">
                    <Mail className="h-4 w-4" />
                    Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite team member</DialogTitle>
                    <DialogDescription>
                        Choose how you&apos;d like to invite team members.
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={inviteMethod}
                    onValueChange={setInviteMethod}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="email"
                            className="flex items-center gap-2 cursor-pointer data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                        >
                            <Mail className="h-4 w-4" />
                            Email
                        </TabsTrigger>
                        <TabsTrigger
                            value="link"
                            className="flex items-center gap-2 cursor-pointer data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                        >
                            <LinkIcon className="h-4 w-4" />
                            Invite Link
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="mt-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={(e) =>
                                        setInviteEmail(e.target.value)
                                    }
                                    className="border-slate-300"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(
                                        value: "MEMBER" | "MANAGER"
                                    ) => setInviteRole(value)}
                                >
                                    <SelectTrigger
                                        id="role"
                                        className="border-slate-300"
                                    >
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MANAGER">
                                            Manager
                                        </SelectItem>
                                        <SelectItem value="MEMBER">
                                            Member
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="link" className="mt-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="link-role">
                                    Role for invite link
                                </Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(
                                        value: "MEMBER" | "MANAGER"
                                    ) => setInviteRole(value)}
                                >
                                    <SelectTrigger
                                        id="link-role"
                                        className="border-slate-300"
                                    >
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MANAGER">
                                            Manager
                                        </SelectItem>
                                        <SelectItem value="MEMBER">
                                            Member
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {inviteLink && (
                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-md">
                                    <Input
                                        readOnly
                                        value={inviteLink}
                                        className="border-slate-300 text-sm"
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={copyToClipboard}
                                                    className="shrink-0"
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    {copied
                                                        ? "Copied!"
                                                        : "Copy to clipboard"}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="border-slate-300"
                    >
                        Cancel
                    </Button>
                    {inviteMethod === "email" ? (
                        <Button
                            onClick={sendInvite}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin mr-2">
                                        ⏳
                                    </span>
                                    Sending...
                                </>
                            ) : (
                                "Send invitation"
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={generateInviteLink}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin mr-2">
                                        ⏳
                                    </span>
                                    Generating...
                                </>
                            ) : (
                                "Generate Link"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
