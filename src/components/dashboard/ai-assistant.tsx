"use client"

import { AIAssistant as AIAssistantComponent } from "@/components/ai/AIAssistant"
import { Project } from "@/components/ai/types"

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export default function AIAssistant({ open, onOpenChange, project }: AIAssistantProps) {
  return <AIAssistantComponent open={open} onOpenChange={onOpenChange} project={project} />;
}
