/**
 * AI Suggestions Component
 * This component renders suggestion buttons for the AI chat
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ListTodo, Calendar, Wand2, Brain, Sparkles, PlusCircle, Columns } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AISuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

// Use memo to prevent unnecessary re-renders
export const AISuggestions = memo(function AISuggestions({ suggestions, onSuggestionClick }: AISuggestionsProps) {
  // Array of icons to use for suggestions with their colors
  const suggestionIcons = [
    { icon: ListTodo, color: "text-blue-600" },
    { icon: PlusCircle, color: "text-green-700" },
    { icon: Columns, color: "text-purple-600" },
    { icon: Calendar, color: "text-amber-600" },
    { icon: Wand2, color: "text-indigo-600" },
    { icon: Brain, color: "text-rose-600" },
  ];

  return (
    <motion.div
      className="p-1.5 sm:p-2 border-t bg-white dark:bg-background"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center mb-2.5">
        <div className="relative mr-1.5">
          <div className="absolute -inset-0.5 rounded-full bg-green-300/70 opacity-75 blur-[1px] animate-pulse"></div>
          <div className="relative">
            <Sparkles className="h-3.5 w-3.5 text-green-700 dark:text-green-500" />
          </div>
        </div>
        <h3 className="text-xs font-medium text-foreground/80">Try asking</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 4).map((suggestion, index) => {
          const { icon: Icon, color } = suggestionIcons[index % suggestionIcons.length];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex-shrink-0 max-w-full"
            >
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-[10px] sm:text-xs justify-start h-7 sm:h-8 px-2 sm:px-2.5 border-border/50 hover:border-green-500",
                  "bg-gray-50/50 dark:bg-gray-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20",
                  "transition-all duration-200 shadow-sm hover:shadow flex-shrink-0 max-w-full",
                  "group"
                )}
                onClick={() => onSuggestionClick(suggestion)}
              >
                <Icon className={cn(
                  "h-3.5 w-3.5 mr-2 flex-shrink-0 transition-transform duration-200",
                  "group-hover:scale-110",
                  color
                )} />
                <span className="truncate font-medium">
                  {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
                </span>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});
