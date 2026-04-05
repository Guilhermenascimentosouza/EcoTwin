-- ECOTWIN SUPABASE SCHEMA (PostgreSQL)
-- Execute este script no SQL Editor do seu dashboard Supabase.

-- Extensions (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabela de Marcas (B2B)
CREATE TABLE IF NOT EXISTS brands (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
slug TEXT UNIQUE NOT NULL,
logo_url TEXT,
api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
created_at TIMESTAMPTZ DEFAULT now()
);

-- Brands: enable RLS + avoid exposing api_key via API
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Allow read access to brands catalog
DROP POLICY IF EXISTS "Anyone can view brands" ON brands;
CREATE POLICY "Anyone can view brands"
ON brands FOR SELECT
USING (true);

-- Restrict column-level privileges so api_key is not readable via PostgREST
REVOKE ALL ON TABLE brands FROM anon, authenticated;
GRANT SELECT (id, name, slug, logo_url, created_at) ON TABLE brands TO anon, authenticated;

-- 2. Tabela de Produtos (O modelo físico)
CREATE TABLE IF NOT EXISTS products (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
name TEXT NOT NULL,
category TEXT NOT NULL,
image_url TEXT,
specs JSONB, -- Material, local de fabricação, etc.
dpp_id TEXT UNIQUE NOT NULL, -- Digital Product Passport ID (ex: DPP-882-X90)
created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Gêmeos Digitais (Os passaportes ativos)
CREATE TABLE IF NOT EXISTS digital_twins (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
product_id UUID REFERENCES products(id) ON DELETE CASCADE,
current_owner_id UUID REFERENCES auth.users(id),
blockchain_hash TEXT,
carbon_saved_kg DECIMAL(10,2) DEFAULT 0,
condition TEXT CHECK (condition IN ('Novo', 'Excelente', 'Bom', 'Usado')),
history JSONB DEFAULT '[]', -- Histórico de transferências e reparos
is_for_sale BOOLEAN DEFAULT false,
asking_price DECIMAL(10,2),
updated_at TIMESTAMPTZ DEFAULT now()
);

-- Market value (internal): derived from active marketplace listings
CREATE OR REPLACE VIEW market_prices_internal AS
SELECT
  p.id AS product_id,
  AVG(dt.asking_price) FILTER (WHERE dt.is_for_sale = true AND dt.asking_price IS NOT NULL AND dt.asking_price > 0) AS avg_price,
  COUNT(dt.id) FILTER (WHERE dt.is_for_sale = true AND dt.asking_price IS NOT NULL AND dt.asking_price > 0) AS listings_count,
  MAX(dt.updated_at) FILTER (WHERE dt.is_for_sale = true) AS last_updated
FROM products p
LEFT JOIN digital_twins dt ON dt.product_id = p.id
GROUP BY p.id;

-- Marketplace normalization: enforce asking_price when item is for sale
ALTER TABLE digital_twins DROP CONSTRAINT IF EXISTS digital_twins_asking_price_required_when_for_sale;
ALTER TABLE digital_twins
  ADD CONSTRAINT digital_twins_asking_price_required_when_for_sale
  CHECK (is_for_sale = false OR (asking_price IS NOT NULL AND asking_price > 0));

-- 4. Tabela de Transações (Log de Vendas)
CREATE TABLE IF NOT EXISTS transactions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
twin_id UUID REFERENCES digital_twins(id),
seller_id UUID REFERENCES auth.users(id),
buyer_id UUID REFERENCES auth.users(id),
price DECIMAL(10,2) NOT NULL,
service_fee DECIMAL(10,2) NOT NULL, -- A sua faturação (ex: 3%)
stripe_checkout_session_id TEXT,
stripe_payment_intent_id TEXT,
status TEXT DEFAULT 'completed',
created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 4b. Crypto payment intents (Solana USDC/USDT)
CREATE TABLE IF NOT EXISTS crypto_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES digital_twins(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id),
  buyer_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL CHECK (token IN ('usdc','usdt')),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee_pct DECIMAL(5,4) NOT NULL DEFAULT 0.05,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  seller_address TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired','failed')),
  solana_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE crypto_payment_intents ADD COLUMN IF NOT EXISTS platform_fee_pct DECIMAL(5,4) NOT NULL DEFAULT 0.05;
ALTER TABLE crypto_payment_intents ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE crypto_payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own crypto intents" ON crypto_payment_intents;
CREATE POLICY "Users can view their own crypto intents"
ON crypto_payment_intents FOR SELECT
USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Buyers can create crypto intents" ON crypto_payment_intents;
CREATE POLICY "Buyers can create crypto intents"
ON crypto_payment_intents FOR INSERT
WITH CHECK ((select auth.uid()) = buyer_id);

CREATE INDEX IF NOT EXISTS crypto_payment_intents_twin_id_idx ON crypto_payment_intents (twin_id);
CREATE INDEX IF NOT EXISTS crypto_payment_intents_seller_id_idx ON crypto_payment_intents (seller_id);
CREATE INDEX IF NOT EXISTS crypto_payment_intents_buyer_id_idx ON crypto_payment_intents (buyer_id);
CREATE UNIQUE INDEX IF NOT EXISTS crypto_payment_intents_reference_key ON crypto_payment_intents (reference);
CREATE UNIQUE INDEX IF NOT EXISTS crypto_payment_intents_solana_signature_key ON crypto_payment_intents (solana_signature);

-- 5. Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política: Donos podem ver seus próprios gêmeos digitais OU itens à venda no mercado
DROP POLICY IF EXISTS "Users can view their own twins" ON digital_twins;
DROP POLICY IF EXISTS "Anyone can view listings for sale" ON digital_twins;
CREATE POLICY "Users can view their own twins"
ON digital_twins FOR SELECT
USING ((select auth.uid()) = current_owner_id OR is_for_sale = true);

-- Política: Apenas o dono pode atualizar (mudar status de venda)
DROP POLICY IF EXISTS "Owners can update their twin status" ON digital_twins;
CREATE POLICY "Owners can update their twin status"
ON digital_twins FOR UPDATE
USING ((select auth.uid()) = current_owner_id)
WITH CHECK (
  (select auth.uid()) = current_owner_id
  AND (is_for_sale = false OR (asking_price IS NOT NULL AND asking_price > 0))
);

-- 6) User profiles (ties auth.users -> app-level data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','elite','brand')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_connect_account_id TEXT,
  solana_usdc_address TEXT,
  solana_usdt_address TEXT,
  btc_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6b) Minimal telemetry (events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  twin_id UUID REFERENCES digital_twins(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events"
ON events FOR SELECT
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events"
ON events FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS events_user_id_idx ON events (user_id);
CREATE INDEX IF NOT EXISTS events_twin_id_idx ON events (twin_id);
CREATE INDEX IF NOT EXISTS events_type_idx ON events (type);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS solana_usdc_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS solana_usdt_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS btc_address TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key ON profiles (stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_key ON profiles (stripe_subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_connect_account_id_key ON profiles (stripe_connect_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_checkout_session_id_key ON transactions (stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_payment_intent_id_key ON transactions (stripe_payment_intent_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING ((select auth.uid()) = id);

-- 7) Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8) RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
USING (true);

-- 9) RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transactions where they are buyer or seller" ON transactions;
CREATE POLICY "Users can view transactions where they are buyer or seller"
ON transactions FOR SELECT
USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

-- 10) Additional hardening for digital_twins (insert/delete)
DROP POLICY IF EXISTS "Owners can create twins for themselves" ON digital_twins;
CREATE POLICY "Owners can create twins for themselves"
ON digital_twins FOR INSERT
WITH CHECK ((select auth.uid()) = current_owner_id);

DROP POLICY IF EXISTS "Owners can delete their own twins" ON digital_twins;
CREATE POLICY "Owners can delete their own twins"
ON digital_twins FOR DELETE
USING ((select auth.uid()) = current_owner_id);

-- 11) keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 12) Audit/telemetry triggers for marketplace actions
CREATE OR REPLACE FUNCTION public.log_digital_twin_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.is_for_sale IS DISTINCT FROM OLD.is_for_sale) THEN
      INSERT INTO public.events (user_id, type, twin_id, data)
      VALUES (
        NEW.current_owner_id,
        CASE WHEN NEW.is_for_sale THEN 'listing.created' ELSE 'listing.removed' END,
        NEW.id,
        jsonb_build_object(
          'asking_price', NEW.asking_price,
          'previous_asking_price', OLD.asking_price
        )
      );
    END IF;

    IF (NEW.current_owner_id IS DISTINCT FROM OLD.current_owner_id) THEN
      INSERT INTO public.events (user_id, type, twin_id, data)
      VALUES (
        NEW.current_owner_id,
        'ownership.transferred',
        NEW.id,
        jsonb_build_object(
          'from', OLD.current_owner_id,
          'to', NEW.current_owner_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Performance: add indexes for foreign keys
CREATE INDEX IF NOT EXISTS digital_twins_current_owner_id_idx ON digital_twins (current_owner_id);
CREATE INDEX IF NOT EXISTS digital_twins_product_id_idx ON digital_twins (product_id);
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON products (brand_id);
CREATE INDEX IF NOT EXISTS transactions_buyer_id_idx ON transactions (buyer_id);
CREATE INDEX IF NOT EXISTS transactions_seller_id_idx ON transactions (seller_id);
CREATE INDEX IF NOT EXISTS transactions_twin_id_idx ON transactions (twin_id);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS digital_twins_set_updated_at ON digital_twins;
CREATE TRIGGER digital_twins_set_updated_at
BEFORE UPDATE ON digital_twins
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS digital_twins_log_events ON digital_twins;
CREATE TRIGGER digital_twins_log_events
AFTER UPDATE ON digital_twins
FOR EACH ROW EXECUTE PROCEDURE public.log_digital_twin_events();
