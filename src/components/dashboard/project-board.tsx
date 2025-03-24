"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Plus, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Task {
  id: string
  title: string
  status: string
  assignee: string
}

interface ProjectBoardProps {
  project: {
    id: string
    name: string
    tasks: Task[]
    members: { id: string; name: string; avatar: string }[]
  }
  onAddTask: () => void
}

export default function ProjectBoard({ project, onAddTask }: ProjectBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks)

  const columns = {
    Planned: tasks.filter((task) => task.status === "Planned"),
    "In Progress": tasks.filter((task) => task.status === "In Progress"),
    Completed: tasks.filter((task) => task.status === "Completed"),
  }

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    // Dropped outside the list
    if (!destination) return

    // Dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Find the task that was dragged
    const task = tasks.find((t) => t.id === draggableId)
    if (!task) return

    // Create a new array without the dragged task
    const newTasks = tasks.filter((t) => t.id !== draggableId)

    // Create a new task with the updated status
    const updatedTask = { ...task, status: destination.droppableId }

    // Insert the task at the new position
    newTasks.splice(destination.index, 0, updatedTask)

    setTasks(newTasks)
  }

  const getAssigneeName = (assignee: string) => {
    return project.members.find((member) => member.name === assignee)?.name || assignee
  }

  const getAssigneeAvatar = (assignee: string) => {
    return project.members.find((member) => member.name === assignee)?.avatar || "/placeholder.svg?height=32&width=32"
  }

  const getAssigneeInitial = (assignee: string) => {
    return assignee.charAt(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{project.name} Board</h2>
        <Button onClick={onAddTask} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(columns).map(([columnId, columnTasks], columnIndex) => (
            <motion.div
              key={columnId}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * columnIndex }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-md">{columnId}</CardTitle>
                    <Badge variant="outline">{columnTasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId={columnId}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[200px]">
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-2"
                              >
                                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                                  <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                      <h3 className="font-medium text-sm">{task.title}</h3>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreHorizontal className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem>Edit Task</DropdownMenuItem>
                                          <DropdownMenuItem className="text-destructive">Delete Task</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    <div className="flex items-center mt-2">
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarImage
                                          src={getAssigneeAvatar(task.assignee)}
                                          alt={getAssigneeName(task.assignee)}
                                        />
                                        <AvatarFallback>{getAssigneeInitial(task.assignee)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground">
                                        {getAssigneeName(task.assignee)}
                                      </span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}

