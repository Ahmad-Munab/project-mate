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
import {
    ChevronDown,
    FolderKanban,
    User,
    Home,
    Plus,
    LogOut,
} from "lucide-react";

// Types
interface UserData {
    email?: string;
    avatarUrl?: string;
    name?: string;
    id?: string;
}

interface Project {
    id: string;
    name: string;
    description: string | null;
    isOwner: boolean;
    myRole: string;
}

// Role Badge Component
const RoleBadge = ({ role }: { role: string }) => {
    const badges = {
        OWNER: { color: "bg-blue-500 hover:bg-blue-600", label: "Owner" },
        MANAGER: {
            color: "bg-purple-500 hover:bg-purple-600",
            label: "Manager",
        },
        MEMBER: { color: "bg-green-500 hover:bg-green-600", label: "Member" },
    };

    const badgeConfig = badges[role?.toUpperCase() as keyof typeof badges];
    if (!badgeConfig) return null;

    return (
        <Badge className={`ml-2 ${badgeConfig.color} text-xs`}>
            {badgeConfig.label}
        </Badge>
    );
};

// Project List Item Component
const ProjectListItem = ({
    project,
    isCurrentProject,
    onSelect,
}: {
    project: Project;
    isCurrentProject?: boolean;
    onSelect?: () => void;
}) => (
    <DropdownMenuItem
        key={project.id}
        className={`flex items-center gap-2 rounded-md my-0.5 ${
            isCurrentProject ? "bg-accent/50 font-medium" : ""
        }`}
        disabled={isCurrentProject}
        onSelect={onSelect}
    >
        <div className="flex-1 flex items-center">
            <FolderKanban
                className={`h-4 w-4 mr-2 flex-shrink-0 ${
                    !project.isOwner
                        ? project.myRole === "MANAGER"
                            ? "text-purple-500"
                            : "text-green-500"
                        : "text-primary"
                }`}
            />
            <span className="break-words whitespace-normal">
                {project.name}
            </span>
            <RoleBadge role={project.myRole} />
        </div>
    </DropdownMenuItem>
);

// Project Section Component
const ProjectSection = ({
    title,
    projects,
    currentProjectId,
    onProjectSelect,
}: {
    title: string;
    projects: Project[];
    currentProjectId: string;
    onProjectSelect: (projectId: string) => void;
}) => {
    if (projects.length === 0) return null;

    return (
        <div className="mb-2">
            <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
                {title}
            </div>
            {projects.map((project) => (
                <ProjectListItem
                    key={project.id}
                    project={project}
                    isCurrentProject={project.id === currentProjectId}
                    onSelect={() =>
                        onProjectSelect(`/dashboard/projects/${project.id}`)
                    }
                />
            ))}
        </div>
    );
};

export default function UserNav() {
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as string;

    const [userData, setUserData] = useState<UserData>({});
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            setUserData({
                email: user.email,
                avatarUrl: user.user_metadata.avatar_url,
                name: user.user_metadata.full_name || user.email?.split("@")[0],
                id: user.id,
            });

            try {
                const response = await fetch("/api/projects");
                if (!response.ok) return;

                const projectsData = await response.json();
                setProjects(projectsData);

                if (projectId) {
                    const current = projectsData.find(
                        (p: Project) => p.id === projectId
                    );
                    setCurrentProject(current || null);
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
            }
        };

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
        : userData.email?.[0]?.toUpperCase() || "?";

    const displayName =
        userData.name || userData.email?.split("@")[0] || "User";

    return (
        <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2 ml-5">
                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 px-2 h-9 hover:bg-accent/50 transition-colors"
                            aria-label="Open user menu"
                        >
                            <Avatar
                                className="h-8 w-8 border border-border cursor-pointer"
                                onClick={() => router.push("/dashboard")}
                            >
                                <AvatarImage
                                    src={userData.avatarUrl}
                                    alt={displayName}
                                />
                                <AvatarFallback className="text-xs">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm max-w-[120px] truncate">
                                {displayName}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage
                                    src={userData.avatarUrl}
                                    alt={displayName}
                                />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium leading-none">
                                    {displayName}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground mt-1">
                                    {userData.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => router.push("/settings")}
                        >
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

                {/* Project Selector */}
                {currentProject && (
                    <div className="flex items-center">
                        <span className="text-muted-foreground mx-2">/</span>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 px-2 h-9 hover:bg-accent/50 transition-colors"
                            onClick={() => router.push(`/dashboard/projects/${currentProject.id}`)}
                        >
                            <span className="max-w-[180px] truncate font-medium">
                                {currentProject.name}
                            </span>
                            <RoleBadge role={currentProject.myRole} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 px-2 h-9 hover:bg-accent/50 transition-colors"
                                    aria-label="Open project menu"
                                >
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[350px]"
                                align="end"
                            >
                                <div className="p-1">
                                    {/* Current Project */}
                                    <ProjectListItem
                                        project={currentProject}
                                        isCurrentProject
                                    />

                                    {/* My Projects */}
                                    <ProjectSection
                                        title="My Projects"
                                        projects={projects.filter(
                                            (p) =>
                                                p.isOwner &&
                                                p.id !== currentProject.id
                                        )}
                                        currentProjectId={currentProject.id}
                                        onProjectSelect={(path) =>
                                            router.push(path)
                                        }
                                    />

                                    {/* Shared Projects */}
                                    <ProjectSection
                                        title="Shared With Me"
                                        projects={projects.filter(
                                            (p) =>
                                                !p.isOwner &&
                                                p.id !== currentProject.id
                                        )}
                                        currentProjectId={currentProject.id}
                                        onProjectSelect={(path) =>
                                            router.push(path)
                                        }
                                    />

                                    <DropdownMenuSeparator />
                                    <div className="px-1">
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                router.push("/dashboard")
                                            }
                                            className="rounded-md"
                                        >
                                            <Home className="h-4 w-4 mr-2" />
                                            All Projects
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                router.push(
                                                    "/dashboard/projects/new"
                                                )
                                            }
                                            className="rounded-md"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Project
                                        </DropdownMenuItem>
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </div>
    );
}
