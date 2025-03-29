"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProjectData = {
  id?: string;  // Make id optional by adding '?'
  name: string;
  description?: string;
  region: string;
  tier: string;
};

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (project: ProjectData) => void
}

export default function NewProjectModal({ open, onOpenChange, onCreateProject }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("")
  const [region, setRegion] = useState("aws | ap-southeast-1")
  const [tier, setTier] = useState("NANO")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateProject({
      name: projectName,
      region,
      tier,
    })
    setProjectName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-awesome-project"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws | ap-southeast-1">AWS (ap-southeast-1)</SelectItem>
                <SelectItem value="aws | us-east-1">AWS (us-east-1)</SelectItem>
                <SelectItem value="aws | eu-west-1">AWS (eu-west-1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier">Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger id="tier">
                <SelectValue placeholder="Select a tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NANO">Nano</SelectItem>
                <SelectItem value="MICRO">Micro</SelectItem>
                <SelectItem value="SMALL">Small</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

