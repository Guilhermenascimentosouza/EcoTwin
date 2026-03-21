# EcoTwin

EcoTwin é uma plataforma SaaS para **passaportes digitais de produto (DPP)** e **gêmeos digitais**.

Ela ajuda usuários a certificar ativos físicos, comprovar autenticidade, rastrear propriedade e participar de um marketplace circular — com recursos por assinatura via Stripe.

## Módulos da plataforma

- **Vault (Cofre)**
  Armazena seus ativos certificados (gêmeos digitais), permite ver detalhes e gerenciar a coleção.
- **Scan (DPP)**
  Escaneia/valida um ID de Passaporte Digital do Produto e registra no seu cofre.
- **Market (Mercado)**
  Explora itens listados para revenda e alterna o status de venda dos seus próprios ativos.
- **Stats (Estatísticas)**
  Indicadores leves de impacto/ESG (ex.: CO₂ economizado) com base no seu cofre.
- **Profile (Perfil)**
  Plano de assinatura (Free / Elite), portal de cobrança e seleção de idioma.

## Stack de tecnologia

- **Frontend**
  - React 18 + Vite
  - TailwindCSS
  - Framer Motion
  - Zustand (estado de auth)
  - TanStack Query (data fetching)
  - i18next / react-i18next (EN/FR/DE)
  - html5-qrcode (scanner)
- **Backend**
  - Supabase (Auth, Postgres, RLS)
- **Pagamentos**
  - Assinaturas Stripe + portal do cliente
  - Vercel Serverless Functions para checkout, portal e webhook
- **PWA**
  - `public/manifest.webmanifest`
  - `public/sw.js`

## Estrutura do repositório

- `src/`
  - `App.jsx`: UI principal (abas, tela de auth, shell do app)
  - `lib/supabaseClient.js`: inicialização do cliente Supabase com validação “graceful” de config
  - `api/`: helpers no browser para consultar Supabase e endpoints serverless
  - `hooks/`: hooks do TanStack Query
- `api/`
  Vercel Serverless Functions
  - `create-checkout-session.js`
  - `create-portal-session.js`
  - `stripe-webhook.js`
- `supabase/schema.sql`
  Schema do banco + políticas de RLS + automação de profile
- `public/`
  Assets PWA + páginas legais estáticas
  - `terms.html` / `privacy.html` (EN/FR/DE com `?lang=`)

## Recursos e comportamento

### Segurança de configuração do Supabase

O app foi pensado para evitar deploy com “tela branca”:

- Se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiver faltando/inválido, `src/lib/supabaseClient.js` exporta:
  - `supabase = null`
  - `supabaseEnvError = <message>`
- `App.jsx` renderiza uma tela amigável de configuração em vez de crashar.

## Variáveis de ambiente

Copie `.env.example` para `.env` no dev local.

### Públicas (Vite)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` (opcional, a não ser que você use Stripe.js)

### Server (Vercel Functions)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necessária para `stripe-webhook`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ELITE_PRICE_ID`
- `PUBLIC_APP_URL` (fallback para redirects nas funções serverless)

## Desenvolvimento local

Instalar e rodar:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview do build de produção local:

```bash
npm run preview
```

## Setup do Supabase

1. Crie um projeto no Supabase.
2. Abra o **SQL Editor** e execute `supabase/schema.sql`.
3. Garanta que o Auth está habilitado (Email/Senha e/ou provedores OAuth que você quiser).
4. Configure as env vars do Vite:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key

### Modelo de dados (visão geral)

- `brands`
- `products` (contém `dpp_id`)
- `digital_twins` (instâncias do ativo por usuário; flags de venda)
- `transactions` (atividade do market)
- `profiles` (1:1 com `auth.users`, inclui tier + IDs do Stripe)

## Setup do Stripe

1. Crie um Product + Recurring Price no Stripe para o plano **Elite**.
2. Coloque o price ID em `STRIPE_ELITE_PRICE_ID`.
3. Configure um webhook apontando para:
   - `https://<your-vercel-domain>/api/stripe-webhook`
4. Adicione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

O webhook salva `stripe_customer_id` / `stripe_subscription_id` em `profiles` e faz upgrade/downgrade automático de `subscription_tier`.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Adicione as env vars do `.env.example`.
3. Faça o deploy.

### Security headers

O `vercel.json` define:

- CSP (permitindo Supabase + Stripe)
- Proteção contra clickjacking (`X-Frame-Options: DENY`)
- `x-vercel-skip-toolbar: 1` para desativar o overlay injetado da Vercel Toolbar

## i18n (EN/FR/DE)

- As traduções ficam em `src/i18n.js`.
- A aba Profile inclui um seletor de idioma.
- As páginas legais (`/terms.html`, `/privacy.html`) suportam `?lang=en|fr|de` e também detectam o idioma do navegador.

## Troubleshooting

- **Tela branca / crash ao carregar**
  - Verifique se `VITE_SUPABASE_URL` começa com `https://` e é uma URL válida.
  - Verifique se `VITE_SUPABASE_ANON_KEY` está configurada.
  - O app deve exibir uma tela de erro de configuração se as env vars estiverem faltando.

## License

Proprietary / TBD.