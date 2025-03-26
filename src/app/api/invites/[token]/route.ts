import { NextResponse } from "next/server";
import { db } from "@/db";
import { invites, projects } from "@/db/schema";
import { eq, } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // First, get the invite details
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token));

    if (!invite) {
      console.log("No invite found for token:", token);
      return NextResponse.json(
        { error: "Invalid invite" },
        { status: 404 }
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      console.log("Invite expired:", invite.expiresAt);
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 }
      );
    }

    // If there's a projectId, get the project details
    let projectName = null;
    if (invite.projectId) {
      const [project] = await db
        .select({
          name: projects.name,
        })
        .from(projects)
        .where(eq(projects.id, invite.projectId));
      
      if (project) {
        projectName = project.name;
      }
    }

    // Ensure role is uppercase
    const role = invite.role.toUpperCase();

    return NextResponse.json({
      role: role,
      projectName: projectName,
      projectId: invite.projectId,
      status: invite.status,
      email: invite.email,
    });

  } catch (error) {
    console.error("Error in invite GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite details" },
      { status: 500 }
    );
  }
}
