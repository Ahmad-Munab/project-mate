import { useEffect, useState } from 'react';
import type { Permissions } from '@/types/permissions';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await fetch('/api/user/permissions');
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  const can = (permission: keyof Permissions): boolean => {
    return permissions ? permissions[permission] : false;
  };

  return { permissions, loading, can };
}