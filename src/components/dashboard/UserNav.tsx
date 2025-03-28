"use client";

import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ChevronDown, FolderKanban, Share2, User, Home } from "lucide-react";

type UserData = {
  email: string | undefined;
  avatarUrl: string | undefined;
  name: string | undefined;
  id: string | undefined;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  myRole: string;
};

export function UserNav() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [userData, setUserData] = useState<UserData>({
    email: undefined,
    avatarUrl: undefined,
    name: undefined,
    id: undefined,
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserData({
          email: user.email,
          avatarUrl: user.user_metadata.avatar_url,
          name: user.user_metadata.full_name || user.email?.split('@')[0],
          id: user.id,
        });

        // Fetch user's projects
        try {
          const response = await fetch('/api/projects');
          if (response.ok) {
            const projectsData = await response.json();
            setProjects(projectsData);

            // If we're on a project page, find the current project
            if (projectId) {
              const current = projectsData.find((p: Project) => p.id === projectId);
              if (current) {
                setCurrentProject(current);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching projects:', error);
        }
      }
    }

    fetchUserData();
  }, [projectId]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const initials = userData.name
    ? userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userData.email
    ? userData.email[0].toUpperCase()
    : "?";

  // Format display name
  const displayName = userData.name || userData.email?.split('@')[0] || 'User';

  // Format role badge
  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'OWNER':
        return <Badge className="ml-2 bg-blue-500 hover:bg-blue-600 text-xs">Owner</Badge>;
      case 'MANAGER':
        return <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 text-xs">Manager</Badge>;
      case 'MEMBER':
        return <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-xs">Member</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {/* Project Selector - Only show when on a project page */}
      {currentProject && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 px-2 sm:px-3 h-9 text-sm hover:bg-accent/50 transition-colors"
            >
              <FolderKanban className="h-4 w-4 text-muted-foreground mr-1 hidden sm:inline-block" />
              <span className="max-w-[120px] sm:max-w-[180px] truncate font-medium">
                {currentProject.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel>Your Projects</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {projects.filter(p => p.isOwner).map(project => (
                <DropdownMenuItem
                  key={project.id}
                  className={`flex items-center gap-2 ${project.id === currentProject.id ? 'bg-accent/50' : ''}`}
                  onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                >
                  <div className="flex-1 truncate">
                    <span className="font-medium">{project.name}</span>
                    {getRoleBadge(project.myRole)}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>

            {projects.some(p => !p.isOwner) && (
              <>
                <DropdownMenuLabel className="mt-2">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Shared with you</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[200px] overflow-y-auto">
                  {projects.filter(p => !p.isOwner).map(project => (
                    <DropdownMenuItem
                      key={project.id}
                      className={`flex items-center gap-2 ${project.id === currentProject.id ? 'bg-accent/50' : ''}`}
                      onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      <div className="flex-1 truncate">
                        <span className="font-medium">{project.name}</span>
                        {getRoleBadge(project.myRole)}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
              <Home className="h-4 w-4 mr-2" />
              All Projects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User Menu */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer rounded-full hover:bg-accent/50 p-1 transition-colors">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage
                  src={userData.avatarUrl}
                  alt={displayName || "User avatar"}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm hidden sm:inline-block max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userData.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
