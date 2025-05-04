"use client";

import React, { useState, useEffect, useCallback } from "react";
import * as SimpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";


interface TechIconPickerProps {
  selectedIcon?: string; // For backward compatibility
  selectedIcons?: string[];
  onSelectIcon: (iconSlug: string) => void;
  onClose: () => void;
}

export default function TechIconPicker({
  selectedIcon,
  selectedIcons = [],
  onSelectIcon,
  onClose,
}: TechIconPickerProps) {
  // Combine selectedIcon and selectedIcons for backward compatibility
  const allSelectedIcons = selectedIcons.length > 0
    ? selectedIcons
    : (selectedIcon ? [selectedIcon] : []);
  const [searchQuery, setSearchQuery] = useState("");
  const [icons, setIcons] = useState<{ slug: string; title: string; svg: string }[]>([]);
  const [filteredIcons, setFilteredIcons] = useState<{ slug: string; title: string; svg: string }[]>([]);

  // Load all icons on component mount
  useEffect(() => {
    // Get all icons from simple-icons
    const allIcons = Object.entries(SimpleIcons).filter(
      ([key]) => key !== "default" && !key.startsWith("_")
    );

    // Format icons for display
    const formattedIcons = allIcons.map(([, icon]) => {
      // Cast icon to SimpleIcon type
      const simpleIcon = icon as SimpleIcon;
      return {
        slug: simpleIcon.slug,
        title: simpleIcon.title,
        svg: simpleIcon.svg,
      };
    });

    setIcons(formattedIcons);
    setFilteredIcons(formattedIcons);
  }, []);

  // Filter icons based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredIcons(icons);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = icons.filter(
      (icon) =>
        icon.title.toLowerCase().includes(query) ||
        icon.slug.toLowerCase().includes(query)
    );

    setFilteredIcons(filtered);
  }, [searchQuery, icons]);

  // Create a parent container ref for virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Set up virtualization for the icon grid
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredIcons.length / 5), // 5 icons per row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
  });

  // Handle icon selection
  const handleSelectIcon = useCallback((iconSlug: string) => {
    onSelectIcon(iconSlug);
    onClose();
  }, [onSelectIcon, onClose]);

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] w-full">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {filteredIcons.length} icons found
        </p>
      </div>

      {/* Virtualized icon grid */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto p-4"
        style={{
          height: `550px`,
          width: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const startIndex = rowIndex * 5;
            const rowIcons = filteredIcons.slice(startIndex, startIndex + 5);

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full grid grid-cols-5 gap-2"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {rowIcons.map((icon) => (
                  <button
                    key={icon.slug}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                      allSelectedIcons.includes(icon.slug) && "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                    )}
                    onClick={() => handleSelectIcon(icon.slug)}
                    title={icon.title}
                  >
                    <div
                      className="h-8 w-8 mb-1"
                      dangerouslySetInnerHTML={{ __html: icon.svg }}
                    />
                    <span className="text-xs truncate w-full text-center">
                      {icon.title}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
