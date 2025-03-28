"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
  Users,
  UserCog,
  Mail,
  Check
} from "lucide-react"

// Define types for activity data
type ActivityItem = {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  action: string
  target: string
  timestamp: string
  type: "join" | "leave" | "role_change" | "status_change" | "message" | "invite"
}

interface ActivityTimelineProps {
  projectId: string
}

export default function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])

  // Fetch activities when component mounts or projectId changes
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        // Fetch real activity data from the API
        const response = await fetch(`/api/projects/${projectId}/activities`)

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`)
        }

        const data = await response.json()
        setActivities(data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching activities:", error)
        setLoading(false)
      }
    }

    fetchActivities()
  }, [projectId]) // Re-fetch when projectId changes

  // Filter activities based on active tab
  const filteredActivities = activities.filter(activity => {
    if (activeTab === "all") return true
    return activity.type === activeTab
  })

  // Get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "join":
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case "leave":
        return <Users className="h-4 w-4 text-red-500" />
      case "role_change":
        return <UserCog className="h-4 w-4 text-purple-500" />
      case "status_change":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "message":
        return <MessageSquare className="h-4 w-4 text-amber-500" />
      case "invite":
        return <Mail className="h-4 w-4 text-blue-500" />
      case "accept":
        return <Check className="h-4 w-4 text-green-500" />
      case "active":
        return <Clock className="h-4 w-4 text-cyan-500" />
      default:
        return <Activity className="h-4 w-4 text-slate-500" />
    }
  }

  // Get background color based on activity type
  const getActivityBackground = (type: string) => {
    switch (type) {
      case "join":
        return "bg-blue-50"
      case "leave":
        return "bg-red-50"
      case "role_change":
        return "bg-purple-50"
      case "status_change":
        return "bg-emerald-50"
      case "message":
        return "bg-amber-50"
      case "invite":
        return "bg-blue-50"
      case "accept":
        return "bg-green-50"
      case "active":
        return "bg-cyan-50"
      default:
        return "bg-slate-50"
    }
  }

  return (
    <Card className="border-none shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Team Activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-slate-500 mt-4">Loading activities...</p>
          </div>
        ) : (
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-4 bg-slate-100 p-1 overflow-x-auto">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="join" className="text-xs">Joins</TabsTrigger>
            <TabsTrigger value="invite" className="text-xs">Invites</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="status_change" className="text-xs">Status</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0 space-y-0">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {filteredActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-3 rounded-lg ${getActivityBackground(activity.type)} flex items-start gap-3`}
                >
                  <Avatar className="h-8 w-8 border border-white shadow-sm">
                    <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-xs">
                      {activity.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-sm">{activity.userName}</span>
                      <span className="text-slate-600 text-sm">{activity.action}</span>
                      <Badge variant="outline" className="font-normal text-xs py-0 h-5">
                        {activity.target}
                      </Badge>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.timestamp}
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {getActivityIcon(activity.type)}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
