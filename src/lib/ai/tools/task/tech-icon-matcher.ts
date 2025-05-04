/**
 * Tech Icon Matcher
 * This utility helps match task content with appropriate technology icons
 * using the simple-icons library
 */

import * as SimpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

// Technology categories with their associated icons
const TECH_CATEGORIES = {
  // Frontend frameworks and libraries
  frontend: [
    "react", "vue", "angular", "svelte", "nextdotjs", "nuxtdotjs", "gatsby",
    "javascript", "typescript", "html5", "css3", "tailwindcss", "bootstrap",
    "materialui", "styledcomponents", "sass", "less", "redux", "jquery"
  ],

  // Backend technologies
  backend: [
    "nodedotjs", "express", "nestjs", "django", "flask", "fastapi", "spring",
    "laravel", "rubyonrails", "php", "dotnet", "csharp", "java", "kotlin",
    "go", "rust", "python", "ruby", "perl"
  ],

  // Databases
  database: [
    "mongodb", "postgresql", "mysql", "sqlite", "redis", "elasticsearch",
    "mariadb", "microsoftsqlserver", "oracle", "firebase", "supabase",
    "cockroachlabs", "cassandra", "couchbase", "neo4j", "prisma", "sequelize"
  ],

  // DevOps and infrastructure
  devops: [
    "docker", "kubernetes", "amazonaws", "googlecloud", "microsoftazure",
    "digitalocean", "heroku", "netlify", "vercel", "jenkins", "githubactions",
    "travisci", "circleci", "ansible", "terraform", "nginx", "apache"
  ],

  // Mobile development
  mobile: [
    "android", "ios", "swift", "kotlin", "reactnative", "flutter", "ionic",
    "xamarin", "cordova", "capacitor"
  ],

  // Testing
  testing: [
    "jest", "mocha", "cypress", "selenium", "puppeteer", "playwright",
    "testinglibrary", "jasmine", "karma"
  ],

  // Design and UI/UX
  design: [
    "figma", "adobexd", "sketch", "adobephotoshop", "adobeillustrator",
    "invision", "framer", "storybook"
  ],

  // Version control and collaboration
  collaboration: [
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack",
    "notion", "trello"
  ],

  // AI and ML
  ai: [
    "tensorflow", "pytorch", "keras", "scikitlearn", "opencv", "pandas",
    "numpy", "jupyter", "openai"
  ],

  // CMS
  cms: [
    "wordpress", "drupal", "joomla", "ghost", "contentful", "strapi",
    "sanity", "prismic"
  ]
};

// Flatten all tech icons for easier searching
const ALL_TECH_ICONS = Object.values(TECH_CATEGORIES).flat();

/**
 * Find matching tech icons for a given task based on its content
 * @param title - The task title
 * @param description - The task description
 * @param maxIcons - Maximum number of icons to return (default: 3)
 * @returns Array of icon slugs that match the task content
 */
export function findMatchingTechIcons(
  title: string,
  description: string,
  maxIcons: number = 3
): string[] {
  // Combine title and description for searching
  const content = `${title} ${description}`.toLowerCase();

  // Store matches with their scores
  const matches: { slug: string; score: number }[] = [];

  // Check for each icon if it's mentioned in the content
  for (const iconSlug of ALL_TECH_ICONS) {
    // Get the icon from SimpleIcons
    const iconKey = Object.keys(SimpleIcons).find(
      (key) =>
        key !== "default" &&
        !key.startsWith("_") &&
        (SimpleIcons[key as keyof typeof SimpleIcons] as SimpleIcon).slug === iconSlug
    );

    if (!iconKey) continue;

    // Get the icon title
    const icon = SimpleIcons[iconKey as keyof typeof SimpleIcons] as SimpleIcon;
    const iconTitle = icon.title.toLowerCase();

    // Calculate match score
    let score = 0;

    // Direct mention of the icon slug (e.g., "react")
    if (content.includes(iconSlug)) {
      score += 10;
    }

    // Direct mention of the icon title (e.g., "React")
    if (content.includes(iconTitle)) {
      score += 8;
    }

    // Partial match at word boundary (e.g., "React component")
    const wordBoundaryRegex = new RegExp(`\\b${iconTitle}\\b`, 'i');
    if (wordBoundaryRegex.test(content)) {
      score += 5;
    }

    // If we have a score, add to matches
    if (score > 0) {
      matches.push({ slug: iconSlug, score });
    }
  }

  // Sort matches by score (highest first) and take the top maxIcons
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxIcons)
    .map(match => match.slug);
}

/**
 * Get tech icons for common development tasks
 * @param taskType - The type of task (e.g., "frontend", "backend", "database")
 * @param maxIcons - Maximum number of icons to return (default: 3)
 * @returns Array of icon slugs for the task type
 */
export function getTechIconsForTaskType(
  taskType: string,
  maxIcons: number = 3
): string[] {
  // Normalize task type
  const normalizedType = taskType.toLowerCase();

  // Find matching category
  for (const [category, icons] of Object.entries(TECH_CATEGORIES)) {
    if (normalizedType.includes(category)) {
      // Return random selection of icons from this category
      return shuffleArray(icons).slice(0, maxIcons);
    }
  }

  // If no specific category matches, return empty array
  return [];
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Suggest tech icons for a task based on its content
 * @param title - The task title
 * @param description - The task description
 * @param maxIcons - Maximum number of icons to return (default: 3)
 * @returns Array of icon slugs that are relevant to the task
 */
export function suggestTechIcons(
  title: string | null,
  description: string | null,
  maxIcons: number = 3
): string[] {
  // Handle null values
  const safeTitle = title || '';
  const safeDescription = description || '';

  // First try to find direct matches in the content
  const contentMatches = findMatchingTechIcons(safeTitle, safeDescription, maxIcons);

  // If we found enough matches, return them
  if (contentMatches.length >= maxIcons) {
    return contentMatches;
  }

  // Otherwise, try to infer the task type and get icons for that
  const taskTypes = [
    "frontend", "backend", "database", "devops", "mobile",
    "testing", "design", "collaboration", "ai", "cms"
  ];

  const content = `${safeTitle} ${safeDescription}`.toLowerCase();

  for (const taskType of taskTypes) {
    if (content.includes(taskType)) {
      // Get icons for this task type
      const typeIcons = getTechIconsForTaskType(taskType, maxIcons - contentMatches.length);

      // Combine with content matches, removing duplicates
      return [...new Set([...contentMatches, ...typeIcons])].slice(0, maxIcons);
    }
  }

  // If we still don't have enough, add some general development icons
  if (contentMatches.length < maxIcons) {
    // Common general development icons
    const generalIcons = ["github", "vscode", "git"];

    // Add as many as needed to reach maxIcons
    return [
      ...contentMatches,
      ...generalIcons.slice(0, maxIcons - contentMatches.length)
    ];
  }

  return contentMatches;
}
