'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskStatus = {
  id: string;
  project_id: string;
  name: string;
  key: string;
  color: string;
  is_default: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

type TaskStatusManageDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusesChange: () => void;
};

export default function TaskStatusManageDialog({
  projectId,
  open,
  onOpenChange,
  onStatusesChange,
}: TaskStatusManageDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('bg-gray-50 dark:bg-gray-900');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Available color options
  const colorOptions = [
    { name: 'Gray', value: 'bg-gray-50 dark:bg-gray-900' },
    { name: 'Neutral', value: 'bg-neutral-50 dark:bg-neutral-900' },
    { name: 'Blue', value: 'bg-blue-50 dark:bg-blue-900/20' },
    { name: 'Green', value: 'bg-green-50 dark:bg-green-900/20' },
    { name: 'Yellow', value: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { name: 'Red', value: 'bg-red-50 dark:bg-red-900/20' },
    { name: 'Purple', value: 'bg-purple-50 dark:bg-purple-900/20' },
    { name: 'Pink', value: 'bg-pink-50 dark:bg-pink-900/20' },
    { name: 'Indigo', value: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  // Fetch task statuses when the dialog opens
  useEffect(() => {
    if (open && projectId) {
      fetchTaskStatuses();
    }
  }, [open, projectId]);

  // Generate a key from the status name
  const generateKey = (name: string) => {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  };

  // Handle name change and auto-generate key
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewStatusName(name);
    setNewStatusKey(generateKey(name));
  };

  // Fetch task statuses from the API
  const fetchTaskStatuses = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching task statuses for dialog...');
      const response = await fetch(`/api/projects/${projectId}/task-statuses`);
      if (!response.ok) {
        console.error('Failed to fetch task statuses:', await response.text());
        throw new Error('Failed to fetch task statuses');
      }
      const data = await response.json();
      console.log('Fetched statuses for dialog:', data.length);
      setStatuses(data);

      // If no statuses exist, try to initialize default ones
      if (data.length === 0) {
        console.log('No statuses found, initializing default ones...');
        try {
          const initResponse = await fetch(`/api/projects/${projectId}/task-statuses/initialize`, {
            method: 'POST',
          });

          if (initResponse.ok) {
            const newStatuses = await initResponse.json();
            console.log('Initialized statuses:', newStatuses.length);
            setStatuses(newStatuses);
          } else {
            console.error('Failed to initialize statuses:', await initResponse.text());
            toast.error('Failed to initialize default statuses');
          }
        } catch (initError) {
          console.error('Error initializing statuses:', initError);
        }
      }
    } catch (error) {
      console.error('Error fetching task statuses:', error);
      toast.error('Failed to fetch task statuses');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new task status
  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim()) {
      toast.error('Status name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStatusName,
          key: newStatusKey,
          color: newStatusColor,
          order: statuses.length, // Add to the end
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task status');
      }

      const newStatus = await response.json();
      setStatuses([...statuses, newStatus]);
      setNewStatusName('');
      setNewStatusKey('');
      setNewStatusColor('bg-gray-50 dark:bg-gray-900');
      toast.success('Task status created');
      onStatusesChange();
    } catch (error) {
      console.error('Error creating task status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task status');
    } finally {
      setIsLoading(false);
    }
  };

  // Update a task status
  const handleUpdateStatus = async (statusId: string) => {
    if (!editName.trim()) {
      toast.error('Status name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses/${statusId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task status');
      }

      const updatedStatus = await response.json();
      setStatuses(statuses.map(status =>
        status.id === statusId ? updatedStatus : status
      ));
      setEditingStatusId(null);
      toast.success('Task status updated');
      onStatusesChange();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task status');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a task status
  const handleDeleteStatus = async (statusId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses/${statusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete task status');
      }

      setStatuses(statuses.filter(status => status.id !== statusId));
      toast.success('Task status deleted');
      onStatusesChange();
    } catch (error) {
      console.error('Error deleting task status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete task status');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing a status
  const startEditing = (status: TaskStatus) => {
    setEditingStatusId(status.id);
    setEditName(status.name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStatusId(null);
    setEditName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Task Statuses</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* List of existing statuses */}
          <div className="space-y-2">
            <Label>Current Statuses</Label>
            <div className="border rounded-md divide-y">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className={cn(
                    "p-3 flex items-center justify-between",
                    status.color
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {editingStatusId === status.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{status.name}</span>
                    )}
                    {status.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingStatusId === status.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUpdateStatus(status.id)}
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={cancelEditing}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {!status.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => startEditing(status)}
                            disabled={isLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!status.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStatus(status.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {statuses.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No task statuses found. Add one below.
                </div>
              )}
            </div>
          </div>

          {/* Form to add a new status */}
          <form onSubmit={handleCreateStatus} className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Add New Status</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Status Name</Label>
                <Input
                  id="name"
                  value={newStatusName}
                  onChange={handleNameChange}
                  placeholder="e.g., In Review"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key">Status Key</Label>
                <Input
                  id="key"
                  value={newStatusKey}
                  onChange={(e) => setNewStatusKey(e.target.value)}
                  placeholder="e.g., IN_REVIEW"
                  disabled={isLoading}
                  required
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map((color) => (
                  <Button
                    key={color.value}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-10 justify-start",
                      color.value,
                      newStatusColor === color.value && "ring-2 ring-primary"
                    )}
                    onClick={() => setNewStatusColor(color.value)}
                    disabled={isLoading}
                  >
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Status
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
