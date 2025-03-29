import { create } from 'zustand'

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  progress?: number;
  members?: {
    id: string;
    name: string;
    avatar: string;
  }[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignee: string;
  }>;
  dueDate?: string;
}

interface ProjectStore {
  projects: Project[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  selectedProject: Project | null
  newProjectName: string
  newProjectDescription: string
  newProjectDueDate: string
  editProjectOpen: boolean
  projectToEdit: Project | null
  deleteConfirmOpen: boolean
  projectToDelete: string | null
  aiAssistantOpen: boolean
  
  setProjects: (projects: Project[]) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setSelectedProject: (project: Project | null) => void
  setNewProjectName: (name: string) => void
  setNewProjectDescription: (description: string) => void
  setNewProjectDueDate: (date: string) => void
  setEditProjectOpen: (open: boolean) => void
  setProjectToEdit: (project: Project | null) => void
  setDeleteConfirmOpen: (open: boolean) => void
  setProjectToDelete: (projectId: string | null) => void
  setAiAssistantOpen: (open: boolean) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  isLoading: true, // Set initial loading state to false
  error: null,
  searchQuery: "",
  selectedProject: null,
  newProjectName: "",
  newProjectDescription: "",
  newProjectDueDate: "",
  editProjectOpen: false,
  projectToEdit: null,
  deleteConfirmOpen: false,
  projectToDelete: null,
  aiAssistantOpen: false,

  setProjects: (projects) => set({ projects }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  setNewProjectName: (newProjectName) => set({ newProjectName }),
  setNewProjectDescription: (newProjectDescription) => set({ newProjectDescription }),
  setNewProjectDueDate: (newProjectDueDate) => set({ newProjectDueDate }),
  setEditProjectOpen: (editProjectOpen) => set({ editProjectOpen }),
  setProjectToEdit: (projectToEdit) => set({ projectToEdit }),
  setDeleteConfirmOpen: (deleteConfirmOpen) => set({ deleteConfirmOpen }),
  setProjectToDelete: (projectToDelete) => set({ projectToDelete }),
  setAiAssistantOpen: (aiAssistantOpen) => set({ aiAssistantOpen }),
}))
