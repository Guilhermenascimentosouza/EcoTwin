import { useQuery } from '@tanstack/react-query';
import { fetchMarketPricesInternal } from '../api/prices';

export function useMarketPricesInternal({ productIds }) {
  const ids = Array.from(new Set((productIds ?? []).filter(Boolean))).sort();

  return useQuery({
    queryKey: ['market', 'prices-internal', ids.join(',')],
    queryFn: () => fetchMarketPricesInternal({ productIds: ids }),
    enabled: ids.length > 0
  });
}
