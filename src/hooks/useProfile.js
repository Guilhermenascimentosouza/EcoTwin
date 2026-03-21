import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyProfile, updateMyProfile } from '../api/profile';

export function useProfile({ userId }) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchMyProfile({ userId }),
    enabled: Boolean(userId)
  });
}

export function useUpdateProfile({ userId }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    }
  });
}
