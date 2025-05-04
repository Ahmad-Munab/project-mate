/**
 * Card Members Component
 * Displays member avatars for a task card
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  name: string;
  avatar?: string;
}

interface CardMembersProps {
  members: Member[];
  maxDisplay?: number;
}

export default function CardMembers({
  members,
  maxDisplay = 3
}: CardMembersProps) {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className="flex -space-x-3">
      {members.slice(0, maxDisplay).map((member) => (
        <Avatar 
          key={member.id} 
          className="h-8 w-8 border-2 border-white dark:border-gray-800 shadow-sm"
        >
          {member.avatar ? (
            <AvatarImage src={member.avatar} alt={member.name} />
          ) : (
            <AvatarFallback className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      ))}
      
      {members.length > maxDisplay && (
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm">
          +{members.length - maxDisplay}
        </div>
      )}
    </div>
  );
}
