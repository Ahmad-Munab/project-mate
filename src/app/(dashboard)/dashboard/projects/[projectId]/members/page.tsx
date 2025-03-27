"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical, Search, Mail, UserPlus, Users, Clock, CheckCircle2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Check, Copy, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { useState as useClipboardState } from 'react'

// Define types for members and invites
type Member = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  status: string;
  lastActive: string;
  projectId: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  sentAt: string;
  status: string;
  token?: string;
};

export default function MembersPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviteMethod, setInviteMethod] = useState("email") // "email" or "link"
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useClipboardState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for members and invites
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])

  // Fetch members and invites
  useEffect(() => {
    if (!projectId) return;

    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project members
        const membersResponse = await fetch(`/api/projects/${projectId}/members`);
        if (!membersResponse.ok) {
          throw new Error('Failed to fetch members');
        }
        const membersData = await membersResponse.json();
        setMembers(membersData);

        // Fetch pending invites
        const invitesResponse = await fetch(`/api/projects/${projectId}/invites`);
        if (!invitesResponse.ok) {
          throw new Error('Failed to fetch invites');
        }
        const invitesData = await invitesResponse.json();
        setPendingInvites(invitesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [projectId]);

  const filteredMembers = members.filter((member) => {
    // Filter by search query
    if (
      searchQuery &&
      !member.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Filter by tab
    if (activeTab === "active" && member.status !== "active") return false
    if (activeTab === "inactive" && member.status !== "inactive") return false
    if (activeTab === "pending" && member.status !== "recording") return false

    return true
  })

  const approveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          status: 'active',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve member');
      }

      // Update the UI
      setMembers(members.map((member) =>
        member.id === memberId ? { ...member, status: "active" } : member
      ));

      toast.success("Member approved successfully");
    } catch (error) {
      console.error("Error approving member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to approve member");
    }
  }

  const changeMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change member role');
      }

      // Update the UI
      setMembers(members.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member
      ));

      toast.success("Member role updated successfully");
    } catch (error) {
      console.error("Error changing member role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to change member role");
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }

      // Update the UI
      setMembers(members.filter((member) => member.id !== memberId));

      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      console.log('Sending invite to:', inviteEmail, 'with role:', inviteRole);

      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const responseData = await response.json();
      console.log('Invite API response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to send invite');
      }

      // Update the UI with the new invite
      setPendingInvites([
        ...pendingInvites,
        {
          id: responseData.invite.id,
          email: inviteEmail,
          role: inviteRole,
          sentAt: "Just now",
          status: "PENDING",
        },
      ]);

      setInviteEmail("");
      setInviteRole("MEMBER");
      setShowInviteDialog(false);
      toast.success("Invitation sent successfully");
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      // Find the invite with this ID to get its token
      const invite = pendingInvites.find(inv => inv.id === inviteId);
      if (!invite || !invite.token) {
        throw new Error('Invite not found or missing token');
      }

      const response = await fetch(`/api/invites/${invite.token}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel invite');
      }

      // Update the UI
      setPendingInvites(pendingInvites.filter((invite) => invite.id !== inviteId));

      toast.success("Invitation cancelled successfully");
    } catch (error) {
      console.error("Error cancelling invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel invitation");
    }
  }

  const resendInvite = async (inviteId: string) => {
    try {
      const invite = pendingInvites.find(invite => invite.id === inviteId);
      if (!invite || !invite.token) {
        throw new Error('Invite not found or missing token');
      }

      const response = await fetch(`/api/invites/${invite.token}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend invite');
      }

      // Update the UI
      setPendingInvites(pendingInvites.map((invite) =>
        invite.id === inviteId ? { ...invite, sentAt: "Just now" } : invite
      ));

      toast.success("Invitation resent successfully");
    } catch (error) {
      console.error("Error resending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
    }
  }

  const generateInviteLink = async () => {
    try {
      console.log('Generating invite link with role:', inviteRole);

      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: inviteRole,
        }),
      });

      const responseData = await response.json();
      console.log('Generate invite link API response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to generate invite link');
      }

      // Construct the full invite URL using the current origin
      const inviteUrl = `${window.location.origin}/invite/${responseData.invite.token}`;
      console.log('Generated invite URL:', inviteUrl);
      setInviteLink(inviteUrl);

      // Add the invite to the pending invites list
      setPendingInvites([
        ...pendingInvites,
        {
          id: responseData.invite.id,
          email: 'No email (link invite)',
          role: inviteRole,
          sentAt: "Just now",
          status: "PENDING",
        },
      ]);

      toast.success("Invite link generated successfully");
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate invite link");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy link");
    }
  };

  // Stats are calculated above

  // Helper functions for displaying badges
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
      case "inactive":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        )
      case "pending":
      case "recording":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending Approval</Badge>
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case "OWNER":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Owner</Badge>
      case "MANAGER":
      case "ADMIN":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Manager</Badge>
      case "MEMBER":
        return <Badge variant="secondary">Member</Badge>
      default:
        return null
    }
  }

  const getMemberStats = () => {
    const total = members.length
    const active = members.filter((m) => m.status?.toLowerCase() === "active").length
    const inactive = members.filter((m) => m.status?.toLowerCase() === "inactive").length
    const pending = members.filter((m) =>
      m.status?.toLowerCase() === "pending" ||
      m.status?.toLowerCase() === "recording"
    ).length

    return { total, active, inactive, pending }
  }

  const stats = getMemberStats()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <span className="text-red-600 text-4xl">!</span>
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-900">Error Loading Members</h3>
        <p className="text-gray-500 max-w-md mb-6">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team Members</h1>
          <p className="text-gray-500">Manage your team members and their access permissions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <Progress
              value={(stats.total / 10) * 100}
              className="h-1 mt-4 bg-blue-200"
            />
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.active}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress
              value={(stats.active / stats.total) * 100}
              className="h-1 mt-4 bg-green-200"
              indicatorClassName="bg-green-600"
            />
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.pending}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <Progress
              value={(stats.pending / stats.total) * 100}
              className="h-1 mt-4 bg-amber-200"
              indicatorClassName="bg-amber-600"
            />
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                <h3 className="text-2xl font-bold text-gray-900">{pendingInvites.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-200 flex items-center justify-center">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <Progress
              value={(pendingInvites.length / 5) * 100}
              className="h-1 mt-4 bg-purple-200"
              indicatorClassName="bg-purple-600"
            />
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search members..."
                className="pl-8 border-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px] border-gray-300">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>
                  Choose how you'd like to invite team members.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={inviteMethod} onValueChange={setInviteMethod} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
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
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="role" className="border-gray-300">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="link" className="mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="link-role">Role for invite link</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="link-role" className="border-gray-300">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inviteLink && (
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-md">
                        <Input
                          readOnly
                          value={inviteLink}
                          className="border-gray-300"
                        />
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
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteLink("");
                    setInviteEmail("");
                    setInviteRole("MEMBER");
                  }}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                {inviteMethod === "email" ? (
                  <Button
                    onClick={sendInvite}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Send invitation
                  </Button>
                ) : (
                  <Button
                    onClick={generateInviteLink}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Generate Link
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full sm:w-[400px] bg-gray-100">
            <TabsTrigger value="all" className="data-[state=active]:bg-white">
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-white">
              Active
            </TabsTrigger>
            <TabsTrigger value="inactive" className="data-[state=active]:bg-white">
              Inactive
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-white">
              Pending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-700">Member</th>
                      <th className="text-left p-4 font-medium text-gray-700 hidden md:table-cell">Role</th>
                      <th className="text-left p-4 font-medium text-gray-700 hidden lg:table-cell">Status</th>
                      <th className="text-left p-4 font-medium text-gray-700 hidden lg:table-cell">Last Active</th>
                      <th className="text-right p-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-gray-200">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback className="bg-gray-100 text-gray-700">
                                  {member.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">{getRoleBadge(member.role)}</td>
                          <td className="p-4 hidden lg:table-cell">{getStatusBadge(member.status)}</td>
                          <td className="p-4 hidden lg:table-cell">
                            <span className="text-sm text-gray-600">{member.lastActive}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.status === "recording" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => approveMember(member.id)}
                                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                >
                                  Approve
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-gray-700"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => approveMember(member.id)}
                                    disabled={member.status?.toLowerCase() === "active"}
                                  >
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Select
                                      onValueChange={(value) => changeMemberRole(member.id, value)}
                                      defaultValue={member.role}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Change Role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="MEMBER">Member</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => removeMember(member.id)}
                                    disabled={member.role?.toUpperCase() === "OWNER"}
                                  >
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          No members found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Other tab contents would be similar to the "all" tab but with filtered data */}
        </Tabs>

        {pendingInvites.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Pending Invitations</h2>
              <Button variant="outline" size="sm" className="border-gray-300">
                <Mail className="h-4 w-4 mr-2 text-gray-600" />
                Resend All
              </Button>
            </div>

            <Card className="overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-700">Email</th>
                      <th className="text-left p-4 font-medium text-gray-700 hidden md:table-cell">Role</th>
                      <th className="text-left p-4 font-medium text-gray-700 hidden lg:table-cell">Sent</th>
                      <th className="text-right p-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{invite.email}</p>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {getRoleBadge(invite.role)}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-sm text-gray-600">{invite.sentAt}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvite(invite.id)}
                              className="border-gray-300"
                            >
                              Resend
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvite(invite.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {filteredMembers.length === 0 && activeTab === "all" && searchQuery === "" && (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 rounded-lg">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
              <UserPlus className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">No Members Yet</h3>
            <p className="text-gray-500 max-w-md mb-6">
              Your team doesn't have any members yet. Start building your team by inviting colleagues.
            </p>
            <Button onClick={() => setShowInviteDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4" />
              Invite Your First Team Member
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

