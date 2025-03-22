'use server'

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers, tasks } from "@/db/schema";
import { generateProjectPlan } from "./generatePlan";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const idea = formData.get('idea') as string;

  if (!idea) {
    return { error: 'Project idea is required' };
  }

  try {
    const plan = await generateProjectPlan(idea);
    
    if (!plan.name || !plan.description || !Array.isArray(plan.tasks)) {
      console.error('Invalid plan structure:', plan);
      return { error: 'Invalid AI response structure' };
    }

    const [newProject] = await db.insert(projects)
      .values({
        name: plan.name,
        description: plan.description,
        ownerId: user.id,
      })
      .returning();

    if (!newProject?.id) {
      return { error: 'Failed to create project record' };
    }

    await db.insert(projectMembers)
      .values({
        projectId: newProject.id,
        userId: user.id,
        role: 'OWNER',
      });

    const taskPromises = plan.tasks.map(task => 
      db.insert(tasks)
        .values({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          project_id: newProject.id,
          created_by: user.id,
        })
    );

    await Promise.all(taskPromises);

    return { success: true, projectId: newProject.id };
  } catch (error) {
    console.error('Detailed error in project creation:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}