"use client";

import { ArrowDownAZ, ArrowUpAZ, ArrowDownUp, Calendar, Clock, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortMenuProps {
  onSort: (field: string, direction: "asc" | "desc") => void;
  currentSortField?: string;
  currentSortDirection?: "asc" | "desc";
}

export default function SortMenu({
  onSort,
  currentSortField = "createdAt",
  currentSortDirection = "desc",
}: SortMenuProps) {
  // Apply sorting directly
  const handleSort = (field: string, direction: "asc" | "desc") => {
    console.log("SortMenu: handleSort called with", field, direction);
    // Call the parent's onSort function directly
    onSort(field, direction);
  };
  // Sort options with icons and labels
  const sortOptions = [
    {
      field: "title",
      label: "Title",
      icon: currentSortDirection === "asc" ? <ArrowUpAZ className="h-4 w-4 mr-2" /> : <ArrowDownAZ className="h-4 w-4 mr-2" />,
      description: "Sort once alphabetically by title",
    },
    {
      field: "priority",
      label: "Priority",
      icon: <AlertTriangle className="h-4 w-4 mr-2" />,
      description: "Sort once by task priority level",
    },
    {
      field: "dueDate",
      label: "Due Date",
      icon: <Calendar className="h-4 w-4 mr-2" />,
      description: "Sort once by upcoming deadlines",
    },
    {
      field: "createdAt",
      label: "Creation Date",
      icon: <Clock className="h-4 w-4 mr-2" />,
      description: "Sort once by when tasks were created",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          <ArrowDownUp className="h-4 w-4" />
          <span>Sort Once</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.field}
            onClick={() => {
              console.log(`Clicked sort option: ${option.field}`);

              // Always use a consistent direction for each field
              let direction: "asc" | "desc";

              // Set appropriate direction based on field type
              switch (option.field) {
                case "title":
                  direction = "asc"; // Alphabetical A-Z
                  break;
                case "priority":
                  direction = "asc"; // Urgent first
                  break;
                case "dueDate":
                  direction = "asc"; // Upcoming first
                  break;
                default:
                  direction = "desc"; // Newest first
              }

              // Apply the sort
              handleSort(option.field, direction);
            }}
            className={cn(
              "flex items-center cursor-pointer",
              currentSortField === option.field && "font-medium bg-accent"
            )}
          >
            {option.icon}
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            console.log("Toggling sort direction");
            // Toggle direction for current field
            const newDirection = currentSortDirection === "asc" ? "desc" : "asc";
            handleSort(currentSortField, newDirection);
          }}
          className="cursor-pointer font-medium"
        >
          {currentSortDirection === "asc" ? (
            <>
              <ArrowDownAZ className="h-4 w-4 mr-2" />
              <span>Descending Order</span>
            </>
          ) : (
            <>
              <ArrowUpAZ className="h-4 w-4 mr-2" />
              <span>Ascending Order</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
