/**
 * AI Component Types
 * Type definitions for AI components
 */

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  readme?: string | null;
};

export interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export interface AIFloatingButtonProps {
  project: Project | null;
}

export interface PendingAction {
  type: string;
  parameters: {
    description?: string;
    taskDescription?: string;
    taskId?: string;
    columnId?: string;
    columnName?: string;
    addSolutions?: boolean;
    [key: string]: string | boolean | number | undefined; // Allow other properties
  };
  needsConfirmation?: boolean;
}

export interface AIAction {
  type: string;
  execute: () => Promise<any>;
  requiresConfirmation: boolean;
  description: string;
}
