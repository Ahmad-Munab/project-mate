'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';

interface CursorState {
  x: number;
  y: number;
  isDragging?: boolean;
  draggedTaskId?: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string;
  color: string;
}

interface LiveCursorProps {
  user: User;
  cursor: CursorState;
}

export function LiveCursor({ user, cursor }: LiveCursorProps) {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-50"
      animate={{ x: cursor.x, y: cursor.y }}
      transition={{ duration: 0.1, ease: "linear" }}
    >
      {/* Cursor */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={user.color}
        strokeWidth="2"
        style={{ transform: "rotate(-45deg)" }}
      >
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>

      {/* User info bubble */}
      <div
        className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm"
        style={{ border: `2px solid ${user.color}` }}
      >
        <Avatar className="h-6 w-6">
          <img src={user.avatar_url} alt={user.name} />
        </Avatar>
        <span className="text-xs font-medium">{user.name}</span>
        {cursor.isDragging && (
          <span className="text-xs text-muted-foreground">
            dragging task...
          </span>
        )}
      </div>
    </motion.div>
  );
}