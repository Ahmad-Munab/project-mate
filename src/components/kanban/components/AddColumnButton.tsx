"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AddColumnButtonProps {
  onAddColumn: (name: string) => Promise<void>;
}

export default function AddColumnButton({ onAddColumn }: AddColumnButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [columnName, setColumnName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when adding column
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddColumn = async () => {
    if (!columnName.trim()) {
      setIsAdding(false);
      return;
    }

    try {
      await onAddColumn(columnName);
      setColumnName("");
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding column:", error);
      toast.error("Failed to add column");
    }
  };

  if (isAdding) {
    return (
      <div className="w-[320px] bg-gray-100 dark:bg-gray-800/60 rounded-md p-2 shadow-sm">
        <Input
          ref={inputRef}
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)}
          placeholder="Enter column title..."
          className="mb-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && columnName.trim()) {
              handleAddColumn();
            } else if (e.key === "Escape") {
              setIsAdding(false);
              setColumnName("");
            }
          }}
        />
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleAddColumn}>
            Add Column
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setIsAdding(false);
              setColumnName("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="h-10 w-[320px] justify-start bg-gray-100/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60 border-dashed shadow-sm"
      onClick={() => setIsAdding(true)}
    >
      <Plus className="h-4 w-4 mr-1" />
      Add another column
    </Button>
  );
}
