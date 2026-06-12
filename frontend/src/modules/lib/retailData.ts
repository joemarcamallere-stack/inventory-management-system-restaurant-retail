import { domainQueryKeys, useDomainMutation } from './domainQueries';

export const retailQueryKeys = {
  ...domainQueryKeys,
};

type RetailQueryKey = (typeof retailQueryKeys)[keyof typeof retailQueryKeys];

export function useRetailMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: RetailQueryKey[],
) {
  return useDomainMutation(mutationFn, invalidateKeys);
}
