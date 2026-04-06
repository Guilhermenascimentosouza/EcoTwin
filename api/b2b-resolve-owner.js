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
      action: 'b2b.resolve_owner.denied',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { reason: 'invalid_api_key', key_prefix: keyPrefix }
    });
    return json(res, 401, { error: 'Invalid API key' });
  }

  const scopes = Array.isArray(apiKeyRow.scopes) ? apiKeyRow.scopes : [];
  if (!scopes.includes('user:resolve')) {
    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.resolve_owner.denied',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { reason: 'missing_scope', required: 'user:resolve', scopes }
    });
    return json(res, 403, { error: 'Missing scope: user:resolve' });
  }

  const ownerEmail = String(body.ownerEmail || body.email || '').trim().toLowerCase();
  if (!ownerEmail) return json(res, 400, { error: 'Missing ownerEmail' });

  try {
    const { data, error } = await admin.auth.admin.getUserByEmail(ownerEmail);
    if (error) throw new Error(error.message);

    const ownerId = data?.user?.id ?? null;
    if (!ownerId) {
      await admin.from('b2b_audit_logs').insert({
        brand_id: apiKeyRow.brand_id,
        api_key_id: apiKeyRow.id,
        action: 'b2b.resolve_owner.not_found',
        request_id: requestId,
        ip,
        user_agent: userAgent,
        data: { owner_email: ownerEmail }
      });
      return json(res, 404, { error: 'User not found' });
    }

    await admin.from('b2b_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyRow.id);

    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.resolve_owner.success',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { owner_email: ownerEmail, owner_id: ownerId }
    });

    return json(res, 200, { ok: true, ownerId });
  } catch (e) {
    await admin.from('b2b_audit_logs').insert({
      brand_id: apiKeyRow.brand_id,
      api_key_id: apiKeyRow.id,
      action: 'b2b.resolve_owner.error',
      request_id: requestId,
      ip,
      user_agent: userAgent,
      data: { owner_email: ownerEmail, message: e?.message ?? 'Unknown error' }
    });

    return json(res, 500, { error: e?.message ?? 'Failed to resolve owner' });
  }
}
