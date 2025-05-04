"use client"

import AIFloatingButton from "@/components/ai/AIFloatingButton"

type Project = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  readme?: string | null;
}

interface ProjectPageWrapperProps {
  project: Project;
  children: React.ReactNode;
}

export default function ProjectPageWrapper({ project, children }: ProjectPageWrapperProps) {
  return (
    <div className="relative h-full overflow-hidden">
      {children}
      <AIFloatingButton projectId={project.id} />
    </div>
  )
}
