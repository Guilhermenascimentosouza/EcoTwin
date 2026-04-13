import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBids, fetchLiveAuctions, placeBid } from '../api/auctions';

export function useLiveAuctions() {
  return useQuery({
    queryKey: ['auctions', 'live'],
    queryFn: fetchLiveAuctions
  });
}

export function useBids({ auctionId }) {
  return useQuery({
    queryKey: ['auctions', 'bids', auctionId],
    queryFn: () => fetchBids({ auctionId }),
    enabled: Boolean(auctionId)
  });
}

export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: placeBid,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['auctions', 'live'] });
      qc.invalidateQueries({ queryKey: ['auctions', 'bids', vars.auctionId] });
    }
  });
}
