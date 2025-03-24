"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Edit, MoreHorizontal, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useOrganization, type Project } from "./organization-context"
import { formatDistanceToNow } from "date-fns"

interface ProjectCardProps {
  project: Project
  members?: Array<{ id: string; name: string; avatar_url?: string }>
  taskCount?: number
  progress?: number
}

export function ProjectCard({ project, members = [], taskCount = 0, progress = 0 }: ProjectCardProps) {
  const router = useRouter()
  const { updateProject, deleteProject } = useOrganization()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                  <h3 className="font-semibold text-lg line-clamp-1">{project.name}</h3>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((member, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={member.avatar_url || "/placeholder.svg?height=32&width=32"} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 3 && (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium border-2 border-background">
                    +{members.length - 3}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {taskCount} {taskCount === 1 ? "task" : "tasks"}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 px-6 py-3 text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
        </CardFooter>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

