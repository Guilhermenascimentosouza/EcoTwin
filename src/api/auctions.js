import { supabase } from '../lib/supabaseClient';

export async function fetchLiveAuctions() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('auctions')
    .select(
      [
        'id',
        'twin_id',
        'seller_id',
        'status',
        'starts_at',
        'ends_at',
        'reserve_price',
        'min_increment',
        'current_price',
        'current_winner_id',
        'updated_at',
        'twin:digital_twins (',
        '  id,',
        '  condition,',
        '  carbon_saved_kg,',
        '  product:products (',
        '    id,',
        '    name,',
        '    category,',
        '    image_url,',
        '    dpp_id,',
        '    brand:brands ( name )',
        '  )',
        ')'
      ].join('\n')
    )
    .eq('status', 'live')
    .order('ends_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBids({ auctionId }) {
  if (!auctionId) return [];
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('bids')
    .select('id,auction_id,bidder_id,amount,created_at')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function placeBid({ auctionId, amount }) {
  if (!auctionId) throw new Error('Missing auctionId');
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_amount: Number(amount)
  });

  if (error) throw new Error(error.message);
  return data;
}
