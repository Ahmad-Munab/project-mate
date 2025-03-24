'use client';

import type React from "react"
import Link from "next/link"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Search,
  Bell,
  Settings,
  User,
  Calendar,
  BarChart2,
  Code,
  Users,
  MessageSquare,
  Zap,
  Sparkles,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import ProjectBoard from "./project-board"
import AIAssistant from "./ai-assistant"

import { getProjects } from "@/app/actions/projects";

type Project = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  members?: any[];
  tasks?: any[];
};

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("Planned");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [progress, setProgress] = useState(0);

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
          setError(error.message);
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
  }, []);

  useEffect(() => {
    // Animate progress bars on load
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  // First, define filteredProjects
  const filteredProjects = Array.isArray(projects) 
    ? projects.filter(project =>
        project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Safe getter for recent projects
  const recentProjects = Array.isArray(projects) ? projects.slice(0, 5) : [];

  // Then handle loading and error states
  if (isLoading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  // Log after defining filteredProjects
  console.log("Client: Rendering with projects:", projects);
  console.log("Client: Filtered projects:", filteredProjects);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject = {
      id: Math.random().toString(),
      name: newProjectName,
      description: newProjectDescription,
      progress: 0,
      status: "Planned",
      dueDate: newProjectDueDate,
      members: [],
      tasks: [],
    };
    setProjects([...projects, newProject]);
    setNewProjectName("");
    setNewProjectDescription("");
    setNewProjectDueDate("");
    setNewProjectOpen(false);
  };

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
          projectId: projectToEdit.id,
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      const updatedProject = await response.json();

      const updatedProjects = projects.map((project) =>
        project.id === projectToEdit.id
          ? {
              ...project,
              name: updatedProject.name,
              description: updatedProject.description,
            }
          : project
      );

      setProjects(updatedProjects);
      if (selectedProject?.id === projectToEdit.id) {
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

  const openEditProjectModal = (project: any) => {
    setProjectToEdit(project)
    setNewProjectName(project.name)
    setNewProjectDescription(project.description)
    setNewProjectDueDate(project.dueDate)
    setEditProjectOpen(true)
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const newTask = {
      id: `t${Math.random().toString()}`,
      title: newTaskTitle,
      status: newTaskStatus,
      assignee: newTaskAssignee,
    };

    const updatedProject = {
      ...selectedProject,
      tasks: [...(selectedProject.tasks || []), newTask],
    };

    const updatedProjects = projects.map((project) =>
      project.id === selectedProject.id ? updatedProject : project
    );

    setProjects(updatedProjects);
    setSelectedProject(updatedProject);
    setNewTaskTitle("");
    setNewTaskAssignee("");
    setNewTaskStatus("Planned");
    setNewTaskOpen(false);
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Planned":
        return <Calendar className="h-4 w-4 text-amber-500" />
      case "At Risk":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex w-64 flex-col border-r bg-card"
      >
        <div className="p-4 border-b flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ProjectMate</h1>
        </div>

        <div className="flex-1 overflow-auto py-2">
          <nav className="space-y-1 px-2">
            <Button variant="secondary" className="w-full justify-start" asChild>
              <a href="#" className="font-medium">
                <Code className="mr-2 h-4 w-4" />
                Projects
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="#" className="font-medium">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </a>
            </Button>
          </nav>

          <Separator className="my-4" />

          <div className="px-4 mb-2">
            {/*  I Will Make It Functional Later */}
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Recent Projects</h2>
            <ul className="space-y-1">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm font-normal"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className={`mr-2 h-2 w-2 rounded-full ${getStatusColor(project.status || 'default')}`} />
                    <span className="truncate">{project.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start text-primary border-primary/20 hover:bg-primary/10 hover:text-primary"
            onClick={() => setAiAssistantOpen(true)}
          >
            <Zap className="mr-2 h-4 w-4 text-primary" />
            AI Assistant
          </Button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="border-b bg-card"
        >
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center md:hidden">
              <Sparkles className="h-6 w-6 text-primary mr-2" />
              <h1 className="text-xl font-bold">ProjectMate</h1>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Link href="/dashboard/kanban/projects/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User</p>
                      <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* Mobile search and actions */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="md:hidden p-4 border-b bg-card"
        >
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href="/dashboard/kanban/projects/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                  <p className="text-muted-foreground">Manage your development projects and tasks</p>
                </div>
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiAssistantOpen(true)}
                    className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Zap className="h-4 w-4 mr-2 text-primary" />
                    AI Assistant
                  </Button>
                  {/* I Will Make Filter Functionaliy Work Later Maybe */}
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
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
                  {filteredProjects.length === 0 ? (
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
                                  <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>View Details</span>
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
                                <Badge variant="outline" className={getStatusColor(project.status)}>
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
                                onClick={() => setSelectedProject(project)}
                              >
                                View Tasks
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="board">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <ProjectBoard project={selectedProject} onAddTask={() => setNewTaskOpen(true)} />
                </motion.div>
              </TabsContent>

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
                                className={getStatusColor(project.status)}
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
                                <Button variant="ghost" size="icon" onClick={() => setSelectedProject(project)}>
                                  <Eye className="h-4 w-4" />
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
      <AIAssistant open={aiAssistantOpen} onOpenChange={setAiAssistantOpen} project={selectedProject} />

      {/* New Project Modal */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new project to your workspace. Fill in the details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Describe your project"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due-date">Due Date</Label>
              <Input
                id="project-due-date"
                type="date"
                value={newProjectDueDate}
                onChange={(e) => setNewProjectDueDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* New Task Modal */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>Add a new task to the project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProject?.members.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                <SelectTrigger id="task-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// These are the missing imports that were used in the component
import { MoreHorizontal, Eye, LogOut } from "lucide-react"

