import { useQuery } from '@tanstack/react-query';
import { fetchMyProfile } from '../api/profile';

export function useProfile({ userId }) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchMyProfile({ userId }),
    enabled: Boolean(userId)
  });
}
