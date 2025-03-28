"use client"

import React from 'react'
import { motion } from "framer-motion"
import { Sparkles, Calendar, Code, Settings, Star, Users } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useParams, usePathname } from 'next/navigation'

export default function Sidebar() {
  // Get the current project ID from the URL
  const params = useParams();
  const pathname = usePathname();

  // Extract projectId from params
  const projectId = params?.projectId as string;

  // Check if we're on a project page
  const isProjectPage = pathname?.includes('/projects/') && projectId;

  // Check if we're on the members page
  const isMembersPage = pathname?.includes('/members');

  // Check if we're on the main dashboard page
  const isDashboardPage = pathname === '/dashboard' || pathname === '/dashboard/projects';
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center space-x-2">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 180 }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-xl bg-primary/20"
          >
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </motion.div>
          <Link href={'/'}>
            <h1 className="text-xl font-bold rainbow-text hover:pointer">
              ProjectMate
            </h1>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4 px-2">
        <nav className="space-y-2">
          <Button
            variant={isDashboardPage ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all duration-300 ${isDashboardPage
              ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:to-primary/5"
              : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent"}`}
            asChild
          >
            <Link href="/dashboard" className="font-medium">
              <Code className="mr-2 h-4 w-4 text-primary" />
              Projects
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent transition-all duration-300"
            asChild
          >
            <Link href="#" className="font-medium">
              <Calendar className="mr-2 h-4 w-4 text-green-500" />
              Calendar
            </Link>
          </Button>
          {isProjectPage && (
            <Button
              variant={isMembersPage ? "secondary" : "ghost"}
              className={`w-full justify-start transition-all duration-300 ${isMembersPage
                ? "bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent hover:from-green-500/20 hover:to-green-500/5"
                : "hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent"}`}
              asChild
            >
              <Link href={`/dashboard/projects/${projectId}/members`} className="font-medium">
                <Users className="mr-2 h-4 w-4 text-green-500" />
                Members
              </Link>
            </Button>
          )}
        </nav>
      </div>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 hover:to-amber-500/10 border-amber-500/20 transition-all duration-300"
        >
          <Star className="mr-2 h-4 w-4 text-amber-500" />
          Upgrade to Pro
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link href="/settings" className="font-medium">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}

