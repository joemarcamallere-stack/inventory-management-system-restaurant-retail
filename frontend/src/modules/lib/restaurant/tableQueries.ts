import {
  createDiningTable,
  deleteDiningTable,
  updateDiningTable,
  updateDiningTableStatus,
} from '../../../app/api/client';
import type {
  ApiDiningTable,
  DiningTableStatus,
} from '../../../app/api/domainTypes';
import { useDiningTablesQuery } from '../domainQueries';
import { restaurantQueryKeys, useRestaurantMutation } from './shared';

export function useRestaurantDiningTablesQuery<TData = ApiDiningTable[]>(
  params?: {
    locationId?: string;
    status?: DiningTableStatus;
    page?: number;
    limit?: number;
  },
  select?: (items: ApiDiningTable[]) => TData,
) {
  return useDiningTablesQuery(params, { select });
}

export function useUpdateRestaurantDiningTableStatusMutation() {
  return useRestaurantMutation(
    ({ id, status }: { id: string; status: DiningTableStatus }) =>
      updateDiningTableStatus(id, status),
    [restaurantQueryKeys.diningTables],
  );
}

export function useCreateRestaurantDiningTableMutation() {
  return useRestaurantMutation(
    (data: {
      tableNumber: string;
      capacity: number;
      locationId: string;
      floor?: string;
      notes?: string;
    }) => createDiningTable(data),
    [restaurantQueryKeys.diningTables],
  );
}

export function useUpdateRestaurantDiningTableMutation() {
  return useRestaurantMutation(
    ({ id, data }: {
      id: string;
      data: {
        tableNumber?: string;
        capacity?: number;
        locationId?: string;
        floor?: string;
        notes?: string;
      };
    }) => updateDiningTable(id, data),
    [restaurantQueryKeys.diningTables],
  );
}

export function useDeleteRestaurantDiningTableMutation() {
  return useRestaurantMutation(
    (id: string) => deleteDiningTable(id),
    [restaurantQueryKeys.diningTables],
  );
}
