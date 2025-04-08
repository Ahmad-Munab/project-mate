"use client"

import { useState } from "react"
import AIFloatingButton from "./ai-floating-button"
import type { Task } from "@/components/kanban/ProjectBoard"

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
    <div className="relative h-full">
      {children}
      <AIFloatingButton project={project} />
    </div>
  )
}
