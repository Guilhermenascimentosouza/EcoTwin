import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.STRIPE_SECRET_KEY) {
    res.statusCode = 500;
    return res.end('Missing STRIPE_SECRET_KEY');
  }
  if (!webhookSecret) {
    res.statusCode = 500;
    return res.end('Missing STRIPE_WEBHOOK_SECRET');
  }
  if (!supabaseUrl || !serviceRole) {
    res.statusCode = 500;
    return res.end('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.statusCode = 400;
    return res.end('Missing stripe-signature');
  }

  const payload = await rawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    res.statusCode = 400;
    return res.end(`Webhook Error: ${err.message}`);
  }

  const admin = createClient(supabaseUrl, serviceRole);

  const setTier = async (userId, tier, stripeData = {}) => {
    if (!userId) return;

    const payload = {
      subscription_tier: tier,
      ...stripeData
    };

    await admin.from('profiles').update(payload).eq('id', userId);
  };

  const findUserIdByStripe = async ({ customerId, subscriptionId }) => {
    if (subscriptionId) {
      const { data } = await admin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    if (customerId) {
      const { data } = await admin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    return null;
  };

  const tierFromSubscription = (sub) => {
    // Stripe: status can be active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused
    const active = sub?.status === 'active' || sub?.status === 'trialing';
    return active ? 'elite' : 'free';
  };

  const completeMarketSale = async ({ twinId, buyerId, sellerId, amountCents, feeCents, checkoutSessionId, paymentIntentId }) => {
    if (!twinId || !buyerId || !sellerId) return;

    const { data: twin, error: twinError } = await admin
      .from('digital_twins')
      .select('id,current_owner_id,is_for_sale,asking_price')
      .eq('id', twinId)
      .maybeSingle();

    if (twinError) throw new Error(twinError.message);
    if (!twin) throw new Error('Twin not found');
    if (twin.current_owner_id !== sellerId) throw new Error('Seller is not current owner');
    if (!twin.is_for_sale) throw new Error('Twin is not for sale');

    const price = amountCents ? Number(amountCents) / 100 : Number(twin.asking_price ?? 0);
    const serviceFee = feeCents ? Number(feeCents) / 100 : Math.round(price * 0.05 * 100) / 100;

    const insertPayload = {
      twin_id: twinId,
      seller_id: sellerId,
      buyer_id: buyerId,
      price,
      service_fee: serviceFee,
      status: 'completed',
      stripe_checkout_session_id: checkoutSessionId ?? null,
      stripe_payment_intent_id: paymentIntentId ?? null
    };

    const { error: txError } = await admin
      .from('transactions')
      .upsert(insertPayload, {
        onConflict: paymentIntentId ? 'stripe_payment_intent_id' : 'stripe_checkout_session_id'
      });

    if (txError) throw new Error(txError.message);

    const { error: updateError } = await admin
      .from('digital_twins')
      .update({
        current_owner_id: buyerId,
        is_for_sale: false,
        asking_price: null
      })
      .eq('id', twinId);

    if (updateError) throw new Error(updateError.message);
  };

  // Events
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Marketplace payment checkout
      if (session.mode === 'payment' && session.metadata?.twin_id) {
        await completeMarketSale({
          twinId: session.metadata.twin_id,
          buyerId: session.metadata.buyer_id,
          sellerId: session.metadata.seller_id,
          amountCents: session.metadata.amount_cents,
          feeCents: session.metadata.fee_cents,
          checkoutSessionId: session.id,
          paymentIntentId: session.payment_intent
        });
      }

      // Elite subscription checkout
      if (session.mode === 'subscription') {
        const userId = session.client_reference_id;

        // Pull subscription + customer ids to enable future downgrade automation.
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        await setTier(userId, 'elite', {
          stripe_customer_id: stripeCustomerId ?? null,
          stripe_subscription_id: stripeSubscriptionId ?? null
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      const userId = await findUserIdByStripe({ customerId, subscriptionId });
      const tier = tierFromSubscription(subscription);

      if (userId) {
        await setTier(userId, tier, {
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null
        });
      }
    }

    res.statusCode = 200;
    return res.end('ok');
  } catch (e) {
    res.statusCode = 500;
    return res.end(`Webhook handler failed: ${e.message}`);
  }
}
