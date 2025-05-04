/**
 * Card Labels Component
 * Displays colored labels for a task card
 */

import { cn } from "@/lib/utils";
import { labelColors } from "../types";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CardLabelsProps {
  labels: Label[];
}

export default function CardLabels({ labels }: CardLabelsProps) {
  if (!labels || labels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 px-2 pt-2">
      {labels.map((label) => (
        <div
          key={label.id}
          className={cn(
            "h-2 w-10 rounded-sm",
            labelColors[label.color as keyof typeof labelColors] || "bg-gray-500"
          )}
          title={label.name}
        />
      ))}
    </div>
  );
}
