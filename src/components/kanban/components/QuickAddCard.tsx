/**
 * Quick Add Card Component
 * Allows users to quickly add a new card to a column
 */

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickAddCardProps {
  statusKey: string;
  onAddTask: (statusKey: string) => void;
  onCancel: () => void;
}

export default function QuickAddCard({
  statusKey,
  onAddTask,
  onCancel
}: QuickAddCardProps) {
  const [newCardTitle, setNewCardTitle] = useState("");
  const newCardInputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    if (newCardInputRef.current) {
      newCardInputRef.current.focus();
    }
  }, []);

  // Handle quick add card
  const handleQuickAddCard = async () => {
    if (!newCardTitle.trim()) {
      onCancel();
      return;
    }

    try {
      // Call the onAddTask function
      onAddTask(statusKey);

      // Reset state
      setNewCardTitle("");
      onCancel();
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error("Failed to add card");
    }
  };

  return (
    <div className="p-1 mb-2 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
      <Input
        ref={newCardInputRef}
        value={newCardTitle}
        onChange={(e) => setNewCardTitle(e.target.value)}
        placeholder="Enter a title for this card..."
        className="text-sm mb-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" && newCardTitle.trim()) {
            handleQuickAddCard();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={handleQuickAddCard}>
          Add Card
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
