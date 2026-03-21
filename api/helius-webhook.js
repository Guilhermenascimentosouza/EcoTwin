import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT_MAINNET = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

function getFirstMemo(tx) {
  const meta = tx?.meta || tx?.transaction?.message || tx;
  const memo = tx?.memo || meta?.memo;
  if (typeof memo === 'string' && memo.trim()) return memo.trim();
  const instructions = tx?.instructions || tx?.transaction?.message?.instructions || [];
  for (const ix of instructions) {
    const maybeMemo = ix?.parsed?.info?.memo || ix?.memo;
    if (typeof maybeMemo === 'string' && maybeMemo.trim()) return maybeMemo.trim();
  }
  return null;
}

function getTokenTransfers(evt) {
  if (Array.isArray(evt?.tokenTransfers)) return evt.tokenTransfers;
  if (Array.isArray(evt?.nativeTransfers)) return evt.nativeTransfers;
  return [];
}

function getExpectedMint(token) {
  if (token === 'usdc') return USDC_MINT_MAINNET;
  if (token === 'usdt') return USDT_MINT_MAINNET;
  return null;
}

function getMintFromTransfers(transfers) {
  for (const t of transfers || []) {
    const mint = t?.mint || t?.tokenMint || t?.tokenAddress;
    if (typeof mint === 'string' && mint.trim()) return mint.trim();
  }
  return null;
}

async function fetchEnhancedTransactionMintBySignature(signature) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) return null;

  const url = `https://api-mainnet.helius-rpc.com/v0/transactions?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: [signature] })
  });

  if (!res.ok) return null;
  const parsed = await res.json().catch(() => null);
  const tx = Array.isArray(parsed) ? parsed[0] : null;
  const transfers = Array.isArray(tx?.tokenTransfers) ? tx.tokenTransfers : [];
  return getMintFromTransfers(transfers);
}

function hasSufficientPayout({ intent, transfers, expectedMint }) {
  const expectedTo = String(intent?.seller_address || '').trim();
  const expectedAmount = Number(intent?.amount || 0);
  if (!expectedTo || expectedAmount <= 0) return false;

  for (const t of transfers) {
    const to = String(t?.toUserAccount || t?.destination || t?.toAccount || '').trim();
    const amount = Number(t?.tokenAmount ?? t?.amount ?? 0);
    const mint = String(t?.mint || t?.tokenMint || t?.tokenAddress || '').trim();
    if (!to) continue;
    if (to !== expectedTo) continue;
    if (expectedMint && mint && mint !== expectedMint) continue;
    if (!Number.isFinite(amount)) continue;
    if (amount + 1e-9 >= expectedAmount) return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const expectedAuth = process.env.HELIUS_WEBHOOK_AUTH;
  if (expectedAuth) {
    const got = req.headers['authorization'] || req.headers['Authorization'];
    if (!got || got !== expectedAuth) return json(res, 401, { error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY' });

  const admin = createClient(supabaseUrl, serviceRole);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '[]') : (req.body || []);
  const events = Array.isArray(body) ? body : [body];

  try {
    for (const evt of events) {
      const signature = evt?.signature || evt?.transactionSignature;
      const memo = getFirstMemo(evt);
      const tokenTransfers = getTokenTransfers(evt);

      if (!signature) continue;

      // For safety we only match by reference/memo.
      // The buyer must include the memo/reference when sending the token transfer.
      if (!memo) continue;

      const { data: intent } = await admin
        .from('crypto_payment_intents')
        .select('id,twin_id,seller_id,buyer_id,token,amount,platform_fee_pct,service_fee,seller_address,reference,status')
        .eq('reference', memo)
        .maybeSingle();

      if (!intent) continue;
      if (intent.status !== 'pending') continue;

      const expectedMint = getExpectedMint(intent.token);
      let gotMint = getMintFromTransfers(tokenTransfers);
      if (!gotMint) gotMint = await fetchEnhancedTransactionMintBySignature(signature);
      if (expectedMint && gotMint && gotMint !== expectedMint) continue;
      if (expectedMint && !gotMint) continue;

      if (!hasSufficientPayout({ intent, transfers: tokenTransfers, expectedMint })) continue;

      const price = Number(intent.amount);
      const serviceFee = Number(intent.service_fee ?? 0) || Math.round(price * Number(intent.platform_fee_pct ?? 0.05) * 100) / 100;

      // Idempotency: store solana signature in transactions.stripe_payment_intent_id (unique index already exists).
      await admin.from('transactions').upsert(
        {
          twin_id: intent.twin_id,
          seller_id: intent.seller_id,
          buyer_id: intent.buyer_id,
          price,
          service_fee: serviceFee,
          stripe_payment_intent_id: signature,
          status: 'completed'
        },
        { onConflict: 'stripe_payment_intent_id' }
      );

      // Transfer ownership only if the item is still for sale and owned by the seller.
      await admin
        .from('digital_twins')
        .update({ current_owner_id: intent.buyer_id, is_for_sale: false, asking_price: null })
        .eq('id', intent.twin_id)
        .eq('current_owner_id', intent.seller_id)
        .eq('is_for_sale', true);

      await admin
        .from('crypto_payment_intents')
        .update({ status: 'completed', solana_signature: signature, completed_at: new Date().toISOString() })
        .eq('id', intent.id)
        .eq('status', 'pending');
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Webhook failed' });
  }
}
