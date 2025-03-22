import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectInvites, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function JoinProject({
  params: { code }
}: {
  params: { code: string }
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (authError || !user) {
    redirect(`/login?redirect=/join/${code}`);
  }

  try {
    // Find and validate invitation
    const [invite] = await db
      .select()
      .from(projectInvites)
      .where(eq(projectInvites.code, code));

    if (!invite || invite.expiresAt < new Date()) {
      redirect('/invalid-invite');
    }

    // Add user to project
    await db.insert(projectMembers)
      .values({
        projectId: invite.projectId,
        userId: user.id,
        role: invite.role,
      })
      .onConflictDoNothing();

    // Redirect to project
    redirect(`/projects/${invite.projectId}`);
  } catch (error) {
    console.error('Error joining project:', error);
    redirect('/error');
  }
}