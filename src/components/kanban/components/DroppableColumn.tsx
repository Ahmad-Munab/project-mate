/**
 * Droppable Column Component
 * Renders a droppable container for tasks
 */

import { ReactNode } from "react";
import { Droppable } from "@hello-pangea/dnd";

interface DroppableColumnProps {
  droppableId: string;
  children: ReactNode;
}

export default function DroppableColumn({
  droppableId,
  children
}: DroppableColumnProps) {
  return (
    <Droppable droppableId={droppableId} type="TASK">
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex-1 px-1.5 pb-1 min-h-[10px] kanban-column"
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
