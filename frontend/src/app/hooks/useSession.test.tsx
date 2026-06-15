import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from './useSession';
import {
  getCurrentSession,
  loginUser,
  logoutUser,
} from '../api/client';

vi.mock('../api/client', () => ({
  getCurrentSession: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const user = {
  id: 'user-1',
  name: 'Retail Admin',
  email: 'admin@example.com',
  role: 'Admin',
  status: 'Active',
  businessId: 'business-1',
  modules: ['RETAIL'],
  lastLogin: new Date().toISOString(),
};

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('restores an authenticated cookie session', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ user });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isRestoringSession).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.currentUser).toEqual(user);
    expect(localStorage.getItem('userRole')).toBe('admin');
  });

  it('clears local session state when restoration is unauthorized', async () => {
    vi.mocked(getCurrentSession).mockRejectedValue(new Error('Unauthorized'));
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isRestoringSession).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });
});
