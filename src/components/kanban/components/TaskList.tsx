/**
 * Task List Component
 * Renders a list of draggable task cards
 */

import { Draggable } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "../types";
import TrelloCard from "../TrelloCard";

interface TaskListProps {
  tasks: Task[];
  canDragTasks: boolean;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  taskStatuses: TaskStatus[];
}

export default function TaskList({
  tasks,
  canDragTasks,
  onTaskUpdate,
  onTaskDelete,
  taskStatuses
}: TaskListProps) {
  return (
    <>
      {tasks.map((task, index) => (
        <Draggable
          key={task.id}
          draggableId={task.id}
          index={index}
          isDragDisabled={!canDragTasks}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`mb-2 group task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
              style={{
                ...provided.draggableProps.style,
                // No opacity change - we'll handle this in CSS
              }}
            >
              <TrelloCard
                task={task}
                onTaskUpdate={onTaskUpdate}
                onTaskDelete={onTaskDelete}
                taskStatuses={taskStatuses}
                isDragPreview={snapshot.isDragging}
              />
            </div>
          )}
        </Draggable>
      ))}
    </>
  );
}
