import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCurrentSession,
  loginUser,
  logoutUser,
  type AuthUser,
} from '../api/client';

function persistUserSummary(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    return;
  }
  localStorage.setItem('userRole', user.role.toLowerCase());
  localStorage.setItem('userEmail', user.email);
}

export function useSession() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentSession()
      .then(({ user }) => {
        if (!active) return;
        setCurrentUser(user);
        persistUserSummary(user);
      })
      .catch(() => {
        if (!active) return;
        setCurrentUser(null);
        persistUserSummary(null);
      })
      .finally(() => {
        if (active) setIsRestoringSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      setCurrentUser(response.user);
      persistUserSummary(response.user);
      toast.success('Signed in successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      queryClient.clear();
      setCurrentUser(null);
      persistUserSummary(null);
    }
  };

  return {
    currentUser,
    isLoggedIn: Boolean(currentUser),
    isRestoringSession,
    login,
    logout,
  };
}
