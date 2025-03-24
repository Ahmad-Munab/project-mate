import { NextResponse } from "next/server"

// This is a mock API route for demonstration purposes
// In a real app, you would connect to your database

export async function GET() {
  // Mock data - in a real app, you would fetch from your database
  const organizations = [
    {
      id: "org-1",
      name: "Personal Workspace",
      slug: "personal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      personal: true,
    },
    {
      id: "org-2",
      name: "Acme Inc",
      slug: "acme-inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      personal: false,
    },
  ]

  return NextResponse.json(organizations)
}

export async function POST(request: Request) {
  const body = await request.json()

  // Validate request
  if (!body.name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
  }

  // Create new organization - in a real app, you would save to your database
  const newOrg = {
    id: `org-${Date.now()}`,
    name: body.name,
    slug: body.name.toLowerCase().replace(/\s+/g, "-"),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    personal: false,
  }

  return NextResponse.json(newOrg)
}

