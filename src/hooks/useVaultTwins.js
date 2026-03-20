import { useQuery } from '@tanstack/react-query';
import { fetchVaultTwins } from '../api/vault';

export function useVaultTwins({ userId }) {
  return useQuery({
    queryKey: ['vault', 'twins', userId],
    queryFn: () => fetchVaultTwins({ userId }),
    enabled: Boolean(userId)
  });
}
