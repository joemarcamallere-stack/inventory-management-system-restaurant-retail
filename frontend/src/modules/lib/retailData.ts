import { useMutation, useQueryClient } from '@tanstack/react-query';

export const retailQueryKeys = {
  inventory: ['retail', 'inventory'] as const,
  locations: ['retail', 'locations'] as const,
  users: ['retail', 'users'] as const,
  purchaseOrders: ['retail', 'purchase-orders'] as const,
  goodsReceipts: ['retail', 'goods-receipts'] as const,
  suppliers: ['retail', 'suppliers'] as const,
  transfers: ['retail', 'transfers'] as const,
  stockMovements: ['retail', 'stock-movements'] as const,
  sales: ['retail', 'sales'] as const,
  bundles: ['retail', 'bundles'] as const,
};

type RetailQueryKey = (typeof retailQueryKeys)[keyof typeof retailQueryKeys];

export function useRetailMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: RetailQueryKey[],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
