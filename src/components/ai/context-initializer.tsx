'use client';

/**
 * Project Context Initializer
 * This component initializes the project context when a user visits a project page
 */

import { useEffect, useState } from 'react';
import { initializeProjectContextClient } from '@/lib/ai';
import { useToast } from '@/components/ui/use-toast';

interface ContextInitializerProps {
  projectId: string;
}

export function ProjectContextInitializer({ projectId }: ContextInitializerProps) {
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Skip if already initialized or initializing
    if (initialized || initializing || !projectId) {
      return;
    }

    // Set initializing flag
    setInitializing(true);

    // Initialize project context
    const initializeContext = async () => {
      try {
        // Check if we've already initialized this project in this session
        const initializedProjects = JSON.parse(sessionStorage.getItem('initializedProjects') || '{}');
        
        if (initializedProjects[projectId]) {
          console.log('Project context already initialized in this session');
          setInitialized(true);
          setInitializing(false);
          return;
        }

        // Initialize project context
        const success = await initializeProjectContextClient(projectId);

        if (success) {
          console.log('Project context initialized successfully');
          
          // Store in session storage
          initializedProjects[projectId] = true;
          sessionStorage.setItem('initializedProjects', JSON.stringify(initializedProjects));
          
          // Show success toast (uncomment if you want to show a toast)
          // toast({
          //   title: 'AI Context Initialized',
          //   description: 'The AI now has full context of your project.',
          //   variant: 'default',
          // });
        } else {
          console.error('Failed to initialize project context');
          
          // Show error toast (uncomment if you want to show a toast)
          // toast({
          //   title: 'AI Context Initialization Failed',
          //   description: 'The AI may have limited context of your project.',
          //   variant: 'destructive',
          // });
        }

        // Set initialized flag
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing project context:', error);
        
        // Show error toast (uncomment if you want to show a toast)
        // toast({
        //   title: 'AI Context Initialization Failed',
        //   description: 'The AI may have limited context of your project.',
        //   variant: 'destructive',
        // });
      } finally {
        // Reset initializing flag
        setInitializing(false);
      }
    };

    // Initialize context
    initializeContext();
  }, [projectId, initialized, initializing, toast]);

  // This component doesn't render anything
  return null;
}
