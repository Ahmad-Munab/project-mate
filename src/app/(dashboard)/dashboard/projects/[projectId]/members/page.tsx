"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MoreVertical,
  Search,
  Mail,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  LinkIcon,
  Copy,
  Check,
  ArrowUpDown,
  Shield,
  UserCog,
  UserMinus,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
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
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Wifi, WifiOff } from "lucide-react"

// Define types for members and invites
type Member = {
  id: string
  userId: string
  email: string
  name: string
  role: string
  avatar: string
  status: string
  lastActive: string
  projectId: string
}

type Invite = {
  id: string
  email: string
  role: string
  sentAt: string
  status: string
  token?: string
}

export default function MembersPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviteMethod, setInviteMethod] = useState("email") // "email" or "link"
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState("all")
  const [showInvites, setShowInvites] = useState(true)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [sortField, setSortField] = useState<"name" | "role" | "status" | "lastActive">("name")

  // State for members and invites
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])

  // Fetch members and invites
  useEffect(() => {
    if (!projectId) return

    const fetchMembers = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch project members
        const membersResponse = await fetch(`/api/projects/${projectId}/members`)
        if (!membersResponse.ok) {
          throw new Error("Failed to fetch members")
        }
        const membersData = await membersResponse.json()
        setMembers(membersData)

        // Fetch pending invites
        const invitesResponse = await fetch(`/api/projects/${projectId}/invites`)
        if (!invitesResponse.ok) {
          throw new Error("Failed to fetch invites")
        }
        const invitesData = await invitesResponse.json()
        setPendingInvites(invitesData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [projectId])

  // Filter and sort members
  const filteredMembers = members
    .filter((member) => {
      // Filter by search query
      if (
        searchQuery &&
        !member.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by tab
      if (activeTab === "active" && member.status?.toLowerCase() !== "active") return false
      if (activeTab === "inactive" && member.status?.toLowerCase() !== "inactive") return false
      if (activeTab === "pending" && member.status?.toLowerCase() !== "pending") return false

      // Filter by role
      if (roleFilter !== "all" && member.role?.toLowerCase() !== roleFilter.toLowerCase()) return false

      return true
    })
    .sort((a, b) => {
      // Sort by selected field
      const multiplier = sortOrder === "asc" ? 1 : -1

      switch (sortField) {
        case "name":
          return multiplier * (a.name?.localeCompare(b.name || "") || 0)
        case "role":
          return multiplier * (a.role?.localeCompare(b.role || "") || 0)
        case "status":
          return multiplier * (a.status?.localeCompare(b.status || "") || 0)
        case "lastActive":
          return multiplier * (a.lastActive?.localeCompare(b.lastActive || "") || 0)
        default:
          return 0
      }
    })

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          status: newStatus.toUpperCase(),
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || "Failed to update member status")
      }

      // Update the UI
      setMembers(
        members.map((member) => (member.id === memberId ? { ...member, status: newStatus.toLowerCase() } : member)),
      )

      toast.success(`Member ${newStatus === "ACTIVE" ? "approved" : "status updated"} successfully`)
    } catch (error) {
      console.error("Error updating member status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update member status")
    }
  }

  const approveMember = (memberId: string) => updateMemberStatus(memberId, "ACTIVE")
  const deactivateMember = (memberId: string) => updateMemberStatus(memberId, "INACTIVE")

  const changeMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to change member role")
      }

      // Update the UI
      setMembers(members.map((member) => (member.id === memberId ? { ...member, role: newRole } : member)))

      toast.success("Member role updated successfully")
    } catch (error) {
      console.error("Error changing member role:", error)
      toast.error(error instanceof Error ? error.message : "Failed to change member role")
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members?memberId=${memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to remove member")
      }

      // Update the UI
      setMembers(members.filter((member) => member.id !== memberId))

      toast.success("Member removed successfully")
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address")
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || "Failed to send invite")
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
      ])

      setInviteEmail("")
      setInviteRole("MEMBER")
      setShowInviteDialog(false)
      toast.success("Invitation sent successfully")
    } catch (error) {
      console.error("Error sending invite:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send invitation")
    }
  }

  const cancelInvite = async (inviteId: string) => {
    try {
      // Find the invite with this ID to get its token
      const invite = pendingInvites.find((inv) => inv.id === inviteId)
      if (!invite || !invite.token) {
        throw new Error("Invite not found or missing token")
      }

      const response = await fetch(`/api/invites/${invite.token}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to cancel invite")
      }

      // Update the UI
      setPendingInvites(pendingInvites.filter((invite) => invite.id !== inviteId))

      toast.success("Invitation cancelled successfully")
    } catch (error) {
      console.error("Error cancelling invite:", error)
      toast.error(error instanceof Error ? error.message : "Failed to cancel invitation")
    }
  }

  const resendInvite = async (inviteId: string) => {
    try {
      const invite = pendingInvites.find((invite) => invite.id === inviteId)
      if (!invite || !invite.token) {
        throw new Error("Invite not found or missing token")
      }

      const response = await fetch(`/api/invites/${invite.token}`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to resend invite")
      }

      // Update the UI
      setPendingInvites(
        pendingInvites.map((invite) => (invite.id === inviteId ? { ...invite, sentAt: "Just now" } : invite)),
      )

      toast.success("Invitation resent successfully")
    } catch (error) {
      console.error("Error resending invite:", error)
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation")
    }
  }

  const resendAllInvites = async () => {
    try {
      let successCount = 0
      let failCount = 0

      for (const invite of pendingInvites) {
        if (!invite.token) continue

        try {
          const response = await fetch(`/api/invites/${invite.token}`, {
            method: "POST",
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error('Error copying to clipboard:', error)
          failCount++
        }
      }

      // Update the UI
      setPendingInvites(pendingInvites.map((invite) => ({ ...invite, sentAt: "Just now" })))

      if (successCount > 0) {
        toast.success(`Successfully resent ${successCount} invitation${successCount !== 1 ? "s" : ""}`)
      }

      if (failCount > 0) {
        toast.error(`Failed to resend ${failCount} invitation${failCount !== 1 ? "s" : ""}`)
      }
    } catch (error) {
      console.error("Error resending all invites:", error)
      toast.error("Failed to resend invitations")
    }
  }

  const generateInviteLink = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: inviteRole,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || "Failed to generate invite link")
      }

      // Construct the full invite URL using the current origin
      const inviteUrl = `${window.location.origin}/invite/${responseData.invite.token}`
      setInviteLink(inviteUrl)

      // Add the invite to the pending invites list
      setPendingInvites([
        ...pendingInvites,
        {
          id: responseData.invite.id,
          email: "No email (link invite)",
          role: inviteRole,
          sentAt: "Just now",
          status: "PENDING",
          token: responseData.invite.token,
        },
      ])

      toast.success("Invite link generated successfully")
    } catch (error) {
      console.error("Error generating invite link:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate invite link")
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      toast.error("Failed to copy link")
    }
  }

  // Simple presence tracking
  const [activeUsers, setActiveUsers] = useState<Record<string, boolean>>({});

  // Initialize presence tracking
  useEffect(() => {
    // Simulate some users being active
    const simulateActiveUsers = () => {
      // In a real implementation, this would come from a real-time service
      const newActiveUsers: Record<string, boolean> = {};

      // Randomly mark some users as active
      members.forEach(member => {
        if (Math.random() > 0.5) {
          newActiveUsers[member.userId] = true;
        }
      });

      setActiveUsers(newActiveUsers);
    };

    // Initial simulation
    simulateActiveUsers();

    // Set up interval to refresh active users every 30 seconds
    const interval = setInterval(() => {
      simulateActiveUsers();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [members])

  // Helper functions for displaying badges
  const getStatusBadge = (status: string, userId: string) => {
    // Check if user is currently active (simulated real-time)
    if (userId && activeUsers[userId]) {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Wifi className="h-3 w-3 mr-1" />
          Active Now
        </Badge>
      )
    }

    // Fall back to database status
    switch (status?.toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white">
            <WifiOff className="h-3 w-3 mr-1" />
            Away
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white">Unknown</Badge>
    }
  }

  // Get formatted last active time
  const getFormattedLastActiveTime = (member: Member) => {
    if (member.userId && activeUsers[member.userId]) {
      return 'Just now'
    }

    // Fall back to the data from the API
    return member.lastActive || 'Never'
  }

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return (
          <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
            <Shield className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        )
      case "MANAGER":
      case "ADMIN":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <UserCog className="h-3 w-3 mr-1" />
            Manager
          </Badge>
        )
      case "MEMBER":
        return (
          <Badge variant="secondary" className="bg-slate-200 text-slate-700">
            <Users className="h-3 w-3 mr-1" />
            Member
          </Badge>
        )
      default:
        return null
    }
  }

  const getMemberStats = () => {
    const total = members.length
    const active = members.filter((m) => m.status?.toLowerCase() === "active").length
    const inactive = members.filter((m) => m.status?.toLowerCase() === "inactive").length
    const pending = members.filter((m) => m.status?.toLowerCase() === "pending").length

    return { total, active, inactive, pending }
  }

  const stats = getMemberStats()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 animate-pulse">Loading team members...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-slate-900">Error Loading Members</h3>
        <p className="text-slate-500 max-w-md mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Team Members</h1>
            <p className="text-slate-500">Manage your team members and their access permissions</p>
          </div>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>Choose how you&apos;d like to invite team members.</DialogDescription>
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
                        className="border-slate-300"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="role" className="border-slate-300">
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
                        <SelectTrigger id="link-role" className="border-slate-300">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inviteLink && (
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-md">
                        <Input readOnly value={inviteLink} className="border-slate-300 text-sm" />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
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
                  onClick={() => {
                    setShowInviteDialog(false)
                    setInviteLink("")
                    setInviteEmail("")
                    setInviteRole("MEMBER")
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                {inviteMethod === "email" ? (
                  <Button onClick={sendInvite} className="bg-blue-600 hover:bg-blue-700">
                    Send invitation
                  </Button>
                ) : (
                  <Button onClick={generateInviteLink} className="bg-blue-600 hover:bg-blue-700">
                    Generate Link
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Total Members</h3>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-4 pt-6 bg-white">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-sm text-slate-500">Team size</div>
              </div>
              <Progress
                value={(stats.total / 10) * 100}
                className="h-1 mt-4 bg-blue-100"
                indicatorClassName="bg-blue-500"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Active Members</h3>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-4 pt-6 bg-white">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-900">{stats.active}</div>
                <div className="text-sm text-slate-500">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
                </div>
              </div>
              <Progress
                value={(stats.active / (stats.total || 1)) * 100}
                className="h-1 mt-4 bg-emerald-100"
                indicatorClassName="bg-emerald-500"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Pending Approval</h3>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-4 pt-6 bg-white">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-900">{stats.pending}</div>
                <div className="text-sm text-slate-500">
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% of total
                </div>
              </div>
              <Progress
                value={(stats.pending / (stats.total || 1)) * 100}
                className="h-1 mt-4 bg-amber-100"
                indicatorClassName="bg-amber-500"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Pending Invites</h3>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-4 pt-6 bg-white">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-900">{pendingInvites.length}</div>
                <div className="text-sm text-slate-500">Awaiting response</div>
              </div>
              <Progress
                value={(pendingInvites.length / 5) * 100}
                className="h-1 mt-4 bg-purple-100"
                indicatorClassName="bg-purple-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search members..."
                className="pl-8 border-slate-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px] border-slate-300">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-300 gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setSortField("name")
                    setSortOrder("asc")
                  }}
                >
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortField("name")
                    setSortOrder("desc")
                  }}
                >
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortField("role")
                    setSortOrder("asc")
                  }}
                >
                  Role (ascending)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortField("status")
                    setSortOrder("asc")
                  }}
                >
                  Status (ascending)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortField("lastActive")
                    setSortOrder("desc")
                  }}
                >
                  Most recently active
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Members Tabs */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full sm:w-[400px] bg-slate-100 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Active
            </TabsTrigger>
            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Inactive
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Pending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="overflow-hidden border-none shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-4 font-medium text-slate-700">Member</th>
                      <th className="text-left p-4 font-medium text-slate-700 hidden md:table-cell">Role</th>
                      <th className="text-left p-4 font-medium text-slate-700 hidden lg:table-cell">Status</th>
                      <th className="text-left p-4 font-medium text-slate-700 hidden lg:table-cell">Last Active</th>
                      <th className="text-right p-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-medium">
                                  {member.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <p className="font-medium text-slate-900 cursor-pointer">{member.name}</p>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="flex justify-between space-x-4">
                                      <Avatar className="h-12 w-12">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-medium">
                                          {member.name?.charAt(0) || "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="space-y-1 flex-1">
                                        <h4 className="text-sm font-semibold">{member.name}</h4>
                                        <p className="text-sm text-slate-500">{member.email}</p>
                                        <div className="flex items-center gap-2 pt-2">
                                          {getRoleBadge(member.role)}
                                          {getStatusBadge(member.status, member.userId)}
                                        </div>
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                                <p className="text-sm text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">{getRoleBadge(member.role)}</td>
                          <td className="p-4 hidden lg:table-cell">{getStatusBadge(member.status, member.userId)}</td>
                          <td className="p-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-600">{getFormattedLastActiveTime(member)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.status?.toLowerCase() === "pending" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => approveMember(member.id)}
                                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Approve member</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                                  {member.status?.toLowerCase() !== "active" && (
                                    <DropdownMenuItem onClick={() => approveMember(member.id)}>
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                      Approve
                                    </DropdownMenuItem>
                                  )}
                                  {member.status?.toLowerCase() === "active" && (
                                    <DropdownMenuItem onClick={() => deactivateMember(member.id)}>
                                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <UserCog className="h-4 w-4 mr-2" />
                                      Change Role
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => changeMemberRole(member.id, "MEMBER")}>
                                          Member
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => changeMemberRole(member.id, "MANAGER")}>
                                          Manager
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => removeMember(member.id)}
                                    disabled={member.role?.toUpperCase() === "OWNER"}
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
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
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                              <Users className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-slate-500 mb-2">No members found matching your criteria</p>
                            <Button
                              variant="link"
                              onClick={() => {
                                setSearchQuery("")
                                setRoleFilter("all")
                                setActiveTab("all")
                              }}
                            >
                              Clear filters
                            </Button>
                          </div>
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

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <Collapsible open={showInvites} onOpenChange={setShowInvites} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                    {showInvites ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <h2 className="text-xl font-semibold text-slate-900">Pending Invitations ({pendingInvites.length})</h2>
              </div>
              <Button variant="outline" size="sm" className="border-slate-300 gap-2" onClick={resendAllInvites}>
                <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                Resend All
              </Button>
            </div>

            <CollapsibleContent>
              <Card className="overflow-hidden border-none shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-4 font-medium text-slate-700">Email</th>
                        <th className="text-left p-4 font-medium text-slate-700 hidden md:table-cell">Role</th>
                        <th className="text-left p-4 font-medium text-slate-700 hidden lg:table-cell">Sent</th>
                        <th className="text-right p-4 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((invite) => (
                        <tr key={invite.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-medium text-slate-900">{invite.email}</p>
                          </td>
                          <td className="p-4 hidden md:table-cell">{getRoleBadge(invite.role)}</td>
                          <td className="p-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-600">{invite.sentAt}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => resendInvite(invite.id)}
                                      className="border-slate-300"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
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
                                      onClick={() => cancelInvite(invite.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cancel invitation</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {filteredMembers.length === 0 && activeTab === "all" && searchQuery === "" && roleFilter === "all" && (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-md">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6">
              <UserPlus className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900">No Members Yet</h3>
            <p className="text-slate-500 max-w-md mb-6">
              Your team doesn&apos;t have any members yet. Start building your team by inviting colleagues.
            </p>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg"
            >
              <UserPlus className="h-4 w-4" />
              Invite Your First Team Member
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

