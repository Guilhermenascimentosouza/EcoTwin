import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { Leaf, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ScanOverlay({ onCancel, validateDpp }) {
  const { t } = useTranslation();
  const [scanError, setScanError] = useState(null);
  const lastDppRef = useRef(null);

  useEffect(() => {
    let scanner;
    let cancelled = false;

    const start = async () => {
      setScanError(null);
      try {
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          async (decodedText) => {
            if (cancelled) return;
            const dppId = String(decodedText || '').trim();
            if (!dppId || dppId === lastDppRef.current) return;
            lastDppRef.current = dppId;
            try {
              await validateDpp.mutateAsync({ dppId });
            } catch (e) {
              setScanError(e?.message ?? 'Validation failed');
            }
          },
          () => {}
        );
      } catch (e) {
        setScanError(e?.message ?? 'Unable to start camera scanner');
      }
    };

    start();

    return () => {
      cancelled = true;
      try {
        scanner?.clear();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <motion.div key="sc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-stone-900 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-[3rem] bg-white/5 border border-white/10 overflow-hidden relative">
        <div id="qr-reader" className="p-4" />
        <button type="button" aria-label={t('common.close')} onClick={onCancel} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition-all"><X /></button>
      </div>

      <p className="text-white mt-10 text-xl font-light">{t('scan.title')}</p>
      {validateDpp.isPending && <p className="text-white/70 mt-2 text-sm">{t('scan.validating')}</p>}

      {validateDpp.data && (
        <div className="mt-6 w-full max-w-sm bg-white/10 border border-white/10 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t('scan.authenticated')}</p>
          <p className="text-lg font-medium mt-1">{validateDpp.data.name}</p>
          <p className="text-white/70 text-sm">{validateDpp.data.brand?.name}</p>
          <p className="text-white/60 text-xs mt-3">{validateDpp.data.dpp_id}</p>
          <div className="mt-4 inline-flex items-center text-green-300 text-xs font-bold uppercase tracking-widest">
            <Leaf className="w-4 h-4 mr-2" /> {t('scan.verified')}
          </div>
        </div>
      )}

      {scanError && (
        <div className="mt-6 w-full max-w-sm bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-200">
          {scanError}
        </div>
      )}

      <button type="button" onClick={onCancel} className="mt-10 px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 bg-transparent text-white border border-white/20 hover:border-white/40">
        {t('common.cancel')}
      </button>
    </motion.div>
  );
}
