import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { createProjectInviteLink } from "../utils/api";

interface InviteDialogProps {
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteDialog({
  projectId,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "MANAGER">("MEMBER");
  const [isLoading, setIsLoading] = useState(false);

  const createInviteLink = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const inviteUrl = await createProjectInviteLink(projectId, inviteRole);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard");

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error("Failed to create invite link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={inviteRole}
            onValueChange={(value: "MANAGER" | "MEMBER") =>
              setInviteRole(value)
            }
          >
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
          </Select>
          <Button onClick={createInviteLink} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Invite Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
