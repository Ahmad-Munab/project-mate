'use client';

import type React from "react"
import Link from "next/link"

import { useEffect } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Search,
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

type ProjectWithOwner = Project & {
  isOwner: boolean;
  ownerInfo?: {
    name: string;
    avatar: string;
  };
  myRole?: string;
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
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center bg-card/50 backdrop-blur-md mt-6 px-4 md:px-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full py-4 gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link href="/dashboard/projects/new">
                <Button className="h-9 px-3 sm:px-4">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="sm:inline">New Project</span>
                </Button>
              </Link>
              <div className="relative flex-1 min-w-[200px] sm:w-auto group">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="pl-8 bg-card/50 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-green-500/10 to-transparent hover:from-blue-500/20 hover:to-cyan-500/10 border-green-500/20 h-9 whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="sm:inline">Filter</span>
              </Button>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold rainbow-text">
                    Projects
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Manage your development projects and tasks
                  </p>
                </div>

                <div className="flex items-center mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiAssistantOpen(true)}
                    className="bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 hover:to-primary/10 border-primary/20 w-full sm:w-auto h-9"
                  >
                    <Zap className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span>AI Assistant</span>
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
                {/* My Projects */}
                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4">My Projects</h2>
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects
                      .filter(project => project.isOwner)
                      .map((project, index) => (
                        <motion.div
                          key={project.id}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                        >
                          <Card className="overflow-hidden hover:shadow-md transition-shadow border-primary/5 hover:border-primary/10">
                            <CardHeader className="pb-2 p-4 sm:p-6">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base sm:text-lg truncate">{project.name || 'Untitled Project'}</CardTitle>
                                  <CardDescription className="line-clamp-2 text-xs sm:text-sm mt-1">
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
                                      <Link href={`/dashboard/projects/${project.id}`}>
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
                            <CardContent className="pb-2 px-4 sm:px-6">
                              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <div className="flex items-center">
                                  <Badge variant="outline" className={`${getStatusColor(project.status || 'PENDING')} text-xs whitespace-nowrap`}>
                                    {project.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={project.progress} className="h-1.5 sm:h-2 w-[50px] sm:w-[60px]" />
                                  <span className="text-xs">{project.progress}%</span>
                                </div>
                              </div>
                              {project.dueDate && (
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Due: {new Date(project.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </CardContent>
                            <CardFooter className="pt-2 px-4 sm:px-6">
                              <div className="flex justify-between items-center w-full gap-2">
                                <div className="flex -space-x-2 flex-shrink-0">
                                  {project.members?.slice(0, 3).map((member, i) => (
                                    <Avatar key={i} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background">
                                      <AvatarImage src={member.avatar} alt={member.name} />
                                      <AvatarFallback className="text-xs">{member.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                                  asChild
                                >
                                  <Link href={`/dashboard/projects/${project.id}`}>
                                    View Tasks
                                  </Link>
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                  </div>
                </div>

                {/* Shared Projects */}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-4">Shared With Me</h2>
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects
                      .filter(project => !project.isOwner)
                      .map((project, index) => (
                        <motion.div
                          key={project.id}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                        >
                          <Card className="overflow-hidden hover:shadow-md transition-shadow border-primary/5 hover:border-primary/10">
                            <CardHeader className="pb-2 p-4 sm:p-6">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                                    <AvatarImage src={project.ownerInfo?.avatar} />
                                    <AvatarFallback>{project.ownerInfo?.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <CardTitle className="text-base sm:text-lg truncate">{project.name}</CardTitle>
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                      By {project.ownerInfo?.name} • You are {project.myRole}
                                    </p>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/dashboard/projects/${project.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>View Details</span>
                                      </Link>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2 px-4 sm:px-6">
                              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <div className="flex items-center">
                                  <Badge variant="outline" className={`${getStatusColor(project.status || 'PENDING')} text-xs whitespace-nowrap`}>
                                    {project.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={project.progress} className="h-1.5 sm:h-2 w-[50px] sm:w-[60px]" />
                                  <span className="text-xs">{project.progress}%</span>
                                </div>
                              </div>
                              {project.dueDate && (
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Due: {new Date(project.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </CardContent>
                            <CardFooter className="pt-2 px-4 sm:px-6">
                              <div className="flex justify-between items-center w-full gap-2">
                                <div className="flex -space-x-2 flex-shrink-0">
                                  {project.members?.slice(0, 3).map((member, i) => (
                                    <Avatar key={i} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background">
                                      <AvatarImage src={member.avatar} alt={member.name} />
                                      <AvatarFallback className="text-xs">{member.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                                  asChild
                                >
                                  <Link href={`/dashboard/projects/${project.id}`}>
                                    View Tasks
                                  </Link>
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                  </div>
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
                  <div className="relative w-full overflow-x-auto">
                    <table className="w-full caption-bottom text-xs sm:text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground">
                            Project
                          </th>
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                            Progress
                          </th>
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                            Due Date
                          </th>
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Team</th>
                          <th className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground">
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
                            <td className="p-2 sm:p-4 align-middle">
                              <div className="flex items-center gap-2 sm:gap-3">
                                {!project.isOwner && (
                                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                                    <AvatarImage src={project.ownerInfo?.avatar} />
                                    <AvatarFallback className="text-xs">{project.ownerInfo?.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0 max-w-[180px] sm:max-w-none">
                                  <div className="font-medium truncate">{project.name}</div>
                                  {!project.isOwner && (
                                    <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                      By {project.ownerInfo?.name} • You are {project.myRole}
                                    </div>
                                  )}
                                  <div className="text-xs sm:text-sm text-muted-foreground line-clamp-1 hidden sm:block">
                                    {project.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 align-middle hidden sm:table-cell">
                              <Badge
                                variant="outline"
                                className={`${getStatusColor(project.status || 'PENDING')} text-xs whitespace-nowrap`}
                              >
                                {project.status}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-4 align-middle hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Progress value={project.progress} className="h-1.5 sm:h-2 w-[40px] sm:w-[60px]" />
                                <span className="text-xs">{project.progress}%</span>
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 align-middle hidden md:table-cell">
                              <span className="text-xs sm:text-sm">
                                {project.dueDate && new Date(project.dueDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-2 sm:p-4 align-middle hidden sm:table-cell">
                              <div className="flex -space-x-2">
                                {project.members?.slice(0, 3).map((member, i) => (
                                  <Avatar key={i} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback className="text-xs">{member.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 align-middle">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" asChild>
                                  <Link href={`/dashboard/projects/${project.id}`}>
                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Link>
                                </Button>
                                {project.isOwner && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openEditProjectModal(project)}>
                                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                      onClick={() => confirmDeleteProject(project.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  </>
                                )}
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

// Import all required icons
import { MoreHorizontal, Eye, Filter } from "lucide-react"

