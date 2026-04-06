import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pepper = process.env.B2B_API_KEY_PEPPER;

  if (!supabaseUrl || !serviceRole) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY' });
  if (!pepper) return json(res, 500, { error: 'Missing B2B_API_KEY_PEPPER' });

  const apiKey = String(req.headers['x-api-key'] || '').trim();
  if (!apiKey) return json(res, 401, { error: 'Missing X-API-Key' });

  const keyPrefix = apiKey.slice(0, 8);
  const keyHash = sha256Hex(`${apiKey}.${pepper}`);

  const admin = createClient(supabaseUrl, serviceRole);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const requestId = String(req.headers['x-request-id'] || body.requestId || '').trim() || null;
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  const userAgent = String(req.headers['user-agent'] || '') || null;

  const { data: apiKeyRow, error: apiKeyError } = await admin
    .from('b2b_api_keys')
    .select('id,brand_id,active,scopes')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (apiKeyError) return json(res, 500, { error: apiKeyError.message });
  if (!apiKeyRow || !apiKeyRow.active) {
    await admin.from('b2b_audit_logs').insert({
      brand_id: null,
      api_key_id: null,
      action: 'b2b.issue_dpp.denied',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { reason: 'invalid_api_key', key_prefix: keyPrefix }
    });
    return json(res, 401, { error: 'Invalid API key' });
  }

  const scopes = Array.isArray(apiKeyRow.scopes) ? apiKeyRow.scopes : [];
  if (!scopes.includes('dpp:issue')) {
    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.issue_dpp.denied',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { reason: 'missing_scope', required: 'dpp:issue', scopes }
    });
    return json(res, 403, { error: 'Missing scope: dpp:issue' });
  }

  const dppId = String(body.dppId || body.dpp_id || '').trim();
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const imageUrl = body.imageUrl != null ? String(body.imageUrl).trim() : null;
  const specs = body.specs ?? null;
  const blockchainHash = body.blockchainHash != null ? String(body.blockchainHash).trim() : null;
  const ownerId = body.ownerId != null ? String(body.ownerId).trim() : null;
  const condition = body.condition != null ? String(body.condition).trim() : 'Novo';

  if (!dppId) return json(res, 400, { error: 'Missing dppId' });
  if (!name) return json(res, 400, { error: 'Missing name' });
  if (!category) return json(res, 400, { error: 'Missing category' });
  if (!ownerId) return json(res, 400, { error: 'Missing ownerId' });

  try {
    const nowIso = new Date().toISOString();

    const { data: product, error: productError } = await admin
      .from('products')
      .upsert(
        {
          brand_id: apiKeyRow.brand_id,
          dpp_id: dppId,
          name,
          category,
          image_url: imageUrl,
          specs
        },
        { onConflict: 'dpp_id' }
      )
      .select('id,brand_id,dpp_id')
      .single();

    if (productError) throw new Error(productError.message);
    if (!product?.id) throw new Error('Failed to upsert product');

    if (product.brand_id !== apiKeyRow.brand_id) {
      await admin.from('b2b_audit_logs').insert({
        brand_id: apiKeyRow.brand_id,
        api_key_id: apiKeyRow.id,
        action: 'b2b.issue_dpp.denied',
        request_id: requestId,
        ip,
        user_agent: userAgent,
        data: { reason: 'dpp_id_already_owned_by_other_brand', dpp_id: dppId, product_brand_id: product.brand_id }
      });
      return json(res, 409, { error: 'DPP already exists for a different brand' });
    }

    const { data: twin, error: twinError } = await admin
      .from('digital_twins')
      .insert({
        product_id: product.id,
        current_owner_id: ownerId,
        blockchain_hash: blockchainHash,
        carbon_saved_kg: 0,
        condition,
        history: [],
        is_for_sale: false,
        asking_price: null,
        updated_at: nowIso
      })
      .select('id,product_id')
      .single();

    if (twinError) throw new Error(twinError.message);

    await admin.from('b2b_api_keys').update({ last_used_at: nowIso }).eq('id', apiKeyRow.id);

    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.issue_dpp.success',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: {
        dpp_id: dppId,
        product_id: product.id,
        twin_id: twin.id,
        owner_id: ownerId
      }
    });

    return json(res, 200, {
      ok: true,
      productId: product.id,
      twinId: twin.id,
      dppId
    });
  } catch (e) {
    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.issue_dpp.error',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { message: e?.message ?? 'Unknown error' }
    });

    return json(res, 500, { error: e?.message ?? 'Failed to issue DPP' });
  }
}
