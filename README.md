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

## Modelo de receita (monetização)

O EcoTwin pode gerar receita por múltiplos canais. **Atualmente, o app já suporta o modelo de assinatura via Stripe (Elite)**. Os demais itens podem ser implementados como evolução do produto.

### 1) Assinaturas Premium (B2C) (implementado)

- **Plano Elite (assinatura)**
  Pensado para colecionadores/usuários com uma coleção maior (ex.: mais de 3 itens no cofre). O upgrade é feito via Stripe Checkout e a gestão do plano via portal do Stripe.

Na implementação atual:

- Checkout: `api/create-checkout-session.js`
- Portal de cobrança: `api/create-portal-session.js`
- Webhook: `api/stripe-webhook.js` (atualiza `profiles.subscription_tier`)

### 2) Taxa por transação no Marketplace (P2P) (roadmap)

- Quando um item muda de dono dentro do EcoTwin, você pode cobrar uma **comissão de sucesso** (ex.: 2% a 5%).
- Hoje o app permite **listar/deslistar** ativos (`digital_twins.is_for_sale`), mas não executa a liquidação do pagamento P2P.

### 3) Emissão de DPPs para Marcas (B2B) (roadmap)

- Cobrança por ativo (por DPP emitido na fabricação) ou por volume.
- Oferta de dashboard de compliance/transparência para marcas (SaaS B2B).

### 4) Afiliados (seguro/restauro/serviços) (roadmap)

- Dentro do cofre, sugerir serviços (seguro, restauro autorizado etc.) e capturar receita via comissão/lead.

### Cenários exemplo (mais realistas) (números ilustrativos)

> Exemplos hipotéticos para mostrar como os canais podem somar receita ao longo do tempo.
> Use como “modelo mental” (as premissas variam muito por nicho, país e oferta).

#### Premissas (para você ajustar)

- **Assinatura (B2C)**
  - Conversão para Elite costuma variar (ex.: 1% a 8%), dependendo do paywall, do valor percebido e do ICP (colecionadores).
- **Marketplace (P2P)**
  - Receita é função de:
    - Nº de vendas/mês
    - Ticket médio
    - Comissão (take rate)
  - Ex.: `receita_market = vendas * ticket_medio * take_rate`
- **B2B (DPP)**
  - Pode ser por volume (`€/DPP`) ou recorrente (licença mensal) + setup.
- **Afiliados**
  - Depende de taxa de clique, conversão e comissão por contrato/serviço.

#### Cenário inicial — 50 usuários ativos (pé no chão)

> A ideia aqui é mostrar que, no começo, a monetização é pequena e depende de ajustar oferta, funil e valor percebido.

- **Base ativa**: 50 usuários/mês

- **Assinaturas Elite (MRR)**
  - Conversão Elite: 4% (2 assinantes)
  - MRR Elite: 2 x €19,99 ≈ **€40/mês**

- **Marketplace (take rate)**
  - 2 vendas/mês
  - Ticket médio: €900
  - Take rate: 3%
  - Receita: 2 x €900 x 3% = **€54/mês**

- **B2B (DPP)**
  - 0 marcas no início (ou pilotos sem cobrança)
  - Receita: **€0/mês**

- **Afiliados/serviços**
  - 5 leads/mês
  - Conversão: 10% (0 a 1)
  - Comissão média: €20
  - Receita estimada: **€0 a €20/mês**

**Total estimado (início)**: ~ **€94 a €114/mês**

## Roadmap (realista e funcional)

Este roadmap foi escrito para ser **executável**: cada item tem um resultado verificável (tela/endpoint/tabela) e reflete o que já existe no repositório.

### Já está funcional (hoje)

- [x] **Auth por email/senha (Supabase)**
- [x] **Assinatura Elite via Stripe (checkout + portal + webhook)**
  - Checkout: `api/create-checkout-session.js`
  - Portal: `api/create-portal-session.js`
  - Webhook: `api/stripe-webhook.js` (atualiza `profiles.subscription_tier` + IDs do Stripe)
- [x] **Vault (listar gêmeos digitais do usuário)**
- [x] **Scan / validação de DPP** (valida `dpp_id` e permite registrar no cofre)
- [x] **Market (listar itens à venda + listar/deslistar o próprio item)**
  - Observação: ainda **não** há pagamento/checkout P2P nem transferência real de propriedade.
- [x] **i18n do app (EN/FR/DE) + páginas legais estáticas**
  - `public/terms.html` / `public/privacy.html` com `?lang=`
- [x] **Proteção contra “tela branca” por env do Supabase**
  - `src/lib/supabaseClient.js` exporta `supabase = null` e `supabaseEnvError`
- [x] **PWA básico** (`manifest.webmanifest`, `sw.js`)

### Próximo (1 a 2 sprints) — completar fluxos essenciais

- [ ] **Transferência de propriedade real**
  - Implementar fluxo para o botão “Transfer Ownership” no Market (hoje é placeholder na UI).
  - Persistir uma transação em `transactions` e atualizar `digital_twins.current_owner_id`.
- [ ] **Checkout Marketplace (P2P) com cobrança de taxa**
  - Definir modelo (ex.: Stripe PaymentIntent/Checkout, e/ou Stripe Connect se houver split).
  - Registrar comissão (take rate) e reconciliação no banco.
- [ ] **Normalizar dados do marketplace**
  - Garantir `asking_price` obrigatório quando `is_for_sale=true`.
  - Validar permissões via RLS (quem pode listar/deslistar / transferir).
- [ ] **Telemetria mínima**
  - Log de eventos (signup, upgrade, listagem, venda) para medir funil real.

### Depois (quando houver demanda) — monetização B2B e escala

- [ ] **B2B: emissão de DPP por marca**
  - Painel para marcas (criar produtos, emitir `dpp_id`, importar lote).
  - Billing B2B (por volume e/ou licença mensal).
- [ ] **Afiliados/serviços**
  - Inserir ofertas contextuais (seguro/restauro) e tracking de comissão.
- [ ] **Operação/qualidade**
  - Suite de testes mínima (fluxos críticos) + monitoramento de erros em produção.

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