"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MoreVertical, UserCog, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

interface MembersListProps {
    members: Member[];
    onRoleChange: (memberId: string, newRole: string) => Promise<void>;
    currentUserRole: string;
}

export function MembersList({
    members,
    onRoleChange,
    currentUserRole,
}: MembersListProps) {
    const getRoleBadge = (role: string) => {
        switch (role?.toUpperCase()) {
            case "OWNER":
                return <Badge className="bg-blue-500">OWNER</Badge>;
            case "MANAGER":
                return <Badge className="bg-purple-500">MANAGER</Badge>;
            default:
                return (
                    <Badge className="bg-green-500 text-slate-700">
                        MEMBER
                    </Badge>
                );
        }
    };

    const canEditMemberRole = (memberRole: string) => {
        if (currentUserRole === "OWNER") {
            return memberRole !== "OWNER";
        }
        if (currentUserRole === "MANAGER") {
            return memberRole === "MEMBER";
        }
        return false;
    };

    if (!members.length) {
        return (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-50">
                <UserPlus className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No Members Yet
                </h3>
                <p className="text-sm text-slate-500">
                    Start by inviting team members to your project.
                </p>
            </div>
        );
    }

    const showActionsColumn =
        currentUserRole === "OWNER" || currentUserRole === "MANAGER";

    return (
        <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 mb-4">
                Active Members ({members.length})
            </h1>
            <div className="border rounded-md overflow-hidden p-3">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            {showActionsColumn && (
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border border-slate-200">
                                            <AvatarImage
                                                src={member.avatar}
                                                alt={member.name}
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-sm font-medium">
                                                {member.name?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {member.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getRoleBadge(member.role)}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        {canEditMemberRole(member.role) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 hover:bg-slate-100"
                                                    >
                                                        <MoreVertical className="h-4 w-4 text-slate-500" />
                                                        <span className="sr-only">
                                                            Open menu
                                                        </span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-[160px]"
                                                >
                                                    <DropdownMenuLabel>
                                                        Manage Member
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <UserCog className="h-4 w-4 mr-2" />
                                                            Change Role
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuPortal>
                                                            <DropdownMenuSubContent>
                                                                {currentUserRole ===
                                                                    "OWNER" && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                onRoleChange(
                                                                                    member.id,
                                                                                    "MEMBER"
                                                                                )
                                                                            }
                                                                        >
                                                                            Member
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                onRoleChange(
                                                                                    member.id,
                                                                                    "MANAGER"
                                                                                )
                                                                            }
                                                                        >
                                                                            Manager
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                                {currentUserRole ===
                                                                    "MANAGER" && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            onRoleChange(
                                                                                member.id,
                                                                                "MEMBER"
                                                                            )
                                                                        }
                                                                    >
                                                                        Member
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuPortal>
                                                    </DropdownMenuSub>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
