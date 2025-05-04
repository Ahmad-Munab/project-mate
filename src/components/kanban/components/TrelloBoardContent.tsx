"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "../types";
import TrelloColumn from "./TrelloColumn";
import AddColumnButton from "./AddColumnButton";

interface TrelloBoardContentProps {
  projectId: string;
  projectTasks: Task[];
  taskStatuses: TaskStatus[];
  canCreateTasks: boolean;
  canDragTasks: boolean;
  canEditColumns: boolean;
  canDragColumns: boolean;
  onDragEnd: (result: DropResult) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onColumnUpdate: (columnId: string, name: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  onColumnAdd: (name: string) => Promise<void>;
  onColumnReorder: (columnId: string, newOrder: number) => Promise<void>;
  onAddTask: (statusKey: string) => void;
}

export default function TrelloBoardContent({
  projectTasks,
  taskStatuses,
  canCreateTasks,
  canDragTasks,
  canEditColumns,
  canDragColumns,
  onDragEnd,
  onTaskUpdate,
  onTaskDelete,
  onColumnUpdate,
  onColumnDelete,
  onColumnAdd,
  onAddTask,
}: TrelloBoardContentProps) {
  // Sort columns by order
  const sortedStatuses = [...taskStatuses].sort((a, b) => a.order - b.order);

  // Add drag start handler to add dragging class to body
  const handleDragStart = () => {
    document.body.classList.add('dragging-active');
  };

  // Add drag end handler to remove dragging class from body
  const handleDragEnd = (result: DropResult) => {
    document.body.classList.remove('dragging-active');
    onDragEnd(result);
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-auto p-2 md:p-4 pb-0 md:pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Droppable container for columns */}
        <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-3 md:gap-6 min-w-fit items-start pb-0 md:pb-4"
              style={{ width: 'max-content', minHeight: 'fit-content' }}
            >
              {/* Draggable Columns */}
              {sortedStatuses.map((status, index) => (
                <Draggable
                  key={status.id}
                  draggableId={`column-${status.id}`}
                  index={index}
                  isDragDisabled={!canDragColumns || status.key === "BACKLOG" || status.is_default}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.8 : 1
                      }}
                    >
                      <TrelloColumn
                        key={status.key}
                        status={status}
                        tasks={projectTasks.filter(
                          (task) =>
                            task.status_key === status.key ||
                            (task.status === status.key && !task.status_key)
                        )}
                        canCreateTasks={canCreateTasks}
                        canDragTasks={canDragTasks}
                        canEditColumns={canEditColumns}
                        onTaskUpdate={onTaskUpdate}
                        onTaskDelete={onTaskDelete}
                        onColumnUpdate={onColumnUpdate}
                        onColumnDelete={onColumnDelete}
                        onAddTask={onAddTask}
                        taskStatuses={taskStatuses}
                        dragHandleProps={provided.dragHandleProps || undefined}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Add Column Button */}
              {canEditColumns && (
                <AddColumnButton onAddColumn={onColumnAdd} />
              )}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}
