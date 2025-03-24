"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus, Settings, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOrganization, type Organization } from "./organization-context"
import { cn } from "@/lib/utils"

export function OrganizationSwitcher() {
  const router = useRouter()
  const { organizations, currentOrganization, setCurrentOrganization, createOrganization } = useOrganization()
  const [open, setOpen] = useState(false)
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    setIsCreating(true)
    try {
      const newOrg = await createOrganization(newOrgName)
      setCurrentOrganization(newOrg)
      setShowNewOrgDialog(false)
      setNewOrgName("")
      router.push("/dashboard")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectOrg = (org: Organization) => {
    setCurrentOrganization(org)
    setOpen(false)
    router.push("/dashboard")
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select organization"
            className="w-[200px] justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              {currentOrganization ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={currentOrganization.logo_url || "/placeholder.svg?height=32&width=32"}
                      alt={currentOrganization.name}
                    />
                    <AvatarFallback>{currentOrganization.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{currentOrganization.name}</span>
                </>
              ) : (
                "Select organization"
              )}
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search organization..." />
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations.map((org) => (
                  <CommandItem key={org.id} onSelect={() => handleSelectOrg(org)} className="text-sm">
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage src={org.logo_url || "/placeholder.svg?height=32&width=32"} alt={org.name} />
                      <AvatarFallback>{org.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{org.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentOrganization?.id === org.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowNewOrgDialog(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </CommandItem>
                </DialogTrigger>
                {currentOrganization && (
                  <CommandItem
                    onSelect={() => {
                      router.push(`/dashboard/organizations/${currentOrganization.id}/settings`)
                      setOpen(false)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Organization Settings
                  </CommandItem>
                )}
                {currentOrganization && (
                  <CommandItem
                    onSelect={() => {
                      router.push(`/dashboard/organizations/${currentOrganization.id}/members`)
                      setOpen(false)
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Members
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewOrgDialog} onOpenChange={setShowNewOrgDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>Add a new organization to manage projects and team members.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrg}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Organization name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full"
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewOrgDialog(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newOrgName.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

