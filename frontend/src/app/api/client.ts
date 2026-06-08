const TOKEN_KEY = 'inventory_access_token';

type RequestOptions = RequestInit & {
  token?: string | null;
};

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getStoredToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    businessId: string;
    modules: string[];
    lastLogin: string;
  };
};

export function loginUser(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export function getInventory(params?: { search?: string; itemType?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.itemType) query.set('itemType', params.itemType);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/api/inventory${suffix}`);
}

export function createInventoryItem(data: unknown) {
  return request<any>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateInventoryItem(id: string, data: unknown) {
  return request<any>(`/api/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteInventoryItem(id: string) {
  return request<any>(`/api/inventory/${id}`, {
    method: 'DELETE',
  });
}

export function getStockMovements(params?: {
  itemId?: string;
  locationId?: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.itemId) query.set('itemId', params.itemId);
  if (params?.locationId) query.set('locationId', params.locationId);
  if (params?.type) query.set('type', params.type);
  if (params?.referenceType) query.set('referenceType', params.referenceType);
  if (params?.referenceId) query.set('referenceId', params.referenceId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/api/stock-movements${suffix}`);
}

export function createStockMovement(data: unknown) {
  return request<any>('/api/stock-movements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getRecipes(params?: { active?: boolean }) {
  const query = new URLSearchParams();
  if (params?.active !== undefined) query.set('active', String(params.active));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/api/recipes${suffix}`);
}

export function createRecipe(data: unknown) {
  return request<any>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRecipe(id: string, data: unknown) {
  return request<any>(`/api/recipes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRecipe(id: string) {
  return request<any>(`/api/recipes/${id}`, {
    method: 'DELETE',
  });
}

export function getKitchenOrders(params?: { status?: 'COMPLETED' | 'VOIDED' }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/api/kitchen-orders${suffix}`);
}

export function completeKitchenOrder(data: unknown) {
  return request<any>('/api/kitchen-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function voidKitchenOrder(id: string, voidReason: string) {
  return request<any>(`/api/kitchen-orders/${id}/void`, {
    method: 'PATCH',
    body: JSON.stringify({ voidReason }),
  });
}

export function getLocations() {
  return request<any[]>('/api/locations');
}

export function createLocation(data: unknown) {
  return request<any>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLocation(id: string, data: unknown) {
  return request<any>(`/api/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteLocation(id: string) {
  return request<any>(`/api/locations/${id}`, {
    method: 'DELETE',
  });
}

export function getUsers() {
  return request<any[]>('/api/users');
}

export function createUser(data: unknown) {
  return request<any>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: unknown) {
  return request<any>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string) {
  return request<any>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}
