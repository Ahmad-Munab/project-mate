"use client";

import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, FolderKanban, Share2, User, Home, ChevronRight, Plus, LogOut } from "lucide-react";

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
  const pathname = usePathname();
  const projectId = params?.projectId as string;

  const [userData, setUserData] = useState<UserData>({
    email: undefined,
    avatarUrl: undefined,
    name: undefined,
    id: undefined,
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Generate breadcrumb items based on the current path
  const getBreadcrumbItems = useCallback(() => {
    if (!pathname) return [];

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbItems = [];

    // Always add dashboard
    breadcrumbItems.push({
      label: 'Dashboard',
      href: '/dashboard',
      current: pathSegments.length === 1 && pathSegments[0] === 'dashboard'
    });

    // Add project if we're in a project
    if (currentProject && pathSegments.includes('projects') && projectId) {
      breadcrumbItems.push({
        label: currentProject.name,
        href: `/dashboard/projects/${projectId}`,
        current: pathSegments.length === 3 && pathSegments[2] === projectId
      });

      // Add additional segments (members, tasks, etc.)
      if (pathSegments.length > 3) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        breadcrumbItems.push({
          label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1),
          href: pathname,
          current: true
        });
      }
    }

    return breadcrumbItems;
  }, [pathname, currentProject, projectId]);

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

  // Get breadcrumb items
  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left side: Breadcrumb Navigation */}
      <div className="flex items-center">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <BreadcrumbItem key={index}>
                <BreadcrumbLink
                  href={item.href}
                  className={item.current ? "font-semibold" : "text-muted-foreground"}
                >
                  {index === 0 && <Home className="h-4 w-4 mr-1 inline-block" />}
                  {index === 1 && <FolderKanban className="h-4 w-4 mr-1 inline-block" />}
                  {item.label}
                </BreadcrumbLink>
                {index < breadcrumbItems.length - 1 && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Project Selector - Always show when projects are available */}
        {projects.length > 0 && currentProject && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-2 sm:px-3 h-9 text-sm hover:bg-accent/50 transition-colors ml-2"
              >
                <FolderKanban className="h-4 w-4 text-primary mr-1" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate font-medium">
                  {currentProject.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel className="font-semibold text-sm">Switch Project</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[400px] overflow-y-auto px-1">
                {/* Current Project */}
                {currentProject && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Current</div>
                    <DropdownMenuItem
                      key={currentProject.id}
                      className="flex items-center gap-2 bg-accent/50 rounded-md"
                      disabled
                    >
                      <div className="flex-1 truncate flex items-center">
                        <FolderKanban className="h-4 w-4 text-primary mr-2" />
                        <span className="font-medium">{currentProject.name}</span>
                        {getRoleBadge(currentProject.myRole)}
                      </div>
                    </DropdownMenuItem>
                  </div>
                )}

                {/* Projects you own */}
                {projects.filter(p => p.isOwner && (!currentProject || p.id !== currentProject.id)).length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Your Projects</div>
                    {projects.filter(p => p.isOwner && (!currentProject || p.id !== currentProject.id)).map(project => (
                      <DropdownMenuItem
                        key={project.id}
                        className="flex items-center gap-2 rounded-md"
                        onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                      >
                        <div className="flex-1 truncate flex items-center">
                          <FolderKanban className="h-4 w-4 text-primary mr-2" />
                          <span className="font-medium">{project.name}</span>
                          {getRoleBadge(project.myRole)}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}

                {/* Projects where you're a manager */}
                {projects.filter(p => !p.isOwner && p.myRole === 'MANAGER' && (!currentProject || p.id !== currentProject.id)).length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Managing</div>
                    {projects.filter(p => !p.isOwner && p.myRole === 'MANAGER' && (!currentProject || p.id !== currentProject.id)).map(project => (
                      <DropdownMenuItem
                        key={project.id}
                        className="flex items-center gap-2 rounded-md"
                        onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                      >
                        <div className="flex-1 truncate flex items-center">
                          <FolderKanban className="h-4 w-4 text-purple-500 mr-2" />
                          <span className="font-medium">{project.name}</span>
                          {getRoleBadge(project.myRole)}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}

                {/* Projects where you're a member */}
                {projects.filter(p => !p.isOwner && p.myRole === 'MEMBER' && (!currentProject || p.id !== currentProject.id)).length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Member Of</div>
                    {projects.filter(p => !p.isOwner && p.myRole === 'MEMBER' && (!currentProject || p.id !== currentProject.id)).map(project => (
                      <DropdownMenuItem
                        key={project.id}
                        className="flex items-center gap-2 rounded-md"
                        onSelect={() => router.push(`/dashboard/projects/${project.id}`)}
                      >
                        <div className="flex-1 truncate flex items-center">
                          <FolderKanban className="h-4 w-4 text-green-500 mr-2" />
                          <span className="font-medium">{project.name}</span>
                          {getRoleBadge(project.myRole)}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}

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
        )}
      </div>

      {/* Right side: User Menu */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-accent/50 px-2 py-1.5 transition-colors border border-transparent hover:border-border">
              <span className="font-medium text-sm hidden sm:inline-block max-w-[120px] truncate order-1">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block order-2" />
              <Avatar className="h-8 w-8 border border-border order-3">
                <AvatarImage
                  src={userData.avatarUrl}
                  alt={displayName || "User avatar"}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </div>
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
            <div className="px-1">
              <DropdownMenuItem onSelect={() => router.push("/settings")} className="rounded-md">
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <div className="px-1">
              <DropdownMenuItem onSelect={handleSignOut} className="rounded-md text-red-500 hover:text-red-600 hover:bg-red-100/50 focus:bg-red-100/50">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}