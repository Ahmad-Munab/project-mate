import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authUsers } from "@/db/schema";

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get all projects where the user is a member
        const userProjects = await db
            .select({
                project: projects,
                memberRole: projectMembers.role,
                ownerId: projects.ownerId,
            })
            .from(projectMembers)
            .innerJoin(projects, eq(projects.id, projectMembers.projectId))
            .where(eq(projectMembers.userId, user.id));

        // Get owner info for each project
        const projectsWithOwnerInfo = await Promise.all(
            userProjects.map(async (projectData) => {
                // Get owner info if not the current user
                let ownerInfo = null;
                if (projectData.ownerId !== user.id) {
                    ownerInfo = await db
                        .select()
                        .from(authUsers)
                        .where(eq(authUsers.id, projectData.ownerId))
                        .then((rows) => rows[0] || null);
                }

                return {
                    ...projectData,
                    ownerInfo,
                };
            })
        );

        // Format the response
        const formattedProjects = projectsWithOwnerInfo.map((projectData) => {
            return {
                id: projectData.project.id,
                name: projectData.project.name,
                description: projectData.project.description,
                isOwner: projectData.ownerId === user.id,
                myRole: projectData.memberRole,
            };
        });

        return NextResponse.json(formattedProjects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
