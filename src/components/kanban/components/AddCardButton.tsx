/**
 * Add Card Button Component
 * Button to add a new card to a column
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddCardButtonProps {
  onClick: () => void;
}

export default function AddCardButton({ onClick }: AddCardButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
      onClick={onClick}
    >
      <Plus className="h-4 w-4 mr-1" />
      Add a card
    </Button>
  );
}
