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

-- 4. Tabela de Transações (Log de Vendas)
CREATE TABLE IF NOT EXISTS transactions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
twin_id UUID REFERENCES digital_twins(id),
seller_id UUID REFERENCES auth.users(id),
buyer_id UUID REFERENCES auth.users(id),
price DECIMAL(10,2) NOT NULL,
service_fee DECIMAL(10,2) NOT NULL, -- A sua faturação (ex: 3%)
status TEXT DEFAULT 'completed',
created_at TIMESTAMPTZ DEFAULT now()
);

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
USING ((select auth.uid()) = current_owner_id);

-- 6) User profiles (ties auth.users -> app-level data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','elite','brand')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key ON profiles (stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_key ON profiles (stripe_subscription_id);

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
