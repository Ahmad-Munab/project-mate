"use client"

import React from 'react'
import { motion } from "framer-motion"
import { Sparkles, Calendar, Code, Settings, Star, Users } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Sidebar() {
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
            variant="secondary" 
            className="w-full justify-start bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:to-primary/5 transition-all duration-300" 
            asChild
          >
            <a href="#" className="font-medium">
              <Code className="mr-2 h-4 w-4 text-primary" />
              Projects
            </a>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent transition-all duration-300" 
            asChild
          >
            <a href="#" className="font-medium">
              <Calendar className="mr-2 h-4 w-4 text-green-500" />
              Calendar
            </a>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent transition-all duration-300" 
            asChild
          >
            <Link href="/dashboard/members" className="font-medium">
              <Users className="mr-2 h-4 w-4 text-green-500" />
              Members
            </Link>
          </Button>
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

