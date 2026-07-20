import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import { Currency, PRESET_CURRENCIES } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrencySymbol: string;
  onSelectCurrencySymbol: (symbol: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentCurrencySymbol,
  onSelectCurrencySymbol,
}: SettingsModalProps) {
  const [customSymbol, setCustomSymbol] = useState('');

  // Find if current symbol is one of the presets
  const activePreset = PRESET_CURRENCIES.find(
    (c) => c.symbol === currentCurrencySymbol
  );

  useEffect(() => {
    if (isOpen) {
      setCustomSymbol('');
    }
  }, [isOpen]);

  const handleApplyCustom = (e: FormEvent) => {
    e.preventDefault();
    if (customSymbol.trim()) {
      onSelectCurrencySymbol(customSymbol.trim());
      setCustomSymbol('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            id="settings-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            className="relative w-full max-w-[345px] overflow-hidden rounded-[20px] border border-[#161619] bg-[#0C0C0E] p-5 z-10 shadow-[0_20px_40px_rgba(0,0,0,0.95)]"
            id="settings-modal-box"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between pb-3 select-none">
              <div className="flex items-center gap-2 text-white">
                <Settings size={15} className="text-[#555a60] animate-spin-slow" />
                <span className="font-mono text-xs font-black tracking-[0.25em] text-white">
                  SETTINGS
                </span>
              </div>
              <button
                type="button"
                id="btn-close-settings-x"
                onClick={onClose}
                className="text-[#555a60] hover:text-white transition-colors cursor-pointer p-0.5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Currency Grid Section */}
            <div className="mb-5 select-none">
              <h4 className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.2em] text-[#555a60] uppercase">
                CURRENCY SYMBOL
              </h4>
              <div className="grid grid-cols-5 gap-2" id="currency-presets-grid">
                {PRESET_CURRENCIES.map((currency) => {
                  const isSelected = currentCurrencySymbol === currency.symbol;
                  return (
                    <button
                      type="button"
                      key={currency.id}
                      id={`btn-currency-${currency.id}`}
                      onClick={() => onSelectCurrencySymbol(currency.symbol)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-[#00FF66] bg-[#0E1F15] text-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.15)] font-bold'
                          : 'border border-[#232429]/40 bg-[#1A1B1E] text-[#555a60] hover:bg-[#232428] hover:text-white'
                      }`}
                    >
                      <span className="font-mono text-sm font-semibold">{currency.symbol}</span>
                      <span className="mt-0.5 font-mono text-[7px] text-[#555a60] tracking-wider uppercase font-bold">
                        {currency.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Symbol Input Section */}
            <div className="mb-6">
              <h4 className="mb-2 font-mono text-[9px] font-bold tracking-[0.2em] text-[#555a60] uppercase select-none">
                CUSTOM SYMBOL
              </h4>
              <form onSubmit={handleApplyCustom} className="flex gap-2" id="custom-symbol-form">
                <div className="relative flex-1">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-[10px] text-[#555a60] italic select-none">
                    current: {currentCurrencySymbol}
                  </span>
                  <input
                    type="text"
                    id="input-custom-currency"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    maxLength={5}
                    className="w-full rounded-xl border border-[#232429]/40 bg-[#1A1B1E] py-2.5 pr-3 pl-20 text-right font-mono text-xs text-white placeholder-neutral-700 focus:border-[#00FF66]/30 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  id="btn-apply-custom-symbol"
                  disabled={!customSymbol.trim()}
                  className={`rounded-xl px-4 font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                    customSymbol.trim()
                      ? 'bg-[#00FF66] text-black shadow-[0_0_12px_rgba(0,255,102,0.3)] hover:bg-[#00E55C] active:scale-95'
                      : 'bg-[#0E1F15] text-[#00FF66]/20 border border-[#00FF66]/5 cursor-not-allowed'
                  }`}
                >
                  APPLY
                </button>
              </form>
            </div>

            {/* Close Button at bottom */}
            <div className="text-center">
              <button
                type="button"
                id="btn-close-settings-bottom"
                onClick={onClose}
                className="w-full py-2 font-mono text-[10px] font-bold tracking-[0.25em] text-[#555a60] uppercase hover:text-white transition-colors cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
