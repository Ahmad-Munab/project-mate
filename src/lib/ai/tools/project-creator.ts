/**
 * Project creator tool for AI assistant
 * Uses the existing AI system with memory and RAG to create projects
 */

import { Groq } from "groq-sdk";
import { storeEnhancedMessage } from "../memory/enhanced";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Define the project plan schema
export type ProjectPlan = {
  name: string;
  description: string;
  columns: {
    name: string;
    key: string;
    color?: string;
  }[];
  tasks: {
    title: string;
    description: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }[];
};

/**
 * Generate a project plan using the AI assistant
 * @param idea - The project idea
 * @returns A project plan with name, description, columns, and tasks
 */
/**
 * Ensures tasks are intelligently distributed across all columns
 * @param columns - The columns in the project
 * @param tasks - The tasks in the project
 */
function ensureTaskDistribution(
  columns: { name: string; key: string; color?: string }[],
  tasks: { title: string; description: string; status: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }[]
) {
  // Count tasks per column
  const taskCountByColumn: Record<string, number> = {};

  // Initialize counts to 0
  columns.forEach(col => {
    taskCountByColumn[col.key] = 0;
  });

  // Count tasks in each column
  tasks.forEach(task => {
    if (taskCountByColumn[task.status] !== undefined) {
      taskCountByColumn[task.status]++;
    }
  });

  // Find columns with no tasks or very few tasks (less than 2)
  const underutilizedColumns = columns.filter(col => taskCountByColumn[col.key] < 2);

  // If there are underutilized columns, redistribute tasks intelligently
  if (underutilizedColumns.length > 0) {
    console.log(`Found ${underutilizedColumns.length} underutilized columns. Intelligently redistributing...`);

    // Find columns with the most tasks
    const columnsByTaskCount = [...columns]
      .filter(col => taskCountByColumn[col.key] > 3) // Only consider columns with more than 3 tasks
      .sort((a, b) => taskCountByColumn[b.key] - taskCountByColumn[a.key]);

    // For each underutilized column, move appropriate tasks from columns with many tasks
    underutilizedColumns.forEach(targetCol => {
      // How many tasks we need to add to this column
      const tasksNeeded = 2 - taskCountByColumn[targetCol.key];
      if (tasksNeeded <= 0) return;

      // Find a column with many tasks
      const sourceCol = columnsByTaskCount.find(col => taskCountByColumn[col.key] > 3);
      if (!sourceCol) return; // No more source columns with many tasks

      // Find tasks in the source column
      const tasksInSourceCol = tasks.filter(task => task.status === sourceCol.key);

      // Find tasks that would be appropriate for the target column based on keywords
      const targetColKeywords = getColumnKeywords(targetCol.key);
      const suitableTasks = tasksInSourceCol
        .map(task => ({
          task,
          relevanceScore: calculateRelevance(task, targetColKeywords)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, tasksNeeded)
        .map(item => item.task);

      // Move suitable tasks to the target column
      suitableTasks.forEach(taskToMove => {
        taskToMove.status = targetCol.key;
        console.log(`Moved task "${taskToMove.title}" from ${sourceCol.key} to ${targetCol.key} (relevance score: high)`);

        // Update counts
        taskCountByColumn[sourceCol.key]--;
        taskCountByColumn[targetCol.key]++;
      });
    });
  }

  // Log the final distribution
  console.log("Task distribution across columns:");
  columns.forEach(col => {
    console.log(`${col.name} (${col.key}): ${taskCountByColumn[col.key]} tasks`);
  });
}

/**
 * Get keywords associated with a column type
 * @param columnKey - The column key
 * @returns Array of keywords associated with that column
 */
function getColumnKeywords(columnKey: string): string[] {
  const keywordMap: Record<string, string[]> = {
    // AI/ML columns
    'DATA_PREPARATION': ['data', 'dataset', 'preprocessing', 'clean', 'collect', 'scrape', 'label', 'annotate'],
    'MODEL_ARCHITECTURE': ['model', 'architecture', 'network', 'layers', 'design', 'structure'],
    'TRAINING': ['train', 'learning', 'optimize', 'fit', 'epoch', 'batch', 'gradient'],
    'EVALUATION': ['evaluate', 'test', 'metric', 'accuracy', 'precision', 'recall', 'validation'],
    'DEPLOYMENT': ['deploy', 'serve', 'production', 'api', 'endpoint', 'container'],

    // Web/Mobile columns
    'FRONTEND': ['ui', 'interface', 'component', 'view', 'screen', 'design', 'css', 'html', 'react'],
    'BACKEND': ['server', 'api', 'endpoint', 'controller', 'route', 'service'],
    'DATABASE': ['database', 'schema', 'model', 'query', 'table', 'entity', 'storage'],
    'API': ['api', 'endpoint', 'rest', 'graphql', 'request', 'response', 'http'],
    'AUTH': ['auth', 'authentication', 'authorization', 'login', 'register', 'permission'],

    // General columns
    'BACKLOG': ['plan', 'idea', 'future', 'pending', 'consider'],
    'ARCHITECTURE': ['architecture', 'design', 'structure', 'system', 'pattern'],
    'TESTING': ['test', 'unit', 'integration', 'e2e', 'coverage', 'mock', 'assert'],
    'DONE': ['complete', 'finished', 'done', 'implemented', 'ready']
  };

  return keywordMap[columnKey] || [];
}

/**
 * Calculate relevance score of a task to a column based on keywords
 * @param task - The task to evaluate
 * @param keywords - Keywords associated with the target column
 * @returns Relevance score (0-1)
 */
function calculateRelevance(task: { title: string; description: string }, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const text = `${task.title.toLowerCase()} ${task.description.toLowerCase()}`;

  // Count how many keywords are found in the text
  const matchedKeywords = keywords.filter(keyword => text.includes(keyword.toLowerCase()));

  // Calculate score based on percentage of matched keywords
  return matchedKeywords.length / keywords.length;
}

export async function generateProjectPlan(idea: string): Promise<ProjectPlan> {
  try {
    // Create a prompt for the AI to generate a project plan
    const prompt = `You are a SUPERINTELLIGENT TECHNICAL EXPERT with deep expertise across ALL technical domains. Create an extremely detailed and practical technical project plan for this idea: "${idea}"

IMPORTANT: Your response must be a single JSON object with NO additional text or formatting.
Format:
{
  "name": "<project name, max 60 chars>",
  "description": "<project description, max 200 chars>",
  "columns": [
    {
      "name": "<column name>",
      "key": "<column key in uppercase, e.g., TODO>",
      "color": "<optional color in hex or tailwind format>"
    }
  ],
  "tasks": [
    {
      "title": "<task title>",
      "description": "<detailed technical task description with implementation guidance>",
      "status": "<column key that this task belongs to>",
      "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT"
    }
  ]
}

DEEP ANALYSIS PHASE:
- THOROUGHLY ANALYZE the project idea to extract its TRUE ESSENCE and CORE REQUIREMENTS
- Identify the PRIMARY DOMAIN with extreme precision (AI/ML, web, mobile, game, hardware, blockchain, etc.)
- Determine the SPECIFIC SUB-DOMAIN (e.g., computer vision, e-commerce, fitness app, RPG game)
- Identify KEY TECHNOLOGIES that would be appropriate (languages, frameworks, libraries)
- Consider the SCALE and COMPLEXITY of the project to determine appropriate task granularity
- DO NOT make assumptions beyond what's stated - focus ONLY on what's explicitly or implicitly required
- If the idea is minimal, DO NOT invent unnecessary features or complexity

DOMAIN-SPECIFIC COLUMN CREATION:
- Create 6-10 HIGHLY SPECIALIZED columns that are PRECISELY TAILORED to the project domain
- Each column must represent a CRITICAL ASPECT of development in that specific domain
- For AI/ML: DATA_PREPARATION, MODEL_ARCHITECTURE, TRAINING, EVALUATION, DEPLOYMENT
- For Web: FRONTEND, BACKEND, DATABASE, API, AUTH, TESTING
- For Mobile: UI_DESIGN, CORE_FUNCTIONALITY, STATE_MANAGEMENT, NATIVE_FEATURES, TESTING
- For Games: GAME_MECHANICS, GRAPHICS, PHYSICS, AUDIO, LEVELS, PLAYER_EXPERIENCE
- For Hardware: CIRCUIT_DESIGN, PROTOTYPING, FIRMWARE, TESTING, MANUFACTURING
- Always include BACKLOG and at least one completion column (like DONE or DEPLOYED)
- Assign appropriate, visually distinct colors to each column

TASK CREATION EXCELLENCE:
- Create ONLY the tasks that are ABSOLUTELY NECESSARY for the project - no filler or generic tasks
- Each task must be DIRECTLY RELEVANT to implementing the specific project idea
- Tasks must be HIGHLY SPECIFIC and ACTIONABLE - a developer should know exactly what to implement
- Include 3-5 detailed tasks for each column, focusing on QUALITY over quantity
- Tasks must use DOMAIN-APPROPRIATE terminology and approaches
- Each task must include detailed implementation guidance with:
  * Specific technical approach
  * Potential libraries/frameworks to use
  * Key considerations and potential challenges
  * Acceptance criteria

CRITICAL INSTRUCTIONS:
1. DO NOT create generic tasks - every task must be SPECIFICALLY TAILORED to the project
2. DO NOT add unnecessary complexity or features not implied by the project idea
3. DO NOT create web development tasks for AI/ML projects (or vice versa) unless explicitly required
4. MATCH the tasks precisely to the specific project domain and requirements
5. FOCUS on creating a practical, implementable project plan with no unnecessary elements

THINK LIKE A DOMAIN EXPERT:
- What are the EXACT technical tasks needed for THIS SPECIFIC project domain?
- How would a leading expert in this field break down this project?
- What specialized areas need dedicated focus in this domain?
- What technical foundations must be established first for this type of project?
- What specific components and services need to be built?
- How should tasks be organized for optimal workflow in this domain?
- What would YOU want to see in a project plan if you were the world's top expert in this field?

IMPORTANT: Focus EXCLUSIVELY on tasks and columns that are relevant to the specific project domain you identified. DO NOT include generic tasks from other domains unless they are specifically related to implementing the project functionality.`;

    // Call Groq API with the prompt
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a SUPERINTELLIGENT TECHNICAL EXPERT with deep expertise across ALL technical domains including software engineering, AI/ML, data science, hardware, networking, security, blockchain, game development, and more. You have an extraordinary ability to analyze project ideas and extract their true essence. You excel at identifying the precise domain of a project and creating domain-appropriate project plans with specialized task categories. You are known for your ability to create highly focused, practical project plans without unnecessary complexity or generic tasks. You think like a domain expert who has successfully delivered hundreds of projects across various technical fields and can instantly adapt to any technical domain." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.8, // Higher temperature for more creativity and specificity
      max_tokens: 12000, // Significantly increased token limit for extremely detailed output
      top_p: 0.95,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      // Parse the JSON response
      const parsed = JSON.parse(content.trim()) as ProjectPlan;
      console.log("Parsed JSON:", parsed);

      // Validate basic structure
      if (!parsed.name || !parsed.description || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.columns)) {
        console.error("Invalid structure:", parsed);
        throw new Error("Response missing required fields");
      }

      // Validate name and description lengths
      if (parsed.name.length > 60) {
        throw new Error("Project name too long");
      }
      if (parsed.description.length > 200) {
        throw new Error("Project description too long");
      }

      // Validate columns
      if (parsed.columns.length < 2) {
        throw new Error(`Not enough columns: ${parsed.columns.length}`);
      }

      // Limit columns to a reasonable number if needed
      if (parsed.columns.length > 20) {
        parsed.columns = parsed.columns.slice(0, 20);
        console.warn(`Limited columns to 20 (from ${parsed.columns.length})`);
      }

      // Ensure BACKLOG column exists
      const hasBacklog = parsed.columns.some(col => col.key === "BACKLOG");
      if (!hasBacklog) {
        parsed.columns.push({
          name: "Backlog",
          key: "BACKLOG",
          color: "#E5E7EB"
        });
      }

      // Validate tasks
      if (parsed.tasks.length < 5) {
        throw new Error(`Not enough tasks: ${parsed.tasks.length}`);
      }

      // Limit tasks to a reasonable number if needed
      if (parsed.tasks.length > 100) {
        parsed.tasks = parsed.tasks.slice(0, 100);
        console.warn(`Limited tasks to 100 (from ${parsed.tasks.length})`);
      }

      // Get all valid column keys
      const validColumnKeys = parsed.columns.map(col => col.key);

      // Ensure all tasks have valid statuses
      for (const task of parsed.tasks) {
        if (!validColumnKeys.includes(task.status)) {
          // Default to BACKLOG if invalid
          task.status = "BACKLOG";
        }
      }

      // Ensure tasks are distributed across all columns
      ensureTaskDistribution(parsed.columns, parsed.tasks);

      // We can't store in memory yet since we don't have a project ID
      // This will be handled after project creation

      return parsed;
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
}
