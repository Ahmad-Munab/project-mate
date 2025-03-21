'use client';

import React, { useState, useEffect } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";

export function Search() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Handle keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center px-3 max-w-sm w-full h-9 bg-background rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
      >
        <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Input
          className="flex w-full bg-transparent border-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
          placeholder="Search tasks... (⌘K)"
          onClick={() => setOpen(true)}
          readOnly
        />
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search all tasks and projects..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Tasks">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                // Add navigation or action here
              }}
            >
              <span>Example Task</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Projects">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                // Add navigation or action here
              }}
            >
              <span>Example Project</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
