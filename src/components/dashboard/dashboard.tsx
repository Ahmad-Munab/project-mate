'use client';

import type React from "react"
import Link from "next/link"

import { useEffect } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Search,
  Bell,
  Settings,
  User,
  Zap,
  Edit,
  Trash2,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import AIAssistant from "./ai-assistant"

import { getProjects } from "@/app/actions/projects";
import { useProjectStore } from "@/store/projectStore";
import Sidebar from "../shared/sidebar";

type Member = {
  id: string;
  name: string;
  avatar: string;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  progress?: number;
  members?: Member[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignee: string;
  }>;
  dueDate?: string;
};

export default function Dashboard() {

      const {
          projects,
          isLoading,
          error,
          newProjectName,
          newProjectDescription,
          newProjectDueDate,
          editProjectOpen,
          deleteConfirmOpen,
          projectToDelete,
          aiAssistantOpen,
          projectToEdit,
          selectedProject,
          searchQuery,
          setNewProjectDescription,
          setNewProjectDueDate,
          setEditProjectOpen,
          setNewProjectName,
          setProjectToEdit,
          setDeleteConfirmOpen,
          setProjectToDelete,
          setSearchQuery,
          setSelectedProject,
          setAiAssistantOpen,
          setProjects,
          setIsLoading,
          setError,
      } = useProjectStore()
  // const [progress, setProgress] = useState(0); // Removed as it's unused

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      console.log("Client: Starting to load projects");
      setIsLoading(true);
      setError(null);

      try {
        const fetchedProjects = await getProjects();
        console.log("Client: Received projects:", fetchedProjects);
        
        if (mounted) {
          setProjects(fetchedProjects);
          if (fetchedProjects.length > 0) {
            setSelectedProject(fetchedProjects[0]);
            console.log("Client: Set selected project:", fetchedProjects[0]);
          }
        }
      } catch (error) {
        console.error('Client: Error loading projects:', error);
        if (mounted) {
          setProjects([]);
          setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log("Client: Finished loading projects");
        }
      }
    };
    
    loadProjects();

    return () => {
      mounted = false;
      console.log("Client: Cleanup - component unmounted");
    };
  }, [setError, setIsLoading, setProjects, setSelectedProject]);

  // First, define filteredProjects
  const filteredProjects = Array.isArray(projects) 
    ? projects.filter(project =>
        project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Safe getter for recent projects

  // Then handle loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  // Log after defining filteredProjects
  console.log("Client: Rendering with projects:", projects);
  console.log("Client: Filtered projects:", filteredProjects);

  

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    try {
      const response = await fetch("/api/projects/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: projectToEdit?.id,
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      const updatedProject = await response.json();

      const updatedProjects = projects.map((project) =>
        project.id === projectToEdit?.id
          ? {
              ...project,
              name: updatedProject.name,
              description: updatedProject.description,
            }
          : project
      );

      setProjects(updatedProjects);
      if (selectedProject?.id === projectToEdit?.id) {
        setSelectedProject({
          ...selectedProject,
          name: updatedProject.name,
          description: updatedProject.description,
        });
      }

      setEditProjectOpen(false);
      setProjectToEdit(null);
    } catch (error) {
      console.error("Error updating project:", error);
      // Handle error (show toast notification, etc.)
    }
  };

  const openEditProjectModal = (project: Project) => {
    setProjectToEdit(project);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description || '');
    setNewProjectDueDate(project.dueDate || '');
    setEditProjectOpen(true);
  }

  const confirmDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const response = await fetch(`/api/projects/delete?projectId=${projectToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      const updatedProjects = projects.filter((project) => project.id !== projectToDelete);
      setProjects(updatedProjects);

      if (selectedProject?.id === projectToDelete) {
        setSelectedProject(updatedProjects[0] || null);
      }

      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      // Handle error (show toast notification, etc.)
    }
  }

  // handleAddTask and getStatusIcon functions removed or commented out

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500"
      case "In Progress":
        return "bg-blue-500"
      case "Planned":
        return "bg-amber-500"
      case "At Risk":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // getStatusIcon function removed or commented out

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Sidebar with gradient */}
 <Sidebar />
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b bg-card/50 backdrop-blur-md"
        >
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center space-x-4">
              <div className="relative w-64 group">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="pl-8 bg-card/50 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Link href="/dashboard/kanban/projects/new">
                <Button className="bg-gradient-to-r from-primary rainbow-button shadow-lg hover:shadow-primary/20 transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </motion.div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500">U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 backdrop-blur-sm bg-card/95" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User</p>
                      <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-transparent" />
                  <DropdownMenuItem className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-transparent" />
                  <DropdownMenuItem className="hover:bg-gradient-to-r hover:from-red-500/10 hover:to-transparent text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background/95 to-background/90">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold rainbow-text">
                    Projects
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your development projects and tasks
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiAssistantOpen(true)}
                    className="bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 hover:to-primary/10 border-primary/20"
                  >
                    <Zap className="h-4 w-4 mr-2 text-primary" />
                    AI Assistant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-green-500/10 to-transparent hover:from-blue-500/20 hover:to-cyan-500/10 border-green-500/20"
                  >
                    <Filter className="h-4 w-4 mr-2 text-green-500" />
                    Filter
                  </Button>
                </div>
              </div>
            </motion.div>

            <Tabs defaultValue="grid" className="space-y-4">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <TabsList>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value="grid" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {isLoading ? (
                    // Show loading skeleton while data is being fetched
                    <div className="col-span-full">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center p-4 text-muted-foreground">
                      No projects found
                    </div>
                  ) : (
                    filteredProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                      >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{project.name || 'Untitled Project'}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {project.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/kanban/projects/${project.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      <span>View Details</span>
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditProjectModal(project)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => confirmDeleteProject(project.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <Badge variant="outline" className={getStatusColor(project.status || 'PENDING')}>
                                  {project.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={project.progress} className="h-2 w-[60px]" />
                                <span className="text-xs">{project.progress}%</span>
                              </div>
                            </div>
                            {project.dueDate && (
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(project.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                          <CardFooter className="pt-2">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex -space-x-2">
                                {project.members?.slice(0, 3).map((member, i) => (
                                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                asChild
                              >
                                <Link href={`/dashboard/kanban/projects/${project.id}`}>
                                  View Tasks
                                </Link>
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </TabsContent>

                  {/* List View */}

              <TabsContent value="list">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="rounded-md border"
                >
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Project
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Progress
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Due Date
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Team</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {filteredProjects.map((project) => (
                          <tr
                            key={project.id}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <td className="p-4 align-middle">
                              <div>
                                <div className="font-medium">{project.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">{project.description}</div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <Badge
                                variant="outline"
                                className={getStatusColor(project.status || 'PENDING')}
                              >
                                {project.status}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Progress value={project.progress} className="h-2 w-[60px]" />
                                <span className="text-xs">{project.progress}%</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {project.dueDate && new Date(project.dueDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex -space-x-2">
                                {project.members?.slice(0, 3).map((member, i) => (
                                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/dashboard/kanban/projects/${project.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEditProjectModal(project)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDeleteProject(project.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* AI Assistant Drawer */}
      <AIAssistant 
        open={aiAssistantOpen} 
        onOpenChange={setAiAssistantOpen} 
        project={selectedProject ? {
          ...selectedProject,
          members: selectedProject.members?.map(member => ({
            id: member.id,
            name: member.name,
            role: 'MEMBER' // Adding default role since it's required
          }))
        } : null} 
      />
    
      {/* Edit Project Modal */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Describe your project"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-due-date">Due Date</Label>
              <Input
                id="edit-project-due-date"
                type="date"
                value={newProjectDueDate}
                onChange={(e) => setNewProjectDueDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

 
    </div>
  )
}

// These are the missing imports that were used in the component
import { MoreHorizontal, Eye, LogOut } from "lucide-react"

