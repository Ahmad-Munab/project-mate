import { useEffect, useState } from 'react';
import type { Permissions } from '@/types/permissions';

export function usePermissions(projectId?: string) {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        console.log('Fetching user permissions...');
        const url = projectId
          ? `/api/user/permissions?projectId=${projectId}`
          : '/api/user/permissions';

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('Received permissions data:', data);
          setPermissions(data);
          setRole(data.role || null);
        } else {
          console.error('Failed to fetch permissions:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [projectId]);

  const can = (permission: keyof Permissions): boolean => {
    console.log(`Checking permission '${permission}':`, permissions?.[permission]);
    return permissions ? permissions[permission] === true : false;
  };

  const isManager = (): boolean => {
    console.log('Checking if user is manager, role:', role);
    return role === 'MANAGER' || role === 'OWNER';
  };

  const isOwner = (): boolean => {
    console.log('Checking if user is owner, role:', role);
    return role === 'OWNER';
  };

  return { permissions, loading, can, role, isManager, isOwner };
}