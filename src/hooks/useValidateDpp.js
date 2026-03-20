import { useMutation } from '@tanstack/react-query';
import { validateDpp } from '../api/scanner';

export function useValidateDpp() {
  return useMutation({
    mutationFn: validateDpp
  });
}
