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
import { ChevronDown, FolderKanban, User, Home, Plus, LogOut } from "lucide-react";

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

export default function UserNav() {
  const router = useRouter();
  const params = useParams();
  // No need for pathname
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
    <div className="flex items-center justify-between w-full">
      {/* Left side: User and Project */}
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage
              src={userData.avatarUrl}
              alt={displayName || "User avatar"}
            />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage
                    src={userData.avatarUrl}
                    alt={displayName || "User avatar"}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {userData.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          <span className="font-medium text-sm max-w-[120px] truncate">
            {displayName}
          </span>

          {/* Only show project name when on a project page */}
          {currentProject && (
            <div className="flex items-center">
              <span className="text-muted-foreground mx-1">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 px-2 py-1 h-8 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <span className="max-w-[120px] sm:max-w-[180px] truncate font-medium">
                      {currentProject.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="start">
                  <div className="max-h-[400px] overflow-y-auto px-1 py-1">
                    {/* Current Project */}
                    <div className="mb-2">
                      <DropdownMenuItem
                        key={currentProject.id}
                        className="flex items-center gap-2 rounded-md my-0.5 bg-accent/50 font-medium"
                        disabled
                      >
                        <div className="flex-1 truncate flex items-center">
                          <FolderKanban className="h-4 w-4 mr-2 text-primary" />
                          <span>{currentProject.name}</span>
                          {getRoleBadge(currentProject.myRole)}
                        </div>
                      </DropdownMenuItem>
                    </div>

                    {/* My Projects */}
                    {projects.filter(p => p.isOwner && p.id !== currentProject.id).length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 px-2">My Projects</div>
                        {projects.filter(p => p.isOwner && p.id !== currentProject.id).map(project => (
                          <DropdownMenuItem
                            key={project.id}
                            className="flex items-center gap-2 rounded-md my-0.5"
                            onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                          >
                            <div className="flex-1 truncate flex items-center">
                              <FolderKanban className="h-4 w-4 mr-2 text-primary" />
                              <span>{project.name}</span>
                              {getRoleBadge(project.myRole)}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}

                    {/* Shared With Me */}
                    {projects.filter(p => !p.isOwner && p.id !== currentProject.id).length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Shared With Me</div>
                        {projects.filter(p => !p.isOwner && p.id !== currentProject.id).map(project => (
                          <DropdownMenuItem
                            key={project.id}
                            className="flex items-center gap-2 rounded-md my-0.5"
                            onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                          >
                            <div className="flex-1 truncate flex items-center">
                              <FolderKanban className={`h-4 w-4 mr-2 ${project.myRole === 'MANAGER' ? 'text-purple-500' : 'text-green-500'}`} />
                              <span>{project.name}</span>
                              {getRoleBadge(project.myRole)}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-1">
                    <DropdownMenuItem onSelect={() => router.push('/dashboard')} className="rounded-md">
                      <Home className="h-4 w-4 mr-2" />
                      All Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/dashboard/projects/new')} className="rounded-md">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Right side: User Menu */}
      <div className="flex items-center gap-2">

      </div>
    </div>
  );
}
