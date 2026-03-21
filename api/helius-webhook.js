import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

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
      const tokenTransfers = evt?.tokenTransfers || evt?.nativeTransfers || [];

      if (!signature) continue;

      // Prefer matching by reference/memo.
      let intent = null;
      if (memo) {
        const { data } = await admin
          .from('crypto_payment_intents')
          .select('id,twin_id,seller_id,buyer_id,token,amount,platform_fee_pct,service_fee,seller_address,reference,status')
          .eq('reference', memo)
          .maybeSingle();
        intent = data;
      }

      // Fallback: match by pending intent + seller address + amount (best-effort).
      if (!intent) {
        // enhanced webhooks typically include tokenTransfers entries with tokenAmount, mint, toUserAccount
        // We'll only use this if we can confidently derive amount+destination.
        const first = Array.isArray(tokenTransfers) ? tokenTransfers[0] : null;
        const to = first?.toUserAccount || first?.destination || first?.toAccount;
        const amount = Number(first?.tokenAmount ?? first?.amount ?? 0);
        if (to && amount > 0) {
          const { data } = await admin
            .from('crypto_payment_intents')
            .select('id,twin_id,seller_id,buyer_id,token,amount,platform_fee_pct,service_fee,seller_address,reference,status')
            .eq('seller_address', to)
            .eq('status', 'pending')
            .limit(1);
          intent = Array.isArray(data) ? data[0] : null;
        }
      }

      if (!intent) continue;
      if (intent.status !== 'pending') continue;

      // Mark completed (idempotent via unique signature)
      const { error: updErr } = await admin
        .from('crypto_payment_intents')
        .update({ status: 'completed', solana_signature: signature, completed_at: new Date().toISOString() })
        .eq('id', intent.id)
        .eq('status', 'pending');

      if (updErr) continue;

      // Complete sale: create transaction + transfer ownership
      const price = Number(intent.amount);
      const serviceFee = Number(intent.service_fee ?? 0) || Math.round(price * Number(intent.platform_fee_pct ?? 0.05) * 100) / 100;

      await admin.from('transactions').insert({
        twin_id: intent.twin_id,
        seller_id: intent.seller_id,
        buyer_id: intent.buyer_id,
        price,
        service_fee: serviceFee,
        status: 'completed'
      });

      await admin
        .from('digital_twins')
        .update({ current_owner_id: intent.buyer_id, is_for_sale: false, asking_price: null })
        .eq('id', intent.twin_id);
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Webhook failed' });
  }
}
