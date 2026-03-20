import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMarketListings, setTwinForSale } from '../api/market';

export function useMarketListings() {
  return useQuery({
    queryKey: ['market', 'listings'],
    queryFn: fetchMarketListings
  });
}

export function useSetTwinForSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setTwinForSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'listings'] });
      qc.invalidateQueries({ queryKey: ['vault'] });
    }
  });
}
