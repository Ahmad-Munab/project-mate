import { NextResponse } from "next/server"

// This is a mock API route for demonstration purposes
// In a real app, you would connect to your database

export async function POST(request: Request) {
  const body = await request.json()

  // Validate request
  if (!body.name || !body.organizationId) {
    return NextResponse.json({ error: "Project name and organization ID are required" }, { status: 400 })
  }

  // Create new project - in a real app, you would save to your database
  const newProject = {
    id: `proj-${Date.now()}`,
    name: body.name,
    description: body.description || "",
    organization_id: body.organizationId,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return NextResponse.json(newProject)
}

