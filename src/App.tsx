import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Delete, RefreshCw, Power } from 'lucide-react';

import { ReceiptEntry } from './types';
import CRTDisplay from './components/CRTDisplay';
import ReceiptList from './components/ReceiptList';
import SettingsModal from './components/SettingsModal';
import ConfirmModal from './components/ConfirmModal';
import { triggerHaptic } from './utils/haptic';

export default function App() {
  // --- States ---
  const [receipts, setReceipts] = useState<ReceiptEntry[]>(() => {
    const saved = localStorage.getItem('fund_calculator_receipts');
    return saved ? JSON.parse(saved) : [];
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    const saved = localStorage.getItem('fund_calculator_currency');
    return saved ? saved : '€';
  });

  const [typedAmount, setTypedAmount] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'plus' | 'minus'>('plus');

  // PWA Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  // References
  const noteInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  // Save receipts to LocalStorage
  useEffect(() => {
    localStorage.setItem('fund_calculator_receipts', JSON.stringify(receipts));
  }, [receipts]);

  // Save currency to LocalStorage
  useEffect(() => {
    localStorage.setItem('fund_calculator_currency', currencySymbol);
  }, [currencySymbol]);

  // PWA installation prompt listener
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // If already standalone, do not listen or show
    if (isStandalone) {
      setShowInstallBanner(false);
      return;
    }

    // Intercept default prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle Physical Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If user is typing a note, do not intercept numeric keypresses
      if (document.activeElement === noteInputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEnterPress();
          noteInputRef.current?.blur();
        }
        return;
      }

      // 2. Prevent default browser behavior for standard backspace and clear hotkeys when app is focused
      if (
        ['Backspace', 'Enter', 'Escape', '+', '-'].includes(e.key) ||
        (e.key >= '0' && e.key <= '9') ||
        e.key === '.' ||
        e.key === ','
      ) {
        // Only prevent if we aren't focused on standard form elements
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
        }
      }

      // 3. Match keys
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleDotPress();
      } else if (e.key === 'Backspace') {
        handleBackspacePress();
      } else if (e.key === 'Enter') {
        handleEnterPress();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClearPress();
      } else if (e.key === '+') {
        setCurrentMode('plus');
      } else if (e.key === '-') {
        setCurrentMode('minus');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [typedAmount, currentMode, noteText, currencySymbol, receipts]);

  // --- Keyboard Functions ---
  const handleDigitPress = (digit: string) => {
    setTypedAmount((prev) => {
      // Check decimal place restriction (limit to 2 decimal places)
      if (prev.includes('.')) {
        const [, decimals] = prev.split('.');
        if (decimals && decimals.length >= 2) {
          return prev; // ignore further digits
        }
      }

      // Avoid double zeros at the beginning
      if (prev === '0' && digit === '0') {
        return prev;
      }

      // If prev is exactly "0" and a non-zero digit is pressed, replace it
      if (prev === '0' && digit !== '0') {
        return digit;
      }

      return prev + digit;
    });
  };

  const handleDotPress = () => {
    setTypedAmount((prev) => {
      if (prev === '') {
        return '0.';
      }
      if (prev.includes('.')) {
        return prev; // dot already exists
      }
      return prev + '.';
    });
  };

  const handleBackspacePress = () => {
    setTypedAmount((prev) => {
      if (prev.length <= 1) {
        return '';
      }
      return prev.slice(0, -1);
    });
  };

  const handleClearPress = () => {
    setTypedAmount('');
  };

  const handleEnterPress = () => {
    const parsed = parseFloat(typedAmount);
    if (isNaN(parsed) || parsed <= 0) {
      triggerHaptic('reset'); // distinct feedback pattern for invalid press
      return;
    }

    // Get current local time format HH:MM
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry: ReceiptEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: currentMode,
      amount: parsed,
      note: noteText.trim(),
      time: formattedTime,
      currencySymbol: currencySymbol,
    };

    setReceipts((prev) => [...prev, newEntry]);
    
    // Clear display and note text
    setTypedAmount('');
    setNoteText('');
  };

  const handleRemoveEntry = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetSystem = () => {
    setReceipts([]);
    setTypedAmount('');
    setNoteText('');
    setIsResetOpen(false);
  };

  const handleSelectCurrencySymbol = (symbol: string) => {
    setCurrencySymbol(symbol);
    // Optionally update all historical entries to make them look uniform,
    // or keep them as is. Let's update all historical receipt symbols to match the selected currency symbol!
    // This looks incredibly polished and clean.
    setReceipts((prev) =>
      prev.map((r) => ({ ...r, currencySymbol: symbol }))
    );
  };

  // --- PWA Installation Functions ---
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA user install choice: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (err) {
      console.error("Error triggering PWA prompt:", err);
    }
  };

  const handleCloseBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const isEnterActive = typedAmount.length > 0 && parseFloat(typedAmount) > 0;

  return (
    <div className="h-[100dvh] w-screen bg-[#0c0d0e] text-[#e0e0e0] flex flex-col items-center justify-center overflow-hidden selection:bg-[#00FF66]/30 selection:text-[#00FF66]" id="app-main-viewport">
      {/* PWA PREMIUM FLOATING TOP BANNER */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              zIndex: 9999,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              backgroundColor: 'rgba(12, 13, 14, 0.85)',
              borderBottom: '1px solid #00ff88',
              padding: '10px 16px',
              fontFamily: "'Share Tech Mono', monospace",
            }}
            className="flex items-center justify-between select-none"
            id="pwa-install-banner"
          >
            <div className="flex items-center gap-3">
              <img
                src="/icon.png"
                alt="App Icon"
                referrerPolicy="no-referrer"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                }}
              />
              <p className="text-[0.7rem] sm:text-[0.75rem] text-[#e0e0e0] font-bold uppercase tracking-tight">
                Installa FUND_CALCULATOR per l'esperienza a tutto schermo
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onPointerDown={() => triggerHaptic('action')}
                onClick={() => {
                  handleInstallClick();
                }}
                style={{
                  background: '#00ff88',
                  color: '#0c0d0e',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  border: 'none',
                  boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
                }}
                className="cursor-pointer uppercase hover:scale-105 active:scale-95 transition-all"
              >
                INSTALLA
              </button>
              <button
                type="button"
                onPointerDown={() => triggerHaptic('action')}
                onClick={() => {
                  handleCloseBanner();
                }}
                style={{ color: '#888', fontSize: '0.95rem', background: 'none', border: 'none' }}
                className="cursor-pointer p-1 hover:text-white transition-colors"
                title="Chiudi"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container: exactly matching the maximum width, padding, flex-col, and space-between */}
      <main className="w-full max-w-[420px] h-[100dvh] p-[10px] px-[14px] flex flex-col justify-between overflow-hidden" id="device-shell">

        {/* HEADER */}
        <header className="flex justify-between items-start select-none" id="device-header">
          <div>
            <h1 className="text-[1.1rem] font-bold tracking-[1.5px] text-white uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              FUND_CALCULATOR
            </h1>
            <p className="text-[0.65rem] text-[#4a4d52] tracking-[1px] mt-[2px] uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              MADE BY WEALINK
            </p>
          </div>
          <button
            type="button"
            id="btn-settings-trigger"
            onPointerDown={() => triggerHaptic('action')}
            onClick={() => {
              setIsSettingsOpen(true);
            }}
            style={{ color: '#4a4d52', fontSize: '1.1rem' }}
            className="cursor-pointer hover:text-white transition-colors p-1"
            title="Open Settings"
          >
            ⚙
          </button>
        </header>

        {/* CRT DISPLAY PANEL */}
        <section className="my-1.5" id="display-section">
          <CRTDisplay currencySymbol={currencySymbol} receipts={receipts} />
        </section>

        {/* INPUT DISPLAY (AMOUNT BOX) */}
        <section
          style={{
            background: '#111214',
            borderRadius: '12px',
            padding: '8px 14px',
            height: '70px',
            border: '1px solid #222428',
          }}
          className="flex flex-col justify-between select-none mb-1.5"
          id="amount-editor-panel"
        >
          <div className="flex justify-between items-start text-[0.6rem] text-[#4a4d52]">
            {/* Top-Left Mode Label */}
            <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {currentMode === 'plus' ? 'ADD TO FUND' : 'SPEND FROM FUND'}
            </span>
            
            {/* Top-Right Label */}
            <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              AMOUNT
            </span>
          </div>

          {/* Large Digit Amount Display with custom Slashed Zero look */}
          <div
            className="text-right flex items-baseline justify-end font-bold text-[#ffffff] text-[1.6rem] leading-none select-none my-[1px] overflow-hidden"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {typedAmount ? (
              <>
                <span className="text-[1.1rem] mr-1 select-none" style={{ color: '#4a4d52' }}>{currencySymbol}</span>
                <span>{typedAmount}</span>
              </>
            ) : (
              <>
                <span className="text-[1.1rem] mr-1 select-none" style={{ color: '#4a4d52' }}>{currencySymbol}</span>
                <span className="select-none text-[#ffffff]/30" style={{ fontVariantNumeric: 'slashed-zero' }}>
                  0
                </span>
              </>
            )}
          </div>

          {/* Note input matches precisely the lowercase right side placement */}
          <div className="flex items-center justify-end h-[14px]">
            <input
              ref={noteInputRef}
              type="text"
              id="input-transaction-note"
              placeholder="note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={40}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                color: '#33363a',
                fontSize: '0.65rem',
              }}
              className="w-full bg-transparent border-none text-right placeholder-[#33363a]/60 focus:outline-none focus:ring-0 p-0 italic"
            />
          </div>
        </section>

        {/* TOGGLE MODE BUTTONS */}
        <section className="flex gap-[10px] mb-1.5" id="mode-selector-section">
          {/* +FUND Button */}
          <button
            type="button"
            id="btnPlus"
            onPointerDown={() => triggerHaptic('action')}
            onClick={() => {
              setCurrentMode('plus');
            }}
            style={{
              fontFamily: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              borderRadius: '20px',
              padding: '10px 0',
              backgroundColor: currentMode === 'plus' ? '#00ff66' : '#0a1c12',
              color: currentMode === 'plus' ? '#050d09' : '#00ff6640',
              boxShadow: currentMode === 'plus' ? '0 0 15px rgba(0, 255, 102, 0.6)' : 'none',
              border: currentMode === 'plus' ? '1px solid #00ff66' : '1px solid #00ff6615',
              transition: 'all 0.2s',
            }}
            className="flex-1 cursor-pointer"
          >
            +FUND
          </button>

          {/* -FUND Button */}
          <button
            type="button"
            id="btnMinus"
            onPointerDown={() => triggerHaptic('action')}
            onClick={() => {
              setCurrentMode('minus');
            }}
            style={{
              fontFamily: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              borderRadius: '20px',
              padding: '10px 0',
              backgroundColor: currentMode === 'minus' ? '#ff3b5c' : '#1a0a0d',
              color: currentMode === 'minus' ? '#0d0506' : '#ff3b5c40',
              boxShadow: currentMode === 'minus' ? '0 0 15px rgba(255, 59, 92, 0.6)' : 'none',
              border: currentMode === 'minus' ? '1px solid #ff3b5c' : '1px solid #ff3b5c15',
              transition: 'all 0.2s',
            }}
            className="flex-1 cursor-pointer"
          >
            -FUND
          </button>
        </section>

        {/* Receipt Stream Section */}
        <section className="flex-1 flex flex-col min-h-[80px] mb-1.5" id="receipt-section">
          <ReceiptList receipts={receipts} onRemoveEntry={handleRemoveEntry} />
        </section>

        {/* Numeric Keypad Panel */}
        <section className="grid grid-cols-3 gap-[6px] mb-1.5" id="keypad-section">
          {/* Row 1 */}
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('7')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            7
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('8')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            8
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('9')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            9
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('4')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            4
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('5')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            5
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('6')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            6
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('1')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            1
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('2')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            2
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('3')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            3
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={handleDotPress}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            .
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('key')}
            onClick={() => handleDigitPress('0')}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            0
          </button>
          <button
            type="button"
            onPointerDown={() => triggerHaptic('reset')}
            onClick={handleBackspacePress}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
            title="Backspace"
          >
            ⌫
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onPointerDown={() => triggerHaptic('reset')}
            onClick={handleClearPress}
            style={{
              background: '#17181b',
              borderRadius: '12px',
              color: '#8a8d93',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              padding: '12px 0',
            }}
            className="border-none cursor-pointer flex items-center justify-center transition-colors active:bg-[#222428]"
          >
            CLR
          </button>
          
          <button
            type="button"
            onPointerDown={() => {
              if (isEnterActive) {
                triggerHaptic('action');
              }
            }}
            onClick={handleEnterPress}
            style={{
              gridColumn: 'span 2',
              background: isEnterActive ? '#0b3a23' : '#0b3a23',
              color: '#00ff66',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              padding: '12px 0',
              borderRadius: '12px',
              opacity: isEnterActive ? 1 : 0.4,
            }}
            disabled={!isEnterActive}
            className="border-none cursor-pointer flex items-center justify-center transition-all active:bg-[#0f5a36] disabled:cursor-not-allowed"
          >
            ENTER
          </button>
        </section>

        {/* RESET */}
        <footer className="text-center pt-1 select-none flex flex-col items-center justify-center" id="device-footer">
          <div
            style={{
              fontSize: '0.5rem',
              color: '#33363a',
              marginBottom: '2px',
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >
            RESET
          </div>
          <button
            type="button"
            id="btn-reset-trigger"
            onPointerDown={() => triggerHaptic('reset')}
            onClick={handleResetSystem}
            style={{
              width: '40px',
              height: '14px',
              background: '#ff0044',
              borderRadius: '10px',
              boxShadow: '0 0 8px rgba(255, 0, 68, 0.6)',
            }}
            className="border-none cursor-pointer block mx-auto active:scale-95 transition-transform"
            title="Factory System Reset"
          />
        </footer>

      </main>

      {/* --- Settings Modal --- */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentCurrencySymbol={currencySymbol}
        onSelectCurrencySymbol={handleSelectCurrencySymbol}
      />

      {/* --- Reset Confirmation Modal --- */}
      <ConfirmModal
        isOpen={isResetOpen}
        onConfirm={handleResetSystem}
        onCancel={() => setIsResetOpen(false)}
      />
    </div>
  );
}
