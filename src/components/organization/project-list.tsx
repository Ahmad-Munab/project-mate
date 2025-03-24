"use client"

import { Progress } from "@/components/ui/progress"

import { AvatarFallback } from "@/components/ui/avatar"

import { AvatarImage } from "@/components/ui/avatar"

import { Avatar } from "@/components/ui/avatar"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Search, Filter, Grid, List, Kanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectCard } from "./project-card"
import { useOrganization } from "./organization-context"
import { OrganizationSwitcher } from "./organization-switcher"

export function ProjectList() {
  const router = useRouter()
  const { projects, currentOrganization } = useOrganization()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewType, setViewType] = useState<"grid" | "list" | "board">("grid")

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Mock data for demo purposes - in a real app, you'd fetch this from your API
  const projectsWithMetadata = filteredProjects.map((project) => ({
    ...project,
    members: Array(Math.floor(Math.random() * 5) + 1)
      .fill(0)
      .map((_, i) => ({
        id: `member-${i}`,
        name: `Team Member ${i + 1}`,
        avatar_url: `/placeholder.svg?height=32&width=32`,
      })),
    taskCount: Math.floor(Math.random() * 20),
    progress: Math.floor(Math.random() * 100),
  }))

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects in {currentOrganization?.name || "your organization"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <OrganizationSwitcher />
          <Button onClick={() => router.push("/dashboard/projects/new")} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Tabs defaultValue={viewType} onValueChange={(value) => setViewType(value as "grid" | "list" | "board")}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="board">
                <Kanban className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {projectsWithMetadata.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-8 text-center">
            <CardContent className="pt-6 flex flex-col items-center">
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No projects match your search criteria."
                  : "Get started by creating your first project."}
              </p>
              <Button onClick={() => router.push("/dashboard/projects/new")} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <TabsContent value="grid" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projectsWithMetadata.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  members={project.members}
                  taskCount={project.taskCount}
                  progress={project.progress}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="space-y-4">
              {projectsWithMetadata.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex -space-x-2">
                            {project.members.slice(0, 3).map((member, i) => (
                              <Avatar key={i} className="h-7 w-7 border-2 border-background">
                                <AvatarImage src={member.avatar_url} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="h-2 w-20" />
                            <span className="text-xs text-muted-foreground">{project.progress}%</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-0">
            <div className="border rounded-lg p-4">
              <div className="flex justify-center items-center p-8">
                <Button onClick={() => router.push(`/dashboard/projects/${projectsWithMetadata[0]?.id}`)}>
                  Open Kanban Board
                </Button>
              </div>
            </div>
          </TabsContent>
        </>
      )}
    </div>
  )
}

