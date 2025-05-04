"use client";

import { useState } from "react";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "../types";

// Import extracted components
import ColumnHeader from "./ColumnHeader";
import QuickAddCard from "./QuickAddCard";
import AddCardButton from "./AddCardButton";
import TaskList from "./TaskList";
import DroppableColumn from "./DroppableColumn";

interface TrelloColumnProps {
  status: TaskStatus;
  tasks: Task[];
  canCreateTasks: boolean;
  canDragTasks: boolean;
  canEditColumns: boolean;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onColumnUpdate: (columnId: string, name: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  onAddTask: (statusKey: string) => void;
  taskStatuses: TaskStatus[];
  dragHandleProps?: DraggableProvidedDragHandleProps;
}

export default function TrelloColumn({
  status,
  tasks,
  canCreateTasks,
  canDragTasks,
  canEditColumns,
  onTaskUpdate,
  onTaskDelete,
  onColumnUpdate,
  onColumnDelete,
  onAddTask,
  taskStatuses,
  dragHandleProps,
}: TrelloColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);

  return (
    <div className="flex flex-col w-[330px] rounded-md bg-gray-100 dark:bg-gray-800/60 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Column Header */}
      <ColumnHeader
        status={status}
        taskCount={tasks.length}
        canEditColumns={canEditColumns}
        onColumnUpdate={onColumnUpdate}
        onColumnDelete={onColumnDelete}
        dragHandleProps={dragHandleProps}
      />

      {/* Cards Container */}
      <DroppableColumn droppableId={status.key}>
        {/* Task Cards */}
        <TaskList
          tasks={tasks}
          canDragTasks={canDragTasks}
          onTaskUpdate={onTaskUpdate}
          onTaskDelete={onTaskDelete}
          taskStatuses={taskStatuses}
        />

        {/* Quick Add Card Form */}
        {isAddingCard && (
          <QuickAddCard
            statusKey={status.key}
            onAddTask={onAddTask}
            onCancel={() => setIsAddingCard(false)}
          />
        )}
      </DroppableColumn>

      {/* Add Card Button */}
      {canCreateTasks && !isAddingCard && (
        <div className="px-2 pb-2">
          <AddCardButton onClick={() => setIsAddingCard(true)} />
        </div>
      )}
    </div>
  );
}
