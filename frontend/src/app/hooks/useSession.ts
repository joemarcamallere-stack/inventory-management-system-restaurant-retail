import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCurrentSession,
  loginUser,
  logoutUser,
  type AuthUser,
} from '../api/client';

type SessionContextValue = {
  currentUser: AuthUser | null;
  isLoggedIn: boolean;
  isRestoringSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const applyUser = (user: AuthUser) => {
    setCurrentUser(user);
    window.localStorage.setItem('userRole', user.role.toLowerCase());
    window.localStorage.setItem('userEmail', user.email);
  };

  const clearUser = () => {
    setCurrentUser(null);
    window.localStorage.removeItem('userRole');
    window.localStorage.removeItem('userEmail');
  };

  useEffect(() => {
    let active = true;
    getCurrentSession()
      .then(({ user }) => {
        if (!active) return;
        applyUser(user);
      })
      .catch(() => {
        if (!active) return;
        clearUser();
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
      applyUser(response.user);
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
      clearUser();
    }
  };

  const value = {
    currentUser,
    isLoggedIn: Boolean(currentUser),
    isRestoringSession,
    login,
    logout,
  };

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return session;
}
