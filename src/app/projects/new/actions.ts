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
    console.log('Generating project plan...');
    const plan = await generateProjectPlan(idea);
    
    if (!plan.name || !plan.description || !Array.isArray(plan.tasks)) {
      console.error('Invalid plan structure:', plan);
      return { error: 'Invalid AI response structure' };
    }

    console.log('Creating project in database...');
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

    console.log('Adding project member...');
    await db.insert(projectMembers)
      .values({
        projectId: newProject.id,
        userId: user.id,
        role: 'OWNER',
      });

    console.log('Creating tasks...');
    const taskPromises = plan.tasks.map((task: { title: any; description: any; status: any; priority: any; }) => 
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
    console.log('Project creation completed successfully');

    return { success: true, projectId: newProject.id };
  } catch (error) {
    console.error('Detailed error in project creation:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}