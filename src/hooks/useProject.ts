"use client";

/**
 * useProject Hook
 * This hook provides access to project data based on a project ID
 */

import { useState, useEffect } from "react";

// Define the Project type
interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId?: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  readme?: string | null;
  members?: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
}

/**
 * Hook to fetch and provide project data
 * @param projectId - The ID of the project to fetch
 * @returns Object containing the project data and loading state
 */
export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          // If the project is not found or unauthorized, create a minimal project object with the ID
          if (response.status === 404 || response.status === 403) {
            const statusText = response.status === 404 ? "not found" : "unauthorized access";
            console.warn(`Project ${statusText}: ${projectId}, using minimal project object`);
            setProject({
              id: projectId,
              name: response.status === 404 ? "Unknown Project" : "Unauthorized Project",
              description: "",
              ownerId: ""
            });
            return;
          }
          throw new Error(`Failed to fetch project: ${response.status}`);
        }

        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch project");

        // Create a minimal project object with the ID to prevent UI errors
        setProject({
          id: projectId,
          name: "Unknown Project",
          description: "",
          ownerId: ""
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return {
    project,
    isLoading,
    error
  };
}

export default useProject;
