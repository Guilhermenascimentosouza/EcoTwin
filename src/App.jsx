import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import {
  Leaf, LayoutGrid, Search, ChevronRight, ArrowUpRight, Globe, Zap,
  Menu, X, Check, Lock, Shield, Eye, EyeOff, CreditCard, Gavel
} from 'lucide-react';
import { supabase, supabaseEnvError } from './lib/supabaseClient';
import { useAuthStore } from './stores/authStore';
import { useVaultTwins } from './hooks/useVaultTwins';
import { useProfile, useUpdateProfile } from './hooks/useProfile';
import { useMarketListings, useSetTwinForSale, useMarketCheckout } from './hooks/useMarketListings';
import { useMarketPricesInternal } from './hooks/useMarketPricesInternal';
import { useBids, useLiveAuctions, usePlaceBid } from './hooks/useAuctions';
import { useRegisterTwin } from './hooks/useRegisterTwin';
import { useValidateDpp } from './hooks/useValidateDpp';
import { createBillingPortalSession, createEliteCheckoutSession } from './api/billing';
import { createConnectOnboardingLink } from './api/connect';
import { createSolanaPaymentIntent } from './api/solana';
import { logAffiliateClick } from './api/affiliates';
import { optimizeImageUrl } from './lib/images';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGES } from './i18n';

const ScanOverlay = React.lazy(() => import('./components/ScanOverlay.jsx'));
const ImpactChart = React.lazy(() => import('./components/ImpactChart.jsx'));

const AFFILIATE_OFFERS = {
  insurance: {
    key: 'insurance',
    label: 'Insurance',
    provider: 'EcoTwin Partners',
    url: 'https://example.com/insurance'
  },
  restoration: {
    key: 'restoration',
    label: 'Restoration',
    provider: 'EcoTwin Partners',
    url: 'https://example.com/restoration'
  }
};

// --- CONFIG & MOCKS (Global/English) ---
const MOCK_PRODUCTS = [
  { id: '1', name: 'Heritage 1954 Watch', brand: 'Vacheron & Co', category: 'Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop', marketValue: 12500, change: '+4.2%', condition: 'Mint', carbonSaved: '12kg', idDigital: 'DPP-882-X90', productId: '1' },
  { id: '2', name: 'Saffiano Leather Bag', brand: 'Prada Paris', category: 'Accessories', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop', marketValue: 2400, change: '-1.5%', condition: 'New', carbonSaved: '8kg', idDigital: 'DPP-771-A12', productId: '2' },
  { id: '3', name: 'Sustain-X Sneakers', brand: 'EcoStep', category: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop', marketValue: 180, change: '+12%', condition: 'Used', carbonSaved: '25kg', idDigital: 'DPP-112-L99', productId: '3' }
];

const MARKET_ITEMS = [
  { id: 'm1', name: 'Vintage 90s Jacket', brand: 'Burberry', price: 850, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop' },
  { id: 'm2', name: 'Aviator Gold Glasses', brand: 'Ray-Ban', price: 320, image: 'https://images.unsplash.com/photo-1511499767390-a7335958beba?q=80&w=400&auto=format&fit=crop' },
];

// --- UI COMPONENTS ---

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800',
    secondary: 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-50',
    outline: 'bg-transparent text-stone-400 border border-stone-200 hover:border-stone-900 hover:text-stone-900'
  };
  return (
    <button className={`px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- PUBLIC PAGES ---

const LandingPage = ({ onStart }) => (
  <div className="bg-[#FDFCF8] min-h-screen">
    <nav className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
          <Leaf className="text-white w-5 h-5" />
        </div>
        <span className="font-light tracking-[0.3em] uppercase text-sm">EcoTwin</span>
      </div>
      <div className="hidden md:flex space-x-8 text-sm text-stone-500 font-medium uppercase tracking-widest">
        <a href="#features" className="hover:text-stone-900">Features</a>
        <a href="#pricing" className="hover:text-stone-900">Pricing</a>
        <a href="#manifesto" className="hover:text-stone-900">Manifesto</a>
      </div>
      <Button variant="secondary" onClick={() => onStart('login')}>Sign In</Button>
    </nav>

    <header className="px-6 pt-20 pb-32 max-w-4xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-[0.2em] mb-6 inline-block">
          The Future of Digital Ownership in Europe
        </span>
        <h1 className="text-5xl md:text-7xl font-light leading-tight mb-8">
          Give an eternal identity to your <span className="italic font-serif">physical assets.</span>
        </h1>
        <p className="text-lg text-stone-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          EcoTwin leverages Digital Product Passports (DPP) to ensure authenticity, track real-time value, and power the circular economy.
        </p>
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          <Button onClick={() => onStart('signup')} className="px-12 py-5 text-lg">Start Your Vault</Button>
          <Button variant="outline" className="px-12 py-5 text-lg">Watch Demo</Button>
        </div>
      </motion.div>
    </header>

    <section id="pricing" className="bg-white py-24 px-6 border-t border-stone-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-light mb-4">Scale Your Impact</h2>
          <p className="text-stone-400">Choose the plan that fits your collection size.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Collector', price: 'Free', features: ['Up to 3 Items', 'Basic DPP Access', 'Public Marketplace'] },
            { name: 'Elite', price: '€19.99', features: ['Unlimited Items', 'Real-time Valuation', 'Priority Support', 'Reduced Resell Fees', 'Export Tax Data'], popular: true },
            { name: 'Brand', price: 'Custom', features: ['Manufacturing API', 'ESG Dashboard', 'Custom DPP Design', 'Batch Onboarding'] }
          ].map((plan) => (
            <motion.div 
              key={plan.name} 
              whileHover={{ y: -10 }}
              className={`p-10 rounded-[3rem] border transition-all ${plan.popular ? 'border-stone-900 shadow-2xl relative bg-stone-50/30' : 'border-stone-100 bg-white'}`}
            >
              {plan.popular && <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-900 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest">Most Popular</span>}
              <h3 className="text-xl font-light mb-2">{plan.name}</h3>
              <p className="text-4xl font-semibold mb-8">{plan.price}<span className="text-sm font-normal text-stone-400">{plan.price !== 'Custom' && plan.price !== 'Free' && '/mo'}</span></p>
              <ul className="space-y-4 mb-10">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center text-sm text-stone-500">
                    <Check className="w-4 h-4 mr-3 text-green-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.popular ? 'primary' : 'secondary'} className="w-full" onClick={() => onStart('signup')}>Select {plan.name}</Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <footer className="py-20 px-6 border-t border-stone-100 text-center">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-stone-400 text-xs uppercase tracking-widest font-bold">
        <div className="flex space-x-8 mb-8 md:mb-0">
          <a href={`/privacy.html?lang=${i18n.language}`} target="_blank" rel="noreferrer" className="hover:text-stone-900">Privacy Policy</a>
          <a href={`/terms.html?lang=${i18n.language}`} target="_blank" rel="noreferrer" className="hover:text-stone-900">Terms of Service</a>
        </div>
        <p> 2026 EcoTwin Technologies AG. All Rights Reserved.</p>
      </div>
    </footer>
  </div>
);

function AuthPage({ mode, onAuth, onToggleMode, onBack, externalError }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = z.object({
    email: z.string().email(t('auth.invalid_email')),
    password: z.string().min(8, t('auth.password_min'))
  });

  const handleSubmit = async () => {
    setFormError(null);

    if (mode === 'signup' && !acceptedTerms) {
      setFormError(t('auth.must_accept_terms'));
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }

    setSubmitting(true);
    try {
      await onAuth({ email, password, mode });
    } catch (e) {
      setFormError(e?.message ?? t('auth.auth_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 md:p-16 rounded-[3rem] border border-stone-100 shadow-xl w-full max-w-md">
        <div className="text-center mb-10">
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-900 flex items-center justify-center mx-auto mb-6 tracking-widest uppercase">
            {t('common.back_to_home')}
          </button>
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-light">{mode === 'login' ? t('auth.welcome_back') : t('auth.join_revolution')}</h2>
          <p className="text-stone-400 text-sm mt-2">{mode === 'login' ? t('auth.access_vault') : t('auth.start_certifying')}</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">{t('auth.email')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@domain.com" className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">{t('auth.password')}</label>
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full px-6 py-4 pr-14 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all" />
              <button
                type="button"
                aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-white/70 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <label className="flex items-start gap-3 pt-1 text-sm text-stone-500 select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <span>
                {t('auth.accept_terms_prefix')}{' '}
                <a href={`/terms.html?lang=${i18n.language}`} target="_blank" rel="noreferrer" className="underline hover:text-stone-900">{t('auth.terms')}</a>{' '}
                {t('auth.and')}{' '}
                <a href={`/privacy.html?lang=${i18n.language}`} target="_blank" rel="noreferrer" className="underline hover:text-stone-900">{t('auth.privacy_policy')}</a>.
              </span>
            </label>
          )}

          {externalError && (
            <div className="px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              {externalError}
            </div>
          )}
          {formError && (
            <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {formError}
            </div>
          )}

          <Button className="w-full py-4 mt-4" onClick={handleSubmit} disabled={submitting || (mode === 'signup' && !acceptedTerms)}>
            {mode === 'login' ? t('auth.sign_in') : t('auth.create_account')}
          </Button>

          <div className="pt-2">
            <Button
              variant="secondary"
              className="w-full py-3"
              aria-label={t('auth.continue_google')}
              onClick={() => onAuth({ mode, provider: 'google' })}
              disabled={submitting}
            >
              <span className="inline-flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.03 1.53 7.41 2.81l5.4-5.4C33.6 3.95 29.25 2 24 2 14.62 2 6.51 7.38 2.56 15.22l6.57 5.1C11.03 13.51 17.02 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.4-4.5H24v8.51h12.63c-.54 2.9-2.17 5.35-4.63 7.01l7.06 5.48C43.09 37.14 46.5 31.37 46.5 24.5z"/>
                  <path fill="#FBBC05" d="M9.13 28.32c-.5-1.5-.8-3.1-.8-4.82s.3-3.32.8-4.82l-6.57-5.1C.92 16.86 0 20.32 0 23.5c0 3.18.92 6.64 2.56 9.92l6.57-5.1z"/>
                  <path fill="#34A853" d="M24 46c5.25 0 9.6-1.73 12.8-4.7l-7.06-5.48c-1.96 1.32-4.47 2.1-5.74 2.1-6.98 0-12.97-4.01-14.87-9.82l-6.57 5.1C6.51 40.62 14.62 46 24 46z"/>
                </svg>
                Google
              </span>
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={onToggleMode} className="text-sm text-stone-500 hover:text-stone-900">
            {mode === 'login' ? t('auth.dont_have_account') : t('auth.already_have_account')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- APP CORE ---

const AppCore = ({ onLogout }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('vault');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { data: vaultTwins, isLoading: vaultLoading } = useVaultTwins({ userId: user?.id });
  const { data: profile } = useProfile({ userId: user?.id });
  const updateProfile = useUpdateProfile({ userId: user?.id });
  const { data: marketListings, isLoading: marketLoading } = useMarketListings();
  const setForSale = useSetTwinForSale();
  const marketCheckout = useMarketCheckout();
  const registerTwin = useRegisterTwin();
  const validateDpp = useValidateDpp();

  const { data: liveAuctions, isLoading: auctionsLoading } = useLiveAuctions();
  const placeBidMutation = usePlaceBid();
  const { data: bids } = useBids({ auctionId: selectedAuctionId });

  const selectedAuction = (liveAuctions ?? []).find((a) => a.id === selectedAuctionId) ?? null;

  const productIdsForPricing = useMemo(() => {
    const ids = [];
    for (const tw of (vaultTwins ?? [])) ids.push(tw?.product?.id);
    for (const tw of (marketListings ?? [])) ids.push(tw?.product?.id);
    return ids.filter(Boolean);
  }, [vaultTwins, marketListings]);

  const { data: marketPricesInternal } = useMarketPricesInternal({ productIds: productIdsForPricing });

  const marketPriceByProductId = useMemo(() => {
    const map = new Map();
    for (const row of (marketPricesInternal ?? [])) {
      map.set(row.product_id, row);
    }
    return map;
  }, [marketPricesInternal]);

  const [solUsdc, setSolUsdc] = useState('');
  const [solUsdt, setSolUsdt] = useState('');

  useEffect(() => {
    if (!profile) return;
    setSolUsdc(profile.solana_usdc_address ?? '');
    setSolUsdt(profile.solana_usdt_address ?? '');
  }, [profile?.solana_usdc_address, profile?.solana_usdt_address]);

  const vaultProducts = (vaultTwins ?? []).map((t) => {
    const priceRow = marketPriceByProductId.get(t.product?.id);
    const marketValue = Number(priceRow?.avg_price ?? 0);
    return {
    id: t.id,
    productId: t.product?.id ?? null,
    name: t.product?.name ?? 'Unnamed Item',
    brand: t.product?.brand?.name ?? 'Unknown Brand',
    category: t.product?.category ?? 'Unknown',
    image: t.product?.image_url ?? '',
    marketValue,
    change: '+0%',
    condition: t.condition ?? 'Used',
    carbonSavedKg: Number(t.carbon_saved_kg ?? 0),
    carbonSaved: `${Number(t.carbon_saved_kg ?? 0)}kg`,
    idDigital: t.product?.dpp_id ?? '',
    ownerId: user?.id ?? null,
    updatedAt: t.updated_at,
    marketLastUpdated: priceRow?.last_updated ?? null,
    marketListingsCount: Number(priceRow?.listings_count ?? 0)
  };
  });

  const vaultProductsToRender = vaultProducts.length > 0 ? vaultProducts : MOCK_PRODUCTS;
  const isFreeTier = (profile?.subscription_tier ?? 'free') === 'free';
  const vaultCount = (vaultTwins ?? []).length;

  const marketProducts = (marketListings ?? []).map((t) => {
    const priceRow = marketPriceByProductId.get(t.product?.id);
    const marketValue = Number(priceRow?.avg_price ?? 0);
    const listingPrice = Number(t.asking_price ?? 0);
    return {
    id: t.id,
    productId: t.product?.id ?? null,
    name: t.product?.name ?? 'Unnamed Item',
    brand: t.product?.brand?.name ?? 'Unknown Brand',
    category: t.product?.category ?? 'Unknown',
    image: t.product?.image_url ?? '',
    marketValue,
    listingPrice,
    change: '+0%',
    condition: t.condition ?? 'Used',
    carbonSavedKg: Number(t.carbon_saved_kg ?? 0),
    carbonSaved: `${Number(t.carbon_saved_kg ?? 0)}kg`,
    idDigital: t.product?.dpp_id ?? '',
    ownerId: t.current_owner_id,
    marketLastUpdated: priceRow?.last_updated ?? null,
    marketListingsCount: Number(priceRow?.listings_count ?? 0)
  };
  });

  const impactTotalKg = (vaultTwins ?? []).reduce((acc, t) => acc + Number(t.carbon_saved_kg ?? 0), 0);
  const impactChartData = (vaultTwins ?? [])
    .map((t) => ({
      date: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—',
      impact: Number(t.carbon_saved_kg ?? 0)
    }))
    .slice(0, 12)
    .reverse();

  const scanFallback = (
    <motion.div key="sc-f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-stone-900 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-[3rem] bg-white/5 border border-white/10 overflow-hidden p-10 text-white/80 text-sm text-center">
        {t('scan.loading_scanner')}
      </div>
      <button onClick={() => setActiveTab('vault')} className="mt-10 px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 bg-transparent text-white border border-white/20 hover:border-white/40">{t('common.cancel')}</button>
    </motion.div>
  );

  function AddItemModal() {
    const [dppId, setDppId] = useState('');
    const [condition, setCondition] = useState('Usado');
    const [error, setError] = useState(null);

    const schema = z.object({
      dppId: z.string().min(3, 'Enter a valid DPP ID.'),
      condition: z.enum(['Novo', 'Excelente', 'Bom', 'Usado'])
    });

    const canAdd = !isFreeTier || vaultCount < 3;

    const onSubmit = async () => {
      setError(null);
      if (!canAdd) {
        setError(t('limits.free_limit_reached'));
        return;
      }

      const parsed = schema.safeParse({ dppId: dppId.trim(), condition });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
        return;
      }

      try {
        await registerTwin.mutateAsync({ userId: user?.id, dppId: parsed.data.dppId, condition: parsed.data.condition });
        setShowAddItem(false);
      } catch (e) {
        setError(e?.message ?? 'Failed to add item.');
      }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-stone-900/40 backdrop-blur-md flex items-end md:items-center justify-center p-4" onClick={() => setShowAddItem(false)}>
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#FDFCF8] w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="p-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="bg-stone-100 text-stone-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{t('vault.add_item')}</span>
                <h2 className="text-3xl font-light mt-2">{t('vault.add_item_title')}</h2>
                <p className="text-stone-500">{t('vault.add_item_subtitle')}</p>
              </div>
              <button type="button" aria-label={t('common.close')} onClick={() => setShowAddItem(false)} className="bg-black/5 text-stone-700 p-2 rounded-full hover:bg-black/10 backdrop-blur transition-all"><X /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">{t('vault.dpp_id')}</label>
                <input value={dppId} onChange={(e) => setDppId(e.target.value)} placeholder="DPP-882-X90" className="w-full px-6 py-4 rounded-2xl bg-white border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">{t('vault.condition')}</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-white border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all">
                  <option value="Novo">Novo</option>
                  <option value="Excelente">Excelente</option>
                  <option value="Bom">Bom</option>
                  <option value="Usado">Usado</option>
                </select>
              </div>

              {error && (
                <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
              )}

              {isFreeTier && (
                <div className="px-5 py-4 rounded-2xl bg-stone-50 border border-stone-100 text-stone-600 text-sm">
                  {t('limits.free_plan', { count: vaultCount })}
                </div>
              )}

              <Button className="w-full py-5 text-lg shadow-xl shadow-stone-900/10" onClick={onSubmit} disabled={registerTwin.isPending || !canAdd}>
                {registerTwin.isPending ? t('vault.registering') : t('vault.add_to_vault')}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const Navbar = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-stone-100 px-8 py-5 flex justify-between items-center z-50">
      <button type="button" aria-label={t('nav.vault')} onClick={() => setActiveTab('vault')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-lg">
        <LayoutGrid className={`w-6 h-6 transition-colors ${activeTab === 'vault' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`} />
      </button>
      <button type="button" aria-label={t('nav.market')} onClick={() => setActiveTab('market')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-lg">
        <Globe className={`w-6 h-6 transition-colors ${activeTab === 'market' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`} />
      </button>
      <button type="button" aria-label={t('nav.auction')} onClick={() => setActiveTab('auction')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-lg">
        <Gavel className={`w-6 h-6 transition-colors ${activeTab === 'auction' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`} />
      </button>
      <button type="button" aria-label={t('nav.scan')} onClick={() => setActiveTab('scan')} className="bg-stone-900 p-3 rounded-full -mt-12 shadow-2xl border-4 border-[#FDFCF8] cursor-pointer hover:scale-110 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <QrCode className="text-white w-6 h-6" />
      </button>
      <button type="button" aria-label={t('nav.stats')} onClick={() => setActiveTab('stats')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-lg">
        <TrendingUp className={`w-6 h-6 transition-colors ${activeTab === 'stats' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`} />
      </button>
      <button type="button" aria-label={t('nav.profile')} onClick={() => setActiveTab('profile')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-lg">
        <User className={`w-6 h-6 transition-colors ${activeTab === 'profile' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`} />
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF8] pb-32">
      <AnimatePresence mode="wait">
        {activeTab === 'vault' && (
          <motion.div key="v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
            <header className="pt-8 pb-10">
              <span className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('vault.certified_assets')}</span>
              <div className="flex items-end justify-between">
                <h1 className="text-4xl font-light mt-1 text-stone-900">{t('vault.vault_dashboard')}</h1>
                <Button variant="secondary" className="hidden md:inline-flex" onClick={() => setShowAddItem(true)} disabled={isFreeTier && vaultCount >= 3}>
                  <span className="inline-flex items-center"><Plus className="w-4 h-4 mr-2" /> {t('vault.add_item')}</span>
                </Button>
              </div>
            </header>

            <button
              type="button"
              aria-label={t('vault.add_item')}
              onClick={() => setShowAddItem(true)}
              disabled={isFreeTier && vaultCount >= 3}
              className="md:hidden fixed right-6 bottom-28 bg-stone-900 text-white w-14 h-14 rounded-full shadow-2xl shadow-stone-900/20 flex items-center justify-center border-4 border-[#FDFCF8] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6" />
            </button>
            
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="bg-stone-900 rounded-[2.5rem] p-10 text-white mb-10 relative overflow-hidden"
            >
               <div className="relative z-10">
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-2">Total Vault Value</p>
                <h2 className="text-5xl font-light">€15,080.00</h2>
                <div className="mt-6 inline-flex items-center bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <TrendingUp className="w-3 h-3 mr-2" /> +€1,240 this month
                </div>
               </div>
               <Leaf className="absolute right-[-20px] bottom-[-20px] w-48 h-48 opacity-5 -rotate-12" />
            </motion.div>

            {vaultLoading && (
              <div className="mb-8">
                <div className="bg-white border border-stone-100 rounded-[2rem] px-6 py-5 text-sm text-stone-500">
                  {t('vault.loading_vault')}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vaultProductsToRender.map((p, idx) => (
                <motion.div 
                  key={p.id}
                  layoutId={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                  whileHover={{ y: -10, transition: { duration: 0.2 } }}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-white p-5 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group"
                >
                  <div className="h-48 rounded-[2rem] overflow-hidden mb-6 relative">
                    {p.image ? (
                      <img loading="lazy" decoding="async" src={optimizeImageUrl(p.image, { width: 600 })} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" alt={p.name} />
                    ) : (
                      <div className="w-full h-full bg-stone-100" />
                    )}
                    <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase text-stone-900">
                      {p.condition}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">{p.brand}</p>
                  <h3 className="text-xl font-light mb-4">{p.name}</h3>
                  <div className="flex justify-between items-end border-t border-stone-50 pt-4">
                    <p className="text-2xl font-semibold">€{p.marketValue.toLocaleString()}</p>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">{p.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'auction' && (
          <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pt-12">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-light">Live Auction</h1>
              {selectedAuctionId && (
                <Button variant="secondary" onClick={() => setSelectedAuctionId(null)}>
                  {t('common.back_to_home')}
                </Button>
              )}
            </div>

            {auctionsLoading && (
              <div className="mb-6 bg-white border border-stone-100 rounded-[2rem] px-6 py-5 text-sm text-stone-500">{t('common.loading')}</div>
            )}

            {!selectedAuctionId && (
              <div className="grid md:grid-cols-2 gap-6">
                {(liveAuctions ?? []).map((a) => {
                  const name = a.twin?.product?.name ?? 'Auction item';
                  const brand = a.twin?.product?.brand?.name ?? '';
                  const image = a.twin?.product?.image_url ?? '';
                  const price = Number(a.current_price ?? 0);
                  const endsAt = a.ends_at ? new Date(a.ends_at) : null;
                  const endsIn = endsAt ? Math.max(0, endsAt.getTime() - Date.now()) : null;

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAuctionId(a.id)}
                      className="text-left bg-white rounded-[2.5rem] border border-stone-100 overflow-hidden shadow-sm hover:shadow-xl transition-all"
                    >
                      <div className="h-44 overflow-hidden bg-stone-100">
                        {image ? (
                          <img loading="lazy" decoding="async" src={optimizeImageUrl(image, { width: 800 })} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-stone-100" />
                        )}
                      </div>
                      <div className="p-6">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{brand}</p>
                        <p className="text-lg font-medium mt-1">{name}</p>
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current bid</p>
                            <p className="text-2xl font-semibold">€{price}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ends</p>
                            <p className="text-sm text-stone-700">
                              {endsIn == null ? '—' : `${Math.ceil(endsIn / 1000)}s`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {(liveAuctions ?? []).length === 0 && !auctionsLoading && (
                  <div className="bg-white border border-stone-100 rounded-[2rem] px-6 py-5 text-sm text-stone-500">
                    No live auctions.
                  </div>
                )}
              </div>
            )}

            {selectedAuctionId && selectedAuction && (
              <div className="bg-white border border-stone-100 rounded-[2.5rem] p-8">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{selectedAuction.twin?.product?.brand?.name ?? ''}</p>
                <h2 className="text-2xl font-light mt-1">{selectedAuction.twin?.product?.name ?? 'Auction item'}</h2>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-6 bg-stone-50 rounded-3xl">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current</p>
                    <p className="text-3xl font-light">€{Number(selectedAuction.current_price ?? 0)}</p>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-3xl">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Min increment</p>
                    <p className="text-3xl font-light">€{Number(selectedAuction.min_increment ?? 0)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    className="w-full py-5 text-lg shadow-xl shadow-stone-900/10"
                    onClick={async () => {
                      const current = Number(selectedAuction.current_price ?? 0);
                      const inc = Number(selectedAuction.min_increment ?? 1);
                      const suggested = current + inc;
                      const amountStr = window.prompt('Your bid (€)', String(suggested));
                      if (amountStr === null) return;
                      const amount = Number(amountStr);
                      try {
                        await placeBidMutation.mutateAsync({ auctionId: selectedAuction.id, amount });
                      } catch (e) {
                        window.alert(e?.message ?? 'Failed to place bid');
                      }
                    }}
                    disabled={placeBidMutation.isPending}
                  >
                    {placeBidMutation.isPending ? 'Placing…' : 'Place bid'}
                  </Button>
                </div>

                <div className="mt-8">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Latest bids</p>
                  <div className="space-y-2">
                    {(bids ?? []).map((b) => (
                      <div key={b.id} className="flex justify-between bg-stone-50 rounded-2xl px-5 py-4">
                        <span className="text-sm text-stone-600">{String(b.bidder_id).slice(0, 8)}…</span>
                        <span className="text-sm font-semibold">€{Number(b.amount ?? 0)}</span>
                      </div>
                    ))}
                    {(bids ?? []).length === 0 && (
                      <div className="text-sm text-stone-500">No bids yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'market' && (
          <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pt-12">
            <h1 className="text-3xl font-light mb-8">{t('market.circular_market')}</h1>
            {marketLoading && (
              <div className="mb-6 bg-white border border-stone-100 rounded-[2rem] px-6 py-5 text-sm text-stone-500">{t('market.loading_marketplace')}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {(marketProducts.length > 0 ? marketProducts : MARKET_ITEMS.map((i) => ({
                id: i.id,
                name: i.name,
                brand: i.brand,
                image: i.image,
                marketValue: i.price,
                condition: 'Used',
                carbonSaved: '0kg',
                idDigital: '',
                ownerId: null
              }))).map((item, idx) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => setSelectedProduct(item)}
                  className="bg-white rounded-[2rem] border border-stone-50 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="h-40 overflow-hidden">
                    {item.image ? (
                      <img loading="lazy" decoding="async" src={optimizeImageUrl(item.image, { width: 400 })} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full bg-stone-100" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{item.brand}</p>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-lg font-bold mt-2">€{Number(item.marketValue ?? 0)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pt-12">
            <h1 className="text-3xl font-light mb-8">{t('stats.your_impact')}</h1>
            <div className="bg-green-50 rounded-[3rem] p-10 border border-green-100 mb-8">
              <Leaf className="text-green-600 w-12 h-12 mb-6" />
              <h2 className="text-6xl font-light text-green-900 mb-2">{impactTotalKg.toFixed(1)}kg</h2>
              <p className="text-green-700 font-medium">{t('stats.co2_avoided')}</p>
              <div className="mt-8 h-2 w-full bg-green-200 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} transition={{ duration: 1.5 }} className="h-full bg-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-8 border border-stone-100 mb-8">
              <p className="text-xs text-stone-400 font-bold uppercase mb-6">{t('stats.impact_trend')}</p>
              <React.Suspense fallback={<div className="h-48 bg-stone-50 rounded-2xl" />}>
                <ImpactChart data={impactChartData} />
              </React.Suspense>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100">
                <p className="text-xs text-stone-400 font-bold uppercase mb-2">{t('stats.active_items')}</p>
                <p className="text-3xl font-light">{vaultCount}</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100">
                <p className="text-xs text-stone-400 font-bold uppercase mb-2">{t('stats.reuse_score')}</p>
                <p className="text-3xl font-light">A+</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pt-12 max-w-lg mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-stone-200 mx-auto mb-4 border-4 border-white shadow-lg overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Plus className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-light">Alexandre Silva</h2>
            <p className="text-stone-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">{(profile?.subscription_tier ?? 'free').toUpperCase()} {t('profile.member')} • Zurich, CH</p>

            <div className="mt-6 flex items-center justify-center space-x-2">
              <span className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('profile.language')}</span>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white border border-stone-100 text-sm"
                aria-label={t('profile.language')}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-8">
              {(profile?.subscription_tier ?? 'free') !== 'elite' ? (
                <Button
                  className="w-full py-4"
                  onClick={async () => {
                    const { url } = await createEliteCheckoutSession();
                    window.location.href = url;
                  }}
                >
                  {t('profile.upgrade_elite')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full py-4"
                  onClick={async () => {
                    const { url } = await createBillingPortalSession();
                    window.location.href = url;
                  }}
                >
                  {t('profile.manage_billing')}
                </Button>
              )}
            </div>

            <div className="mt-4">
              {!profile?.stripe_connect_account_id ? (
                <Button
                  variant="secondary"
                  className="w-full py-4"
                  onClick={async () => {
                    const { url } = await createConnectOnboardingLink();
                    window.location.href = url;
                  }}
                >
                  Enable Seller Payouts (Stripe Connect)
                </Button>
              ) : (
                <div className="w-full py-4 rounded-2xl bg-white border border-stone-100 text-sm text-stone-600">
                  Stripe Connect: Connected
                </div>
              )}
            </div>

            <div className="mt-8 text-left">
              <p className="text-[10px] font-bold uppercase text-stone-400 tracking-widest mb-3">Crypto payout addresses</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">Solana (USDC)</label>
                  <input value={solUsdc} onChange={(e) => setSolUsdc(e.target.value)} placeholder="Solana address" className="w-full px-5 py-4 rounded-2xl bg-white border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest ml-1">Solana (USDT)</label>
                  <input value={solUsdt} onChange={(e) => setSolUsdt(e.target.value)} placeholder="Solana address" className="w-full px-5 py-4 rounded-2xl bg-white border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all" />
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full py-4 mt-4"
                onClick={async () => {
                  await updateProfile.mutateAsync({
                    patch: {
                      solana_usdc_address: solUsdc || null,
                      solana_usdt_address: solUsdt || null
                    }
                  });
                }}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? t('listing.updating') : 'Save payout addresses'}
              </Button>
            </div>
            
            <div className="mt-12 space-y-3 text-left">
              {[
                { name: 'Settings', icon: <User className="w-4 h-4" /> },
                { name: 'Identity Verification', icon: <ShieldCheck className="w-4 h-4" /> },
                { name: 'Payment Methods', icon: <CreditCard className="w-4 h-4" /> },
                { name: 'Blockchain Privacy', icon: <Lock className="w-4 h-4" /> }
              ].map(opt => (
                <div key={opt.name} className="p-6 bg-white rounded-2xl border border-stone-100 flex justify-between items-center cursor-pointer hover:bg-stone-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <span className="text-stone-300">{opt.icon}</span>
                    <span className="text-sm font-medium">{opt.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300" />
                </div>
              ))}
              <button onClick={onLogout} className="w-full py-6 text-red-500 text-sm font-medium hover:bg-red-50 rounded-2xl transition-colors mt-8">{t('profile.sign_out')}</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'scan' && (
          <React.Suspense fallback={scanFallback}>
            <ScanOverlay onCancel={() => setActiveTab('vault')} validateDpp={validateDpp} />
          </React.Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-stone-900/40 backdrop-blur-md flex items-end md:items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
            <motion.div layoutId={selectedProduct.id} className="bg-[#FDFCF8] w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="h-72 relative group">
                <img loading="lazy" decoding="async" src={optimizeImageUrl(selectedProduct.image, { width: 900 })} className="w-full h-full object-cover" />
                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/20 text-white p-2 rounded-full hover:bg-black/40 backdrop-blur transition-all"><X /></button>
              </div>
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="bg-stone-100 text-stone-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{selectedProduct.idDigital}</span>
                    <h2 className="text-3xl font-light mt-2">{selectedProduct.name}</h2>
                    <p className="text-stone-500 italic font-serif">{selectedProduct.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Impact</p>
                    <div className="flex items-center text-green-600 font-bold">
                      <Leaf className="w-4 h-4 mr-1" /> {selectedProduct.carbonSaved}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="p-6 bg-white border border-stone-100 rounded-3xl">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center text-sm font-medium"><ShieldCheck className="w-4 h-4 mr-2 text-green-600" /> Active Authenticity</div>
                  </div>
                  <div className="p-6 bg-white border border-stone-100 rounded-3xl">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Market</p>
                    <div className="flex items-center text-sm font-medium"><ArrowRightLeft className="w-4 h-4 mr-2 text-blue-500" /> High Liquidity</div>
                  </div>
                </div>
                {selectedProduct.ownerId && selectedProduct.ownerId === user?.id ? (
                  <Button
                    className="w-full py-5 text-lg shadow-xl shadow-stone-900/10"
                    onClick={async () => {
                      const isListed = (marketProducts.find((m) => m.id === selectedProduct.id) != null);
                      if (!isListed) {
                        const priceStr = window.prompt('Asking price (€)', String(Number(selectedProduct.marketValue ?? 0) || ''));
                        if (priceStr === null) return;
                        const askingPrice = Number(priceStr);
                        await setForSale.mutateAsync({ twinId: selectedProduct.id, isForSale: true, askingPrice });
                      } else {
                        await setForSale.mutateAsync({ twinId: selectedProduct.id, isForSale: false, askingPrice: null });
                      }
                      setSelectedProduct(null);
                    }}
                    disabled={setForSale.isPending}
                  >
                    {setForSale.isPending ? t('listing.updating') : t('listing.toggle')}
                  </Button>
                ) : (
                  <Button
                    className="w-full py-5 text-lg shadow-xl shadow-stone-900/10"
                    onClick={async () => {
                      const price = Number(selectedProduct.listingPrice ?? selectedProduct.marketValue ?? 0);
                      const ok = window.confirm(`Confirm purchase for €${price}?`);
                      if (!ok) return;
                      try {
                        const { url } = await marketCheckout.mutateAsync({ twinId: selectedProduct.id });
                        if (!url) throw new Error('Missing checkout url');
                        window.location.href = url;
                      } catch (e) {
                        window.alert(e?.message ?? 'Purchase failed');
                      }
                    }}
                    disabled={marketCheckout.isPending}
                  >
                    {marketCheckout.isPending ? t('listing.updating') : `Buy for €${Number(selectedProduct.listingPrice ?? selectedProduct.marketValue ?? 0)}`}
                  </Button>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    className="w-full py-4"
                    onClick={async () => {
                      try {
                        const offer = AFFILIATE_OFFERS.insurance;
                        await logAffiliateClick({
                          userId: user?.id ?? null,
                          twinId: selectedProduct.id,
                          productId: selectedProduct.productId ?? null,
                          offerKey: offer.key,
                          offerProvider: offer.provider,
                          offerUrl: offer.url
                        });
                        window.open(offer.url, '_blank', 'noopener,noreferrer');
                      } catch (e) {
                        window.alert(e?.message ?? 'Failed to open affiliate offer');
                      }
                    }}
                  >
                    {AFFILIATE_OFFERS.insurance.label}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full py-4"
                    onClick={async () => {
                      try {
                        const offer = AFFILIATE_OFFERS.restoration;
                        await logAffiliateClick({
                          userId: user?.id ?? null,
                          twinId: selectedProduct.id,
                          productId: selectedProduct.productId ?? null,
                          offerKey: offer.key,
                          offerProvider: offer.provider,
                          offerUrl: offer.url
                        });
                        window.open(offer.url, '_blank', 'noopener,noreferrer');
                      } catch (e) {
                        window.alert(e?.message ?? 'Failed to open affiliate offer');
                      }
                    }}
                  >
                    {AFFILIATE_OFFERS.restoration.label}
                  </Button>
                </div>

                {(!selectedProduct.ownerId || selectedProduct.ownerId !== user?.id) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      className="w-full py-4"
                      onClick={async () => {
                        try {
                          const { intent } = await createSolanaPaymentIntent({ twinId: selectedProduct.id, token: 'usdc' });
                          window.alert(`Pay with Solana USDC\n\nSend: ${intent.amount} USDC\nTo: ${intent.seller_address}\nMemo/Reference: ${intent.reference}\n\nAfter payment is confirmed on-chain, ownership will transfer automatically.`);
                        } catch (e) {
                          window.alert(e?.message ?? 'Failed to create Solana payment intent');
                        }
                      }}
                    >
                      Pay USDC (Solana)
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full py-4"
                      onClick={async () => {
                        try {
                          const { intent } = await createSolanaPaymentIntent({ twinId: selectedProduct.id, token: 'usdt' });
                          window.alert(`Pay with Solana USDT\n\nSend: ${intent.amount} USDT\nTo: ${intent.seller_address}\nMemo/Reference: ${intent.reference}\n\nAfter payment is confirmed on-chain, ownership will transfer automatically.`);
                        } catch (e) {
                          window.alert(e?.message ?? 'Failed to create Solana payment intent');
                        }
                      }}
                    >
                      Pay USDT (Solana)
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddItem && <AddItemModal />}
      </AnimatePresence>

      <Navbar />
    </div>
  );
};

// --- MAIN ORCHESTRATOR ---

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const { user, authLoading, init, signOut } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [authLinkError, setAuthLinkError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    init();
    return () => clearTimeout(t);
  }, [init]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;

    const params = new URLSearchParams(hash.slice(1));
    const err = params.get('error');
    const errCode = params.get('error_code');
    const errDesc = params.get('error_description');

    if (err || errCode || errDesc) {
      const code = (errCode || err || '').trim();

      const desc = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : null;

      const translated = code ? t(`auth.link_errors.${code}`, { defaultValue: '' }) : '';

      const msg = translated || desc || t('auth.link_errors.default');
      setAuthLinkError(msg);
      setCurrentPage('login');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  if (supabaseEnvError) {
    return (
      <div className="h-screen bg-[#FDFCF8] flex items-center justify-center p-8">
        <div className="w-full max-w-xl bg-white rounded-[2.5rem] p-10 border border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Configuration</p>
          <h1 className="text-3xl font-light mt-2 text-stone-900">Missing Supabase environment variables</h1>
          <p className="text-stone-600 mt-4">{supabaseEnvError}</p>
          <div className="mt-6 text-sm text-stone-500">
            <p>Configure these on Vercel (Production + Preview):</p>
            <p className="mt-2 font-mono">VITE_SUPABASE_URL</p>
            <p className="font-mono">VITE_SUPABASE_ANON_KEY</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="h-screen bg-[#FDFCF8] flex flex-col items-center justify-center">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="bg-stone-900 w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8">
          <Leaf className="text-white w-10 h-10" />
        </motion.div>
        <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-stone-400 animate-pulse">EcoTwin 2026</span>
      </div>
    );
  }

  const handleAuth = async ({ email, password, mode, provider }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (provider) {
      if (provider === 'github') throw new Error('Provider not supported.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  };

  return (
    <AnimatePresence mode="wait">
      {!user && currentPage === 'landing' && (
        <motion.div key="l" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          <LandingPage onStart={(mode) => setCurrentPage(mode)} />
        </motion.div>
      )}
      {!user && (currentPage === 'login' || currentPage === 'signup') && (
        <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthPage 
            mode={currentPage} 
            onBack={() => setCurrentPage('landing')} 
            onAuth={handleAuth}
            onToggleMode={() => setCurrentPage(currentPage === 'login' ? 'signup' : 'login')}
            externalError={authLinkError}
          />
        </motion.div>
      )}
      {user && (
        <motion.div key="ap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AppCore onLogout={async () => {
            await signOut();
            setCurrentPage('landing');
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
