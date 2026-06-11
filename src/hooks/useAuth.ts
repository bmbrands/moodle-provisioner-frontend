import { useState, useCallback, useMemo, useEffect } from 'react';
import type { User } from '../types/user';
import * as api from '../services/api';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, ask the backend who we are (relies on the HTTP-only session cookie).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await api.fetchCurrentUser();
        if (!cancelled) setCurrentUser(user);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const user = await api.login(email, password);
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<User> => {
      const user = await api.changePassword(currentPassword, newPassword);
      setCurrentUser(user);
      return user;
    },
    []
  );

  // Apply a locally-known user update (e.g. after a profile edit through the API).
  const updateCurrentUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
  }, []);

  const hasPermission = useCallback(
    (resource: string, action: string) => {
      if (!currentUser) return false;
      return currentUser.roles.some(role =>
        role.permissions.some(
          permission => permission.resource === resource && permission.action === action
        )
      );
    },
    [currentUser]
  );

  const isAdmin = useMemo(() => {
    return currentUser?.roles.some(role => role.id === 'admin') ?? false;
  }, [currentUser]);

  const canAccessAdminSettings = useMemo(() => hasPermission('system', 'admin'), [hasPermission]);
  const canManageUsers = useMemo(() => hasPermission('users', 'admin'), [hasPermission]);
  const canViewMetrics = useMemo(() => hasPermission('metrics', 'read'), [hasPermission]);
  const canCreateEnvironments = useMemo(
    () => hasPermission('environments', 'write'),
    [hasPermission]
  );
  const canDeleteEnvironments = useMemo(
    () => hasPermission('environments', 'delete'),
    [hasPermission]
  );
  const canViewAuditLog = useMemo(() => hasPermission('audit', 'read'), [hasPermission]);

  return {
    currentUser,
    isLoading,
    mustChangePassword: currentUser?.mustChangePassword ?? false,
    login,
    logout,
    changePassword,
    updateCurrentUser,
    hasPermission,
    isAdmin,
    canAccessAdminSettings,
    canManageUsers,
    canViewMetrics,
    canCreateEnvironments,
    canDeleteEnvironments,
    canViewAuditLog,
    isAuthenticated: !!currentUser,
  };
}
