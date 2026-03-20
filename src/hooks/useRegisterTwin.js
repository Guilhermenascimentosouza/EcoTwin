import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerTwinByDppId } from '../api/twins';

export function useRegisterTwin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerTwinByDppId,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault'] });
      qc.invalidateQueries({ queryKey: ['market', 'listings'] });
    }
  });
}
