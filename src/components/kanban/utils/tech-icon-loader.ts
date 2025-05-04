/**
 * Tech Icon Loader Utility
 * Responsible for loading and parsing tech icons from task data
 */

import * as SimpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

export interface TechIcon {
  slug: string;
  svg: string;
  title: string;
}

/**
 * Extract tech icon slugs from task data
 * Handles different data formats for tech_icons
 */
export function extractTechIconSlugs(techIcons: any, techIcon?: string): string[] {
  let iconSlugs: string[] = [];

  // Handle different data types for tech_icons
  if (techIcons) {
    if (Array.isArray(techIcons)) {
      iconSlugs = techIcons;
    } else if (typeof techIcons === 'string') {
      try {
        // Try to parse JSON string
        const parsed = JSON.parse(techIcons);
        iconSlugs = Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not valid JSON, treat as a single icon
        iconSlugs = [techIcons];
      }
    }
  } else if (techIcon) {
    // Fallback to legacy tech_icon
    iconSlugs = [techIcon];
  }

  return iconSlugs;
}

/**
 * Load tech icons from slugs using SimpleIcons
 */
export function loadTechIcons(iconSlugs: string[]): TechIcon[] {
  if (iconSlugs.length === 0) {
    return [];
  }

  try {
    // Find all icons in SimpleIcons
    const loadedIcons = iconSlugs.map(slug => {
      const iconKey = Object.keys(SimpleIcons).find(
        (key) =>
          key !== "default" &&
          !key.startsWith("_") &&
          // Cast to SimpleIcon to access slug property
          (SimpleIcons[key as keyof typeof SimpleIcons] as SimpleIcon).slug === slug
      );

      if (iconKey) {
        // Cast to SimpleIcon to access properties
        const icon = SimpleIcons[iconKey as keyof typeof SimpleIcons] as SimpleIcon;
        return { slug, svg: icon.svg, title: icon.title };
      }
      return null;
    }).filter(icon => icon !== null) as TechIcon[];

    return loadedIcons;
  } catch (error) {
    console.error("Error loading tech icons:", error);
    return [];
  }
}

/**
 * Process tech icons from task data
 * Combines extraction and loading in one function
 */
export function processTechIcons(techIcons: any, techIcon?: string | null): TechIcon[] {
  const iconSlugs = extractTechIconSlugs(techIcons, techIcon || undefined);
  return loadTechIcons(iconSlugs);
}
