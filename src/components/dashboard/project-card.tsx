import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    region: string
    tier: string
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:border-primary/50 cursor-pointer group">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="space-y-1">
            <div className="flex items-center">
              <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{project.name}</h3>
              <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-muted-foreground">{project.region}</p>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {project.tier}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

