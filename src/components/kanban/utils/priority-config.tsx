/**
 * Priority Configuration
 * Defines the visual representation and behavior of task priorities
 */

import React from "react";
import { ArrowDown, ArrowRight, ArrowUp, AlertTriangle } from "lucide-react";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface PriorityInfo {
  color: string;
  icon: React.ReactNode;
  label: string;
  barColor: string;
}

/**
 * Priority configuration for task cards
 */
export const priorityConfig: Record<PriorityLevel, PriorityInfo> = {
  LOW: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <ArrowDown className="h-3 w-3" />,
    label: "Low",
    barColor: "bg-blue-500"
  },
  MEDIUM: {
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <ArrowRight className="h-3 w-3" />,
    label: "Medium",
    barColor: "bg-green-500"
  },
  HIGH: {
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: <ArrowUp className="h-3 w-3" />,
    label: "High",
    barColor: "bg-orange-500"
  },
  URGENT: {
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Urgent",
    barColor: "bg-red-500"
  }
};

/**
 * Get priority information for a given priority level
 * @param priority - The priority level
 * @returns The priority information
 */
export function getPriorityInfo(priority: string): PriorityInfo {
  return priorityConfig[priority as PriorityLevel] || priorityConfig.MEDIUM;
}
