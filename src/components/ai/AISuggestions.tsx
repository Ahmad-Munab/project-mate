/**
 * AI Suggestions Component
 * This component renders suggestion buttons for the AI chat
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, ListTodo, ArrowRight, Database, Calendar, Wand2, Brain } from "lucide-react";

interface AISuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

// Use memo to prevent unnecessary re-renders
export const AISuggestions = memo(function AISuggestions({ suggestions, onSuggestionClick }: AISuggestionsProps) {
  // Array of icons to use for suggestions
  const icons = [ListTodo, ArrowRight, Database, Calendar, Wand2, Brain];
  
  return (
    <div className="p-3 border-t">
      <div className="flex items-center mb-2">
        <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground">Suggestions</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 4).map((suggestion, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs justify-start h-7 px-2 border-muted hover:bg-muted/50 hover:text-foreground transition-colors flex-shrink-0 max-w-full"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <Icon className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
});
