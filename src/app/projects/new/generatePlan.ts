import { Groq } from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

const taskSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
});

export async function generateProjectPlan(idea: string) {
  try {
    const prompt = `You are a project management expert. Create a project plan for this idea: "${idea}"

IMPORTANT: Your response must be a single JSON object with NO additional text or formatting.
Format:
{
  "name": "<project name, max 60 chars>",
  "description": "<project description, max 200 chars>",
  "tasks": [
    {
      "title": "<task title>",
      "description": "<task description>",
      "status": "BACKLOG",
      "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT"
    }
  ]
}

Rules:
- Include exactly 3-5 tasks
- All tasks must have status "BACKLOG"
- Each task priority must be one of: "LOW", "MEDIUM", "HIGH", "URGENT"
- No markdown, no comments, just pure JSON`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.4, // Reduced temperature for more consistent output
      max_tokens: 2048,
      top_p: 0.95
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Log the raw response for debugging
    console.log('Raw AI response:', content);

    let cleanContent = content;
    // Try to extract JSON if wrapped in backticks or code blocks
    const jsonMatch = content.match(/```json?\s*({[\s\S]*})\s*```/) || 
                     content.match(/`({[\s\S]*})`/) ||
                     content.match(/({[\s\S]*})/);
    
    if (jsonMatch) {
      cleanContent = jsonMatch[1];
    }

    console.log('Cleaned content:', cleanContent);

    try {
      const parsed = JSON.parse(cleanContent.trim());
      console.log('Parsed JSON:', parsed);

      // Validate basic structure
      if (!parsed.name || !parsed.description || !Array.isArray(parsed.tasks)) {
        console.error('Invalid structure:', parsed);
        throw new Error('Response missing required fields');
      }

      // Validate name and description lengths
      if (parsed.name.length > 60) {
        throw new Error('Project name too long');
      }
      if (parsed.description.length > 200) {
        throw new Error('Project description too long');
      }

      // Validate tasks
      if (parsed.tasks.length < 3 || parsed.tasks.length > 5) {
        throw new Error(`Invalid number of tasks: ${parsed.tasks.length}`);
      }

      for (const task of parsed.tasks) {
        const result = taskSchema.safeParse(task);
        if (!result.success) {
          console.error('Task validation error:', result.error);
          throw new Error(`Invalid task structure: ${JSON.stringify(task)}`);
        }
        if (task.status !== 'BACKLOG') {
          throw new Error(`Invalid task status: ${task.status}`);
        }
      }

      return parsed;
    } catch (parseError) {
      console.error('Parse error details:', parseError);
      console.error('Failed content:', cleanContent);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

// Add type for the return value of generateProjectPlan
export type ProjectPlan = {
  name: string;
  description: string;
  tasks: {
    title: string;
    description: string;
    status: "BACKLOG";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }[];
};
