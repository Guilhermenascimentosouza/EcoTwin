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

function makeKey() {
  return `et_b2b_${crypto.randomBytes(32).toString('hex')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pepper = process.env.B2B_API_KEY_PEPPER;
  const adminSecret = process.env.B2B_ADMIN_SECRET;

  if (!supabaseUrl || !serviceRole) return json(res, 500, { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY' });
  if (!pepper) return json(res, 500, { error: 'Missing B2B_API_KEY_PEPPER' });
  if (!adminSecret) return json(res, 500, { error: 'Missing B2B_ADMIN_SECRET' });

  const provided = String(req.headers['x-admin-secret'] || '').trim();
  if (!provided) return json(res, 401, { error: 'Missing X-Admin-Secret' });
  if (provided !== adminSecret) return json(res, 403, { error: 'Invalid admin secret' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const brandId = body.brandId != null ? String(body.brandId).trim() : null;
  const name = body.name != null ? String(body.name).trim() : 'Default';
  const scopes = Array.isArray(body.scopes) ? body.scopes : ['dpp:issue'];

  if (!brandId) return json(res, 400, { error: 'Missing brandId' });

  const admin = createClient(supabaseUrl, serviceRole);

  const { data: brand, error: brandError } = await admin
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .maybeSingle();

  if (brandError) return json(res, 500, { error: brandError.message });
  if (!brand?.id) return json(res, 404, { error: 'Brand not found' });

  const apiKey = makeKey();
  const keyPrefix = apiKey.slice(0, 8);
  const keyHash = sha256Hex(`${apiKey}.${pepper}`);

  const { data: row, error: insertError } = await admin
    .from('b2b_api_keys')
    .insert({
      brand_id: brandId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes,
      active: true
    })
    .select('id,brand_id,name,key_prefix,active,scopes,created_at')
    .single();

  if (insertError) return json(res, 500, { error: insertError.message });

  await admin.from('b2b_audit_logs').insert({
    brand_id: brandId,
    api_key_id: row.id,
    action: 'b2b.api_key.created',
    request_id: String(req.headers['x-request-id'] || '').trim() || null,
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    user_agent: String(req.headers['user-agent'] || '') || null,
    data: { key_prefix: keyPrefix, scopes, name }
  });

  return json(res, 200, {
    ok: true,
    apiKey,
    apiKeyId: row.id,
    keyPrefix,
    brandId,
    scopes
  });
}
