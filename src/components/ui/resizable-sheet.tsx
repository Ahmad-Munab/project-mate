"use client";

import React, { useState, useEffect, useRef } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResizableSheetContent({
  className,
  children,
  side = "right",
  defaultWidth = 384, // Default width for sm:max-w-sm
  minWidth = 320,
  maxWidth = 600,
  storageKey = "ai-sidebar-width",
  hideCloseButton = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  hideCloseButton?: boolean;
}) {
  // Only allow resizing for right-side sheets
  const isResizable = side === "right";
  
  // State to track the sheet width
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (!isResizable) return;
    
    const savedWidth = localStorage.getItem(storageKey);
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth);
      }
    }
  }, [storageKey, minWidth, maxWidth, isResizable]);

  // Handle mouse down on the resize handle
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizable) return;
    
    e.preventDefault();
    setIsResizing(true);
    
    // Add event listeners for mouse move and mouse up
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle mouse move during resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !sheetRef.current) return;
    
    // For right-side sheet, calculate width from right edge of window to mouse position
    const newWidth = window.innerWidth - e.clientX;
    
    // Apply constraints
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setWidth(constrainedWidth);
  };

  // Handle mouse up to end resizing
  const handleMouseUp = () => {
    if (!isResizable) return;
    
    setIsResizing(false);
    
    // Remove event listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    
    // Save width to localStorage
    localStorage.setItem(storageKey, width.toString());
  };

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay 
        className={cn(
          "fixed inset-0 z-50 bg-black/50",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        )}
      />
      <SheetPrimitive.Content
        ref={sheetRef}
        className={cn(
          "bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          "data-[state=closed]:animate-out data-[state=open]:animate-in",
          side === "right" && [
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "inset-y-0 right-0 h-full border-l"
          ],
          side === "left" && [
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm"
          ],
          side === "top" && [
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
            "inset-x-0 top-0 h-auto border-b"
          ],
          side === "bottom" && [
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "inset-x-0 bottom-0 h-auto border-t"
          ],
          isResizing && "transition-none select-none",
          className
        )}
        style={isResizable ? { width: `${width}px` } : undefined}
        {...props}
      >
        {/* Resize handle - only for right-side sheets */}
        {isResizable && (
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-2 cursor-ew-resize flex items-center justify-center",
              "hover:bg-gray-300/40 dark:hover:bg-gray-600/40 transition-colors",
              isResizing && "bg-primary/20"
            )}
            onMouseDown={handleMouseDown}
          >
            <div 
              className={cn(
                "h-8 w-1 rounded-full transition-colors",
                isResizing 
                  ? "bg-primary" 
                  : "bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-500"
              )} 
            />
          </div>
        )}
        
        {children}
        
        {!hideCloseButton && (
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
