/**
 * Optimized Project Creator
 * This file implements an optimized project creation system with better
 * performance, error handling, and flexibility
 */

import { ChatGroq } from "@langchain/groq";
import { storeOptimizedMessage } from "../../memory/optimized-memory";
import { groqRateLimiter } from "../../utils/rate-limiter";
import { db } from "@/db";
import { projects, projectTaskStatuses, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { suggestTechIcons } from "../task/tech-icon-matcher";
import { generateDynamicColumns } from "@/config/dynamic-defaults";

/**
 * Configuration for the project creator
 */
const projectCreatorConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Generate a project plan based on a description with improved error handling
 * @param projectDescription - The description of the project
 * @returns The generated project plan
 */
export async function generateOptimizedProjectPlan(projectDescription: string) {
  return groqRateLimiter.enqueue(async () => {
    try {
      // Check if API key is available
      if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY is not defined in environment variables");
        throw new Error("API key configuration error");
      }

      // Log API key status (safely)
      console.log("API key status:", {
        present: !!process.env.GROQ_API_KEY,
        length: process.env.GROQ_API_KEY.length,
        firstChar: process.env.GROQ_API_KEY.charAt(0),
        lastChar: process.env.GROQ_API_KEY.charAt(process.env.GROQ_API_KEY.length - 1),
        prefix: process.env.GROQ_API_KEY.substring(0, 3),
      });

      // Create a model with error handling
      let model;
      try {
        model = new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          model: projectCreatorConfig.model,
          temperature: projectCreatorConfig.temperature,
          maxTokens: projectCreatorConfig.maxTokens,
        });

        console.log("Successfully initialized ChatGroq model");
      } catch (modelError) {
        console.error("Error initializing ChatGroq model:", modelError);
        throw new Error("Failed to initialize AI model. Please check your configuration.");
      }

      // Create a fully dynamic prompt that encourages phase-based columns and detailed instructive tasks
      const prompt = `
Create a detailed technical project plan for: "${projectDescription}"

Return JSON with:
{
  "name": "Short name",
  "description": "Brief description",
  "columns": [
    {"name": "Backlog", "key": "BACKLOG", "color": "bg-gray-50 dark:bg-gray-900"},
    {"name": "Planning", "key": "PLANNING", "color": "bg-purple-50 dark:bg-purple-900/20"},
    {"name": "Design", "key": "DESIGN", "color": "bg-indigo-50 dark:bg-indigo-900/20"},
    {"name": "Implementation", "key": "IMPLEMENTATION", "color": "bg-blue-50 dark:bg-blue-900/20"},
    {"name": "Review", "key": "REVIEW", "color": "bg-pink-50 dark:bg-pink-900/20"},
    {"name": "Testing", "key": "TESTING", "color": "bg-amber-50 dark:bg-amber-900/20"},
    {"name": "Deployment", "key": "DEPLOYMENT", "color": "bg-emerald-50 dark:bg-emerald-900/20"},
    {"name": "Production", "key": "PRODUCTION", "color": "bg-green-50 dark:bg-green-900/20"}
  ],
  "tasks": [
    {"title": "Task title", "description": "Step-by-step instructions with numbered steps to guide the user", "status": "BACKLOG", "priority": "HIGH"}
  ]
}

Rules:
- Create 7-10 columns that represent different PHASES of the project lifecycle
- NEVER use "Frontend" or "Backend" as column names - focus on project phases instead
- Create a comprehensive workflow with multiple phases (planning, design, implementation, review, testing, deployment, etc.)
- BACKLOG column is required as the first column
- Use simple, clear column names without the word "Phase" (e.g., "Planning" not "Planning Phase")
- All column keys should be UPPERCASE (e.g., "PLANNING", "DESIGN")
- Create 15-20 specific, actionable tasks that guide the user through the entire project lifecycle
- All tasks should initially be placed in the BACKLOG column
- Tasks MUST include numbered steps (1. First step, 2. Second step, etc.)
- Tasks should be clear, specific, and actionable - write them as if you're teaching a beginner
- Break down complex processes into smaller, manageable tasks with detailed instructions
- Include beginner-friendly tasks with clear guidance on how to accomplish each step
- For colors, use Tailwind CSS color classes (e.g., bg-blue-50, bg-green-50, bg-purple-50, etc.)
- Make sure each column has a unique key
- Include specialized columns based on the specific project type
- Focus on creating a complete project roadmap that guides users from start to finish
`.trim();

      // Call the model with retry logic and better error handling
      let response;
      try {
        console.log("Invoking ChatGroq model with prompt length:", prompt.length);
        const startTime = Date.now();
        response = await model.invoke(prompt);
        const duration = Date.now() - startTime;
        console.log(`Successfully received response in ${duration}ms`);
      } catch (error) {
        console.error("Error in first attempt:", error);

        // Log detailed error information
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Model invocation error details:", {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage,
          promptLength: prompt.length,
        });

        console.log("Retrying with simplified prompt");

        // Retry with a simplified but still user-friendly prompt
        const retryPrompt = `
Create a simple project plan for: "${projectDescription}"

Return JSON with:
{
  "name": "Project name",
  "description": "Brief description",
  "columns": [
    {"name": "Backlog", "key": "BACKLOG", "color": "bg-gray-50 dark:bg-gray-900"},
    {"name": "Planning", "key": "PLANNING", "color": "bg-purple-50 dark:bg-purple-900/20"},
    {"name": "Design", "key": "DESIGN", "color": "bg-indigo-50 dark:bg-indigo-900/20"},
    {"name": "Implementation", "key": "IMPLEMENTATION", "color": "bg-blue-50 dark:bg-blue-900/20"},
    {"name": "Review", "key": "REVIEW", "color": "bg-pink-50 dark:bg-pink-900/20"},
    {"name": "Testing", "key": "TESTING", "color": "bg-amber-50 dark:bg-amber-900/20"},
    {"name": "Deployment", "key": "DEPLOYMENT", "color": "bg-emerald-50 dark:bg-emerald-900/20"}
  ],
  "tasks": [
    {"title": "Task title", "description": "1. First step\n2. Second step\n3. Third step\n4. Fourth step\n5. Fifth step", "status": "BACKLOG", "priority": "MEDIUM"}
  ]
}

Rules:
- Create 6-8 columns that represent different PHASES of the project lifecycle
- NEVER use "Frontend" or "Backend" as column names - focus on project phases instead
- BACKLOG column is required as the first column
- Include a variety of phases (planning, design, implementation, review, testing, deployment, etc.)
- Use simple, clear column names without the word "Phase"
- All column keys should be UPPERCASE
- Create 10-15 specific, actionable tasks
- All tasks should be placed in the BACKLOG column
- Tasks MUST include numbered steps (1. First step, 2. Second step, etc.)
- Tasks should be clear, specific, and guide the user step by step
- Include beginner-friendly tasks with detailed instructions
- Make sure each column has a unique key
- Include specialized columns based on the specific project type
`.trim();

        try {
          console.log("Invoking ChatGroq model with simplified prompt, length:", retryPrompt.length);
          const startTime = Date.now();
          response = await model.invoke(retryPrompt);
          const duration = Date.now() - startTime;
          console.log(`Successfully received response from retry in ${duration}ms`);
        } catch (retryError) {
          console.error("Error in retry attempt:", retryError);

          // Log detailed error information for the retry
          const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
          console.error("Retry invocation error details:", {
            errorType: retryError instanceof Error ? retryError.constructor.name : typeof retryError,
            errorMessage: retryErrorMessage,
            promptLength: retryPrompt.length,
          });

          // Throw a more specific error
          if (retryErrorMessage.includes("rate limit") || retryErrorMessage.includes("quota")) {
            throw new Error("AI service rate limit exceeded. Please try again later.");
          } else if (retryErrorMessage.includes("timeout") || retryErrorMessage.includes("timed out")) {
            throw new Error("AI service request timed out. Please try again with a simpler description.");
          } else {
            throw new Error("Failed to generate project plan after multiple attempts.");
          }
        }
      }

      // Parse the response
      const content = response.content as string;

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from response");
      }

      const jsonStr = jsonMatch[0];
      const parsedResult = JSON.parse(jsonStr);

      // Validate the result
      if (!parsedResult.name || !parsedResult.description || !Array.isArray(parsedResult.columns) || !Array.isArray(parsedResult.tasks)) {
        throw new Error("Invalid response structure");
      }

      // Ensure we have at least 3 columns and always have a BACKLOG column
      if (parsedResult.columns.length < 3 || !parsedResult.columns.some((col: {key: string}) => col.key === "BACKLOG")) {
        console.log("Adding necessary columns");

        // Get existing column keys
        const existingKeys = parsedResult.columns.map((col: {key: string}) => col.key);

        // Make sure we have a BACKLOG column
        if (!existingKeys.includes("BACKLOG")) {
          parsedResult.columns.push({
            name: "Backlog",
            key: "BACKLOG",
            color: "bg-gray-50 dark:bg-gray-900"
          });
        }

        // If we still have fewer than 3 columns, add some dynamic ones based on the project description
        if (parsedResult.columns.length < 3) {
          // Extract keywords from the project description
          const keywords = projectDescription.toLowerCase().split(/\s+/)
            .filter(word => word.length > 4)
            .filter(word => !["project", "create", "build", "develop", "implement"].includes(word));

          // Add a development column if needed
          if (!existingKeys.includes("DEVELOPMENT") && parsedResult.columns.length < 3) {
            parsedResult.columns.push({
              name: "Development",
              key: "DEVELOPMENT",
              color: "bg-blue-50 dark:bg-blue-900/20"
            });
          }

          // Add a done column if needed
          if (!existingKeys.includes("DONE") && parsedResult.columns.length < 3) {
            parsedResult.columns.push({
              name: "Done",
              key: "DONE",
              color: "bg-emerald-50 dark:bg-emerald-900/20"
            });
          }

          // Add a custom column based on keywords if we still need more columns
          if (parsedResult.columns.length < 3 && keywords.length > 0) {
            const keyword = keywords[0];
            const columnName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            const columnKey = columnName.toUpperCase();

            if (!existingKeys.includes(columnKey)) {
              parsedResult.columns.push({
                name: columnName,
                key: columnKey,
                color: "bg-amber-50 dark:bg-amber-900/20"
              });
            }
          }
        }
      }

      // Define types for columns and tasks
      type Column = { name: string; key: string; color?: string };
      type Task = { title: string; description: string; status: string; priority: string };

      // Ensure tasks are distributed across columns
      const columnKeys = parsedResult.columns.map((col: Column) => col.key);
      const tasksPerColumn: Record<string, number> = {};

      // Initialize task counts
      columnKeys.forEach((key: string) => {
        tasksPerColumn[key] = 0;
      });

      // Count tasks per column
      parsedResult.tasks.forEach((task: Task) => {
        if (task.status && columnKeys.includes(task.status)) {
          tasksPerColumn[task.status]++;
        } else {
          // Default to BACKLOG if status is invalid
          task.status = "BACKLOG";
          tasksPerColumn["BACKLOG"] = (tasksPerColumn["BACKLOG"] || 0) + 1;
        }
      });

      // Ensure all tasks are in the BACKLOG column
      console.log("Ensuring all tasks are in the BACKLOG column");

      // Set all tasks to BACKLOG status
      parsedResult.tasks.forEach((task: Task) => {
        task.status = "BACKLOG";
      });

      // Make sure we have a BACKLOG column
      if (!parsedResult.columns.some((col: {key: string}) => col.key === "BACKLOG")) {
        console.log("Adding missing BACKLOG column");
        parsedResult.columns.unshift({
          name: "Backlog",
          key: "BACKLOG",
          color: "bg-gray-50 dark:bg-gray-900"
        });
      }

      // Ensure all columns have keys and follow a clean naming convention
      parsedResult.columns = parsedResult.columns.map((column: Column, index: number) => {
        // Skip formatting for the BACKLOG column
        if (column.key === "BACKLOG") {
          // Just ensure it has a color
          if (!column.color) {
            column.color = "bg-gray-50 dark:bg-gray-900";
          }
          return column;
        }

        // Format the column name to be clean and simple
        // Capitalize first letter of each word
        column.name = column.name
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
          // Remove "Phase" suffix if present
          .replace(/\s+Phase$/i, "");

        // Format the column key to be simple UPPERCASE
        if (!column.key) {
          // Create the key in UPPERCASE_WITH_UNDERSCORES format
          column.key = column.name.toUpperCase().replace(/\s+/g, '_');
        } else {
          // Ensure the key is in uppercase and remove _PHASE suffix if present
          column.key = column.key.toUpperCase().replace(/_PHASE$/i, "");
        }

        // Ensure color is set
        if (!column.color) {
          // Assign a default color based on index
          const colors = [
            "bg-purple-50 dark:bg-purple-900/20",
            "bg-blue-50 dark:bg-blue-900/20",
            "bg-green-50 dark:bg-green-900/20",
            "bg-indigo-50 dark:bg-indigo-900/20",
            "bg-emerald-50 dark:bg-emerald-900/20",
            "bg-amber-50 dark:bg-amber-900/20",
            "bg-orange-50 dark:bg-orange-900/20",
            "bg-red-50 dark:bg-red-900/20"
          ];

          column.color = colors[index % colors.length];
        }

        return column;
      });

      // Ensure all tasks have priorities
      parsedResult.tasks = parsedResult.tasks.map((task: Task) => {
        if (!task.priority || !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(task.priority)) {
          task.priority = 'MEDIUM';
        }
        return task;
      });

      return parsedResult;
    } catch (error) {
      console.error("Failed to generate project plan:", error);

      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log detailed error information for debugging
      console.error("Project creation error details:", {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage,
        apiKey: process.env.GROQ_API_KEY ? "Present (length: " + process.env.GROQ_API_KEY.length + ")" : "Missing",
        projectDescription: projectDescription.substring(0, 50) + "...",
      });

      // Handle specific error types with appropriate messages
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota") ||
          errorMessage.includes("429") || errorMessage.includes("too many requests")) {
        console.error("Rate limit error detected");
        throw new Error("AI service rate limit exceeded. Please try again later.");
      }

      if (errorMessage.includes("authentication") || errorMessage.includes("auth") ||
          errorMessage.includes("key") || errorMessage.includes("401") ||
          errorMessage.includes("403")) {
        console.error("Authentication error detected");
        throw new Error("AI service authentication error. Please check your API key configuration.");
      }

      if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        console.error("Timeout error detected");
        throw new Error("AI service request timed out. Please try again with a simpler description.");
      }

      // For other errors, we'll use the fallback but log it clearly
      console.error("Using fallback project plan due to unhandled error");

      // Return a fallback plan with phase-based columns
      const projectWords = projectDescription.split(/\s+/).filter(word => word.length > 4);
      const uniqueWords = [...new Set(projectWords)].slice(0, 3);

      // Generate a fully dynamic set of phase-based columns
      // This approach creates columns based on project lifecycle phases, not technical divisions

      // Use the centralized dynamic columns generator from config
      const getDynamicColumns = (description: string) => {
        // Get columns from the centralized configuration
        const dynamicColumns = generateDynamicColumns(description);

        // Convert to the format expected by the project creator
        return dynamicColumns.map(column => ({
          name: column.name,
          key: column.key,
          color: column.color
        }));
      };

      // Generate dynamic columns based on project description
      const dynamicColumns = getDynamicColumns(projectDescription);

      // Generate highly detailed, instructive tasks with step-by-step guidance
      // Define a function to create dynamic tasks based on project description
      const generateDynamicTasks = (description: string) => {
        // Extract keywords from description to customize tasks
        const keywords = description.toLowerCase().split(/\s+/)
          .filter(word => word.length > 4)
          .filter(word => !["project", "create", "build", "develop", "implement"].includes(word));

        // Create a comprehensive set of tasks with detailed instructions
        const tasks = [
          {
            title: "Set up project environment",
            description: `1. Create a new folder for your project with a descriptive name\n2. Open your terminal and navigate to the folder with 'cd your-folder-name'\n3. Initialize version control with 'git init'\n4. Create a .gitignore file for your project type\n5. Initialize package manager with 'npm init -y' or 'yarn init -y'\n6. Install essential dependencies for your project\n7. Set up basic folder structure following best practices\n8. Create configuration files (.env, tsconfig.json, etc.)`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Create comprehensive documentation",
            description: `1. Create a README.md file with project title, description, and badges\n2. Document detailed installation steps with code examples\n3. Add usage instructions with screenshots or code snippets\n4. Include API documentation if applicable\n5. Add contribution guidelines for other developers\n6. Document project structure with explanations\n7. Include troubleshooting section for common issues\n8. Add license information`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Design detailed project architecture",
            description: `1. Identify all main components and modules needed\n2. Create a detailed diagram showing component relationships\n3. Define comprehensive data models and schemas\n4. Plan all API endpoints with request/response formats\n5. Document architectural decisions and rationales\n6. Consider scalability and performance requirements\n7. Plan error handling and logging strategy\n8. Design security measures and authentication flow`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Research optimal technologies",
            description: `1. List all functional and non-functional requirements\n2. Research suitable frameworks, libraries, and tools\n3. Compare options based on performance, community support, and features\n4. Read documentation and tutorials for shortlisted options\n5. Create small proof-of-concept implementations\n6. Document findings with pros and cons of each option\n7. Make technology selection decisions with justifications\n8. Create a dependency map showing relationships between chosen technologies`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Create detailed UI/UX design",
            description: `1. Research user needs and create user personas\n2. Sketch initial wireframes for all main screens\n3. Design comprehensive user flows and interactions\n4. Create high-fidelity mockups for all screens\n5. Develop a detailed style guide with colors, typography, and components\n6. Design responsive layouts for mobile, tablet, and desktop\n7. Get feedback on designs from potential users\n8. Iterate on designs based on feedback`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Set up development environment",
            description: `1. Install all necessary development tools and extensions\n2. Configure code editor with appropriate settings\n3. Set up linting and code formatting tools\n4. Configure pre-commit hooks for code quality\n5. Set up hot reloading for development\n6. Configure environment variables for different environments\n7. Set up debugging tools and configurations\n8. Document development environment setup process`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Implement core features",
            description: `1. Set up the basic application structure and entry points\n2. Implement authentication and authorization system\n3. Create database models and establish connections\n4. Develop API endpoints with proper error handling\n5. Build essential UI components and layouts\n6. Implement state management solution\n7. Add form validation and error handling\n8. Implement navigation and routing`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Create comprehensive testing strategy",
            description: `1. Choose appropriate testing tools and frameworks\n2. Set up unit testing environment and configuration\n3. Create test cases for critical functionality\n4. Implement integration tests for component interactions\n5. Set up end-to-end testing for user flows\n6. Configure test coverage reporting\n7. Set up automated test running in CI/CD pipeline\n8. Document testing strategy and procedures`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Implement data management",
            description: `1. Design database schema with relationships\n2. Set up database connection and configuration\n3. Implement data access layer or ORM\n4. Create data migration scripts\n5. Implement data validation and sanitization\n6. Add error handling for database operations\n7. Optimize database queries for performance\n8. Implement data caching if needed`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Configure robust deployment process",
            description: `1. Research and choose appropriate hosting platform\n2. Set up CI/CD pipeline for automated deployments\n3. Configure environment variables for production\n4. Create build scripts and optimization\n5. Set up staging environment for pre-production testing\n6. Configure domain and SSL certificates\n7. Create deployment documentation with rollback procedures\n8. Test deployment process end-to-end`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Implement security measures",
            description: `1. Conduct security audit of dependencies\n2. Implement secure authentication practices\n3. Add input validation and sanitization\n4. Configure proper CORS and CSP headers\n5. Implement rate limiting for API endpoints\n6. Add protection against common vulnerabilities (XSS, CSRF, etc.)\n7. Set up security monitoring and alerts\n8. Document security practices and procedures`,
            status: "BACKLOG",
            priority: "HIGH"
          },
          {
            title: "Add comprehensive monitoring",
            description: `1. Set up error tracking and reporting\n2. Implement detailed application logging\n3. Configure performance monitoring\n4. Set up real-time alerts for critical issues\n5. Add analytics to track user behavior\n6. Create dashboards for key metrics\n7. Implement health checks and status endpoints\n8. Document monitoring setup and procedures`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Optimize application performance",
            description: `1. Identify performance bottlenecks through profiling\n2. Optimize database queries and indexes\n3. Implement caching strategies where appropriate\n4. Optimize frontend assets (code splitting, lazy loading)\n5. Minimize and optimize network requests\n6. Implement server-side rendering if applicable\n7. Optimize images and media assets\n8. Document performance optimizations and benchmarks`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Implement accessibility features",
            description: `1. Research accessibility standards and requirements\n2. Add proper semantic HTML structure\n3. Ensure keyboard navigation works properly\n4. Add ARIA attributes where necessary\n5. Ensure proper color contrast for text\n6. Test with screen readers and assistive technologies\n7. Fix identified accessibility issues\n8. Document accessibility features and compliance`,
            status: "BACKLOG",
            priority: "MEDIUM"
          },
          {
            title: "Create user documentation",
            description: `1. Create comprehensive user guide\n2. Add step-by-step tutorials for common tasks\n3. Create FAQ section for common questions\n4. Add troubleshooting guide for common issues\n5. Create video tutorials if applicable\n6. Design help center or knowledge base\n7. Implement contextual help within the application\n8. Set up feedback mechanism for documentation`,
            status: "BACKLOG",
            priority: "LOW"
          }
        ];

        // Add custom tasks based on keywords if available
        if (keywords.length > 0) {
          const keyword = keywords[0];
          const customName = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();

          tasks.push({
            title: `Implement ${customName} functionality`,
            description: `1. Research best practices for ${keyword} implementation\n2. Design the ${keyword} architecture and components\n3. Create necessary models and data structures\n4. Implement core ${keyword} functionality\n5. Add user interface for ${keyword} features\n6. Write comprehensive tests for ${keyword} functionality\n7. Document the ${keyword} implementation details\n8. Optimize ${keyword} performance and user experience`,
            status: "BACKLOG",
            priority: "HIGH"
          });
        }

        return tasks;
      };

      // Generate dynamic tasks based on project description
      const dynamicTasks = generateDynamicTasks(projectDescription);

      // Add tech icons to each task
      const tasksWithIcons = dynamicTasks.map(task => {
        const icons = suggestTechIcons(task.title, task.description);
        return {
          ...task,
          tech_icons: icons
        };
      });

      // The custom task is already handled in the generateDynamicTasks function

      return {
        name: projectDescription.substring(0, 30) + "...",
        description: projectDescription.substring(0, 200),
        columns: dynamicColumns,
        tasks: tasksWithIcons
      };
    }
  }, 2); // Higher priority for project creation
}

/**
 * Create a project with optimized column and task creation
 * @param userId - The ID of the user creating the project
 * @param projectDescription - The description of the project
 * @returns The created project
 */
export async function createOptimizedProject(userId: string, projectDescription: string) {
  try {
    // Generate the project plan
    const plan = await generateOptimizedProjectPlan(projectDescription);

    if (!plan) {
      throw new Error("Failed to generate project plan");
    }

    // Create the project in a transaction
    return await db.transaction(async (tx) => {
      // Create the project
      const [newProject] = await tx.insert(projects)
        .values({
          name: plan.name,
          description: plan.description,
          ownerId: userId,
        })
        .returning();

      if (!newProject?.id) {
        throw new Error("Failed to create project record");
      }

      // Create all columns in a batch
      const columnValues = plan.columns.map((column: { name: string; key: string; color?: string }, index: number) => ({
        project_id: newProject.id,
        name: column.name,
        key: column.key,
        color: column.color || 'bg-gray-50 dark:bg-gray-900',
        is_default: column.key === 'BACKLOG',
        order: index,
      }));

      const createdColumns = await tx.insert(projectTaskStatuses)
        .values(columnValues)
        .returning();

      // Create all tasks in a batch with dynamic status handling
      const taskValues = plan.tasks.map((task: { title: string; description: string; status: string; priority: string }) => {
        // For the status enum field, we need to map any custom status to one of the valid enum values
        // The database schema has a fixed enum for the status field, but we use status_key for custom statuses

        // Default to BACKLOG for the enum value
        let statusEnum = "BACKLOG";

        // Try to map to a valid enum value if possible
        const validEnums = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];
        if (validEnums.includes(task.status)) {
          statusEnum = task.status;
        } else {
          // Try to find the closest matching enum
          // This helps maintain some semantic meaning in the status field
          if (task.status.includes("PLAN") || task.status.includes("DESIGN") || task.status.includes("RESEARCH")) {
            statusEnum = "BACKLOG";
          } else if (task.status.includes("PROGRESS") || task.status.includes("DEVELOP") || task.status.includes("IMPLEMENT")) {
            statusEnum = "IN_PROGRESS";
          } else if (task.status.includes("TEST") || task.status.includes("REVIEW")) {
            statusEnum = "TODO";
          } else if (task.status.includes("DONE") || task.status.includes("COMPLETE") || task.status.includes("FINISH")) {
            statusEnum = "DONE";
          }
          // Otherwise, keep the default BACKLOG
        }

        // Ensure priority is valid
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
        const priority = validPriorities.includes(task.priority) ? task.priority : "MEDIUM";

        // Suggest tech icons based on task content
        const techIcons = suggestTechIcons(task.title, task.description);

        return {
          project_id: newProject.id,
          title: task.title,
          description: task.description,
          status: statusEnum, // Use valid enum value for the status field
          status_key: task.status, // Keep the original status key for custom columns
          priority: priority,
          created_by: userId,
          tech_icons: JSON.stringify(techIcons), // Add tech icons as JSON string
          tech_icon: techIcons.length > 0 ? techIcons[0] : null, // For backward compatibility
        };
      });

      await tx.insert(tasks)
        .values(taskValues)
        .returning();

      // Store the project plan as a message
      await storeOptimizedMessage(
        newProject.id,
        {
          role: "system",
          content: `Generated project plan: ${JSON.stringify(plan)}`,
          timestamp: new Date(),
        }
      );

      return {
        project: newProject,
        columns: createdColumns,
        taskCount: taskValues.length,
      };
    });
  } catch (error) {
    console.error("Failed to create optimized project:", error);

    // Add more detailed error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Project creation failure details:", {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage,
      userId,
      projectDescriptionLength: projectDescription.length,
    });

    // Check for specific error types and provide better error messages
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") ||
        errorMessage.includes("429") || errorMessage.includes("too many requests")) {
      throw new Error("AI service rate limit exceeded. Please try again later.");
    }

    if (errorMessage.includes("authentication") || errorMessage.includes("auth") ||
        errorMessage.includes("key") || errorMessage.includes("401") ||
        errorMessage.includes("403")) {
      throw new Error("AI service authentication error. Please contact support.");
    }

    if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
      throw new Error("Request timed out. Please try again with a simpler description.");
    }

    if (errorMessage.includes("Failed to generate project plan")) {
      throw new Error("Unable to generate a project plan. Please try a different description.");
    }

    // For any other errors, throw a generic message
    throw new Error("Failed to create project. Please try again later.");
  }
}

/**
 * Generate a project description based on a title
 * @param projectTitle - The title of the project
 * @returns The generated project description
 */
export async function generateOptimizedProjectDescription(projectTitle: string) {
  return groqRateLimiter.enqueue(async () => {
    try {
      // Create a model
      const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY!,
        model: "llama3-8b-8192", // Use smaller model for descriptions
        temperature: 0.5,
        maxTokens: 200,
      });

      // Create a concise prompt
      const prompt = `Write a 1-2 sentence technical description for: "${projectTitle}"`.trim();

      // Call the model
      const response = await model.invoke(prompt);

      return response.content as string;
    } catch (error) {
      console.error("Failed to generate project description:", error);
      return `A project called "${projectTitle}"`;
    }
  });
}
