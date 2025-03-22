"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Create a context to manage command state
type CommandContextType = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  itemCount: number;
  setItemCount: (count: number) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerItem: (id: string) => void;
  unregisterItem: (id: string) => void;
  selectItem: (id: string) => void;
  selectedId: string | null;
};

const CommandContext = React.createContext<CommandContextType | undefined>(
  undefined
);

function useCommandContext() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("Command components must be used within a CommandProvider");
  }
  return context;
}

// Main Command component
function Command({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [itemCount, setItemCount] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<string[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const registerItem = React.useCallback((id: string) => {
    setItems((prev) => [...prev, id]);
  }, []);

  const unregisterItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item !== id));
  }, []);

  const selectItem = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      const index = items.findIndex((item) => item === id);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    },
    [items]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, itemCount));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + itemCount) % Math.max(1, itemCount)
          );
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, itemCount]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <CommandContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        selectedIndex,
        setSelectedIndex,
        itemCount,
        setItemCount,
        open,
        setOpen,
        registerItem,
        unregisterItem,
        selectItem,
        selectedId,
      }}
    >
      <div
        data-slot="command"
        className={cn(
          "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const context = React.useContext(CommandContext);

  // If used within a Command context, use that state
  // Otherwise use the props or local state
  const [localOpen, setLocalOpen] = React.useState(false);
  const isOpen = context ? context.open : open !== undefined ? open : localOpen;
  const setIsOpen = context
    ? context.setOpen
    : onOpenChange !== undefined
    ? onOpenChange
    : setLocalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        {context ? (
          children
        ) : (
          <Command className="[&_[data-slot=command-group-heading]]:text-muted-foreground [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-group]:not([hidden])_~[data-slot=command-group]]:pt-0 [&_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=command-input-wrapper]_svg]:w-5 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:h-5 [&_[data-slot=command-item]_svg]:w-5">
            {children}
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  value,
  onChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const { searchTerm, setSearchTerm } = useCommandContext();

  // Use context state or props
  const inputValue = value !== undefined ? value : searchTerm;
  const handleChange =
    onChange !== undefined
      ? onChange
      : (e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value);

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <input
        data-slot="command-input"
        type="text"
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={inputValue}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setItemCount } = useCommandContext();

  // Count direct CommandItem children to set item count
  React.useEffect(() => {
    const items = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child) && child.type === CommandItem
    );
    setItemCount(items.length);
  }, [children, setItemCount]);

  return (
    <div
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      role="listbox"
      {...props}
    >
      {children}
    </div>
  );
}

function CommandEmpty({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    >
      {children || "No results found."}
    </div>
  );
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  heading?: React.ReactNode;
}) {
  return (
    <div
      data-slot="command-group"
      className={cn("text-foreground overflow-hidden p-1", className)}
      {...props}
    >
      {heading && (
        <div
          data-slot="command-group-heading"
          className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

function CommandSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      role="separator"
      {...props}
    />
  );
}

function CommandItem({
  className,
  children,
  disabled = false,
  onSelect,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const { selectedIndex, registerItem, unregisterItem, selectItem } =
    useCommandContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  // Register/unregister this item with the context
  React.useEffect(() => {
    registerItem(id);
    return () => unregisterItem(id);
  }, [id, registerItem, unregisterItem]);

  // Get the index of this item among its siblings
  const index = React.useMemo(() => {
    if (!ref.current) return -1;
    const parent = ref.current.parentElement;
    if (!parent) return -1;

    const items = Array.from(parent.children).filter(
      (child) => child.getAttribute("data-slot") === "command-item"
    );

    return items.indexOf(ref.current);
  }, []);

  // Check if this item is selected
  const isSelected = selectedIndex === index && index !== -1;

  // Handle click
  const handleClick = () => {
    if (disabled) return;
    if (onSelect) onSelect();
    selectItem(id);
  };

  // Handle keyboard selection
  React.useEffect(() => {
    if (isSelected && ref.current && onSelect) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isSelected, onSelect]);

  return (
    <div
      ref={ref}
      data-slot="command-item"
      data-selected={isSelected}
      data-disabled={disabled}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
        "[&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
