"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"

export type Organization = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  logo_url?: string
  personal: boolean
}

export type Project = {
  id: string
  name: string
  description: string
  organization_id: string
  status: "active" | "archived" | "deleted"
  created_at: string
  updated_at: string
}

export type OrganizationMember = {
  id: string
  organization_id: string
  user_id: string
  role: "OWNER" | "ADMIN" | "MEMBER"
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

type OrganizationContextType = {
  organizations: Organization[]
  currentOrganization: Organization | null
  projects: Project[]
  members: OrganizationMember[]
  isLoading: boolean
  setCurrentOrganization: (org: Organization) => void
  createOrganization: (name: string) => Promise<Organization>
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<Organization>
  deleteOrganization: (id: string) => Promise<void>
  createProject: (data: { name: string; description: string; organizationId: string }) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  inviteMember: (email: string, role: "ADMIN" | "MEMBER") => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  updateMemberRole: (memberId: string, role: "ADMIN" | "MEMBER") => Promise<void>
  refreshData: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  // Fetch projects and members when current organization changes
  useEffect(() => {
    if (currentOrganization) {
      fetchProjects(currentOrganization.id)
      fetchMembers(currentOrganization.id)
    }
  }, [currentOrganization])

  const fetchOrganizations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/organizations")
      if (!response.ok) throw new Error("Failed to fetch organizations")

      const data = await response.json()
      setOrganizations(data)

      // Set first organization as current if none is selected
      if (data.length > 0 && !currentOrganization) {
        setCurrentOrganization(data[0])
      }
    } catch (error) {
      console.error("Error fetching organizations:", error)
      toast.error("Failed to load organizations")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjects = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")

      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("Failed to load projects")
    }
  }

  const fetchMembers = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")

      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error("Error fetching members:", error)
      toast.error("Failed to load team members")
    }
  }

  const createOrganization = async (name: string): Promise<Organization> => {
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) throw new Error("Failed to create organization")

      const newOrg = await response.json()
      setOrganizations((prev) => [...prev, newOrg])
      toast.success("Organization created successfully")
      return newOrg
    } catch (error) {
      console.error("Error creating organization:", error)
      toast.error("Failed to create organization")
      throw error
    }
  }

  const updateOrganization = async (id: string, data: Partial<Organization>): Promise<Organization> => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update organization")

      const updatedOrg = await response.json()
      setOrganizations((prev) => prev.map((org) => (org.id === id ? updatedOrg : org)))

      if (currentOrganization?.id === id) {
        setCurrentOrganization(updatedOrg)
      }

      toast.success("Organization updated successfully")
      return updatedOrg
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error("Failed to update organization")
      throw error
    }
  }

  const deleteOrganization = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete organization")

      setOrganizations((prev) => prev.filter((org) => org.id !== id))

      if (currentOrganization?.id === id) {
        setCurrentOrganization(organizations.find((org) => org.id !== id) || null)
      }

      toast.success("Organization deleted successfully")
    } catch (error) {
      console.error("Error deleting organization:", error)
      toast.error("Failed to delete organization")
      throw error
    }
  }

  const createProject = async (data: {
    name: string
    description: string
    organizationId: string
  }): Promise<Project> => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create project")

      const newProject = await response.json()
      setProjects((prev) => [...prev, newProject])
      toast.success("Project created successfully")
      return newProject
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
      throw error
    }
  }

  const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update project")

      const updatedProject = await response.json()
      setProjects((prev) => prev.map((project) => (project.id === id ? updatedProject : project)))
      toast.success("Project updated successfully")
      return updatedProject
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error("Failed to update project")
      throw error
    }
  }

  const deleteProject = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete project")

      setProjects((prev) => prev.filter((project) => project.id !== id))
      toast.success("Project deleted successfully")
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error("Failed to delete project")
      throw error
    }
  }

  const inviteMember = async (email: string, role: "ADMIN" | "MEMBER"): Promise<void> => {
    if (!currentOrganization) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })

      if (!response.ok) throw new Error("Failed to invite member")

      toast.success(`Invitation sent to ${email}`)
      await fetchMembers(currentOrganization.id)
    } catch (error) {
      console.error("Error inviting member:", error)
      toast.error("Failed to send invitation")
      throw error
    }
  }

  const removeMember = async (memberId: string): Promise<void> => {
    if (!currentOrganization) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to remove member")

      setMembers((prev) => prev.filter((member) => member.id !== memberId))
      toast.success("Team member removed successfully")
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("Failed to remove team member")
      throw error
    }
  }

  const updateMemberRole = async (memberId: string, role: "ADMIN" | "MEMBER"): Promise<void> => {
    if (!currentOrganization) return

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) throw new Error("Failed to update member role")

      setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, role } : member)))
      toast.success("Member role updated successfully")
    } catch (error) {
      console.error("Error updating member role:", error)
      toast.error("Failed to update member role")
      throw error
    }
  }

  const refreshData = async (): Promise<void> => {
    await fetchOrganizations()
    if (currentOrganization) {
      await fetchProjects(currentOrganization.id)
      await fetchMembers(currentOrganization.id)
    }
  }

  const value = {
    organizations,
    currentOrganization,
    projects,
    members,
    isLoading,
    setCurrentOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    createProject,
    updateProject,
    deleteProject,
    inviteMember,
    removeMember,
    updateMemberRole,
    refreshData,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

