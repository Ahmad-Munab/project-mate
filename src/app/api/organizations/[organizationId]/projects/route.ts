import { NextResponse } from "next/server"

// This is a mock API route for demonstration purposes
// In a real app, you would connect to your database

export async function GET(request: Request, { params }: { params: { organizationId: string } }) {
  const organizationId = params.organizationId

  // Mock data - in a real app, you would fetch from your database
  const projects = [
    {
      id: "proj-1",
      name: "Website Redesign",
      description: "Redesign the company website with a modern look and feel",
      organization_id: organizationId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "proj-2",
      name: "Mobile App Development",
      description: "Create a mobile app for iOS and Android platforms",
      organization_id: organizationId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return NextResponse.json(projects)
}

