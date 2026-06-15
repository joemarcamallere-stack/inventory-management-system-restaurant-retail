type RequestOptions = Omit<RequestInit, 'credentials'>;

type PagedResponse<T> = { data: T[]; total: number; page: number; limit: number; totalPages: number };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include', // sends the HttpOnly cookie automatically
    headers: {
      'Content-Type': 'application/json',
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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  businessId: string;
  modules: string[];
  lastLogin: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export function storeToken(_token: string) {
  // Auth is handled by the HttpOnly cookie set by the backend.
}

export function clearStoredToken() {
  // Auth is handled by the HttpOnly cookie set by the backend.
}

export function loginUser(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutUser() {
  return request<{ message: string }>('/api/auth/logout', { method: 'POST' });
}

export function getInventory(params?: { search?: string; itemType?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.itemType) query.set('itemType', params.itemType);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/inventory${suffix}`).then((r) => r.data);
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
  return request<PagedResponse<any>>(`/api/stock-movements${suffix}`).then((r) => r.data);
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
  return request<PagedResponse<any>>(`/api/recipes${suffix}`).then((r) => r.data);
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

export type KitchenOrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'VOIDED';

export function getKitchenOrders(params?: { status?: KitchenOrderStatus }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/kitchen-orders${suffix}`).then((r) => r.data);
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

export function updateKitchenOrderStatus(id: string, status: KitchenOrderStatus) {
  return request<any>(`/api/kitchen-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getLocations() {
  return request<PagedResponse<any>>('/api/locations').then((r) => r.data);
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
  return request<PagedResponse<any>>('/api/users').then((r) => r.data);
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

export function getCategories(module?: string) {
  const query = new URLSearchParams();
  if (module) query.set('module', module);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/api/categories${suffix}`);
}

export function createCategory(data: unknown) {
  return request<any>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export type RestaurantSettingKey =
  | 'CATEGORY_HIERARCHY'
  | 'STORAGE_TEMPERATURE_OPTIONS';

export function getRestaurantSettings() {
  return request<Array<{ key: RestaurantSettingKey; value: unknown }>>('/api/restaurant-settings');
}

export function upsertRestaurantSetting(key: RestaurantSettingKey, value: unknown) {
  return request<any>(`/api/restaurant-settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export function getSuppliers(params?: { isActive?: boolean }) {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/suppliers${suffix}`).then((r) => r.data);
}

export function createSupplier(data: unknown) {
  return request<any>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSupplier(id: string, data: unknown) {
  return request<any>(`/api/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteSupplier(id: string) {
  return request<any>(`/api/suppliers/${id}`, { method: 'DELETE' });
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

export function getPurchaseOrders(params?: { status?: string; supplierId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.supplierId) query.set('supplierId', params.supplierId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/purchase-orders${suffix}`).then((r) => r.data);
}

export function getPurchaseOrder(id: string) {
  return request<any>(`/api/purchase-orders/${id}`);
}

export function getGoodsReceipts(params?: { purchaseOrderId?: string }) {
  const query = new URLSearchParams();
  if (params?.purchaseOrderId) query.set('purchaseOrderId', params.purchaseOrderId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/purchase-orders/goods-receipts${suffix}`).then((r) => r.data);
}

export function createPurchaseOrder(data: unknown) {
  return request<any>('/api/purchase-orders', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePurchaseOrder(id: string, data: unknown) {
  return request<any>(`/api/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function submitPurchaseOrder(id: string) {
  return request<any>(`/api/purchase-orders/${id}/submit`, { method: 'PATCH' });
}

export function approvePurchaseOrder(id: string) {
  return request<any>(`/api/purchase-orders/${id}/approve`, { method: 'PATCH' });
}

export function rejectPurchaseOrder(id: string, reason: string) {
  return request<any>(`/api/purchase-orders/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function receivePurchaseOrder(
  id: string,
  items: {
    id: string;
    receivedQty: number;
    rejectedQty: number;
    condition?: string;
    notes?: string;
    expiryDate?: string;
    storageTemperature?: string;
  }[],
  notes?: string,
) {
  return request<any>(`/api/purchase-orders/${id}/receive`, {
    method: 'PATCH',
    body: JSON.stringify({ items, notes }),
  });
}

export function cancelPurchaseOrder(id: string) {
  return request<any>(`/api/purchase-orders/${id}/cancel`, { method: 'PATCH' });
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export function getTransfers(params?: { status?: string; fromLocationId?: string; toLocationId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.fromLocationId) query.set('fromLocationId', params.fromLocationId);
  if (params?.toLocationId) query.set('toLocationId', params.toLocationId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/transfers${suffix}`).then((r) => r.data);
}

export function getTransfer(id: string) {
  return request<any>(`/api/transfers/${id}`);
}

export function createTransfer(data: unknown) {
  return request<any>('/api/transfers', { method: 'POST', body: JSON.stringify(data) });
}

export function dispatchTransfer(id: string) {
  return request<any>(`/api/transfers/${id}/dispatch`, { method: 'PATCH' });
}

export function completeTransfer(id: string) {
  return request<any>(`/api/transfers/${id}/complete`, { method: 'PATCH' });
}

export function cancelTransfer(id: string) {
  return request<any>(`/api/transfers/${id}/cancel`, { method: 'PATCH' });
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export function getSales(params?: { locationId?: string; status?: string; dateFrom?: string; dateTo?: string }) {
  const query = new URLSearchParams();
  if (params?.locationId) query.set('locationId', params.locationId);
  if (params?.status) query.set('status', params.status);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/sales${suffix}`).then((r) => r.data);
}

export function getSale(id: string) {
  return request<any>(`/api/sales/${id}`);
}

export function createSale(data: unknown) {
  return request<any>('/api/sales', { method: 'POST', body: JSON.stringify(data) });
}

export function refundSale(id: string, refundReason: string) {
  return request<any>(`/api/sales/${id}/refund`, { method: 'PATCH', body: JSON.stringify({ refundReason }) });
}

// ─── Bundles ─────────────────────────────────────────────────────────────────

export function getBundles(params?: { status?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PagedResponse<any>>(`/api/bundles${suffix}`).then((r) => r.data);
}

export function getBundle(id: string) {
  return request<any>(`/api/bundles/${id}`);
}

export function createBundle(data: unknown) {
  return request<any>('/api/bundles', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBundle(id: string, data: unknown) {
  return request<any>(`/api/bundles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function approveBundle(id: string) {
  return request<any>(`/api/bundles/${id}/approve`, { method: 'PATCH' });
}

export function rejectBundle(id: string, rejectionReason: string) {
  return request<any>(`/api/bundles/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason }) });
}

export function activateBundle(id: string) {
  return request<any>(`/api/bundles/${id}/activate`, { method: 'PATCH' });
}

export function deactivateBundle(id: string) {
  return request<any>(`/api/bundles/${id}/deactivate`, { method: 'PATCH' });
}

export function deleteBundle(id: string) {
  return request<any>(`/api/bundles/${id}`, { method: 'DELETE' });
}
