import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMarketListings, setTwinForSale, transferOwnership, createMarketCheckoutSession } from '../api/market';

export function useMarketListings() {
  return useQuery({
    queryKey: ['market', 'listings'],
    queryFn: fetchMarketListings
  });
}

export function useMarketCheckout() {
  return useMutation({
    mutationFn: createMarketCheckoutSession
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

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transferOwnership,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'listings'] });
      qc.invalidateQueries({ queryKey: ['vault'] });
    }
  });
}
