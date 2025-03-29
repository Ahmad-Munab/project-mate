"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"



export default function EmptyState() {
  return (
    <Card className="p-12 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
      <p className="text-lg text-center mb-6 text-muted-foreground">No Members Invited</p>
      <Link href="/dashboard/members/invite">
      <Button>Invite Member</Button>
      </Link>
    </Card>
  )
}

