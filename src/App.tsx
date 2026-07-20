import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Delete, RefreshCw, Power } from 'lucide-react';

import { ReceiptEntry } from './types';
import CRTDisplay from './components/CRTDisplay';
import ReceiptList from './components/ReceiptList';
import SettingsModal from './components/SettingsModal';
import ConfirmModal from './components/ConfirmModal';

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
  const [isPreparingInstall, setIsPreparingInstall] = useState<boolean>(false);

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
    // Intercept default prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      if (!dismissed && !isStandalone) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Dynamic display mode check
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setShowInstallBanner(false);
    } else {
      // Show on mobile devices to nudge users (or iOS Safari custom alert)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (isMobile && !dismissed) {
        setShowInstallBanner(true);
      }
    }

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
      // Show simple visual vibration/vibe but do not add empty numbers
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
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA user install choice: ${outcome}`);
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Error triggering PWA prompt:", err);
      }
    } else if (isIOS) {
      // Custom instructions for iOS Safari
      alert(
        "Per installare FUND_CALCULATOR sul tuo iPhone/iPad:\n\n1. Tocca il pulsante Condividi in basso su Safari (icona quadrata con freccia in su).\n2. Scorri l'elenco delle opzioni e seleziona 'Aggiungi alla schermata Home'.\n3. Conferma toccando 'Aggiungi' in alto a destra."
      );
    } else {
      // It's Android or other browser, but deferredPrompt is not ready yet
      setIsPreparingInstall(true);
      
      // Simulate/wait for PWA preparation check
      setTimeout(() => {
        setIsPreparingInstall(false);
        alert(
          "Preparazione installazione in corso...\n\nSe il pop-up nativo non appare automaticamente, puoi installare FUND_CALCULATOR in qualsiasi momento dal menu di Chrome: tocca i tre puntini (⋮) in alto a destra e seleziona 'Installa applicazione' o 'Aggiungi a schermata Home'."
        );
      }, 2000);
    }
  };

  const handleCloseBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const isEnterActive = typedAmount.length > 0 && parseFloat(typedAmount) > 0;

  return (
    <div className="h-[100dvh] w-screen bg-[#0c0d0e] text-[#e0e0e0] flex flex-col items-center justify-center overflow-hidden selection:bg-[#00FF66]/30 selection:text-[#00FF66]" id="app-main-viewport">
      {/* Main Container: exactly matching the maximum width, padding, flex-col, and space-between */}
      <main className="w-full max-w-[420px] h-[100dvh] p-[10px] px-[14px] flex flex-col justify-between overflow-hidden" id="device-shell">
        
        {/* PWA INSTALL BANNER */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 10 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden w-full"
              id="pwa-install-banner"
            >
              <div
                className="flex items-center justify-between border border-[#2a2c30] p-2.5 rounded-[12px] bg-[#111214] select-none text-left"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                <div className="flex-1 pr-2">
                  <p className="text-[0.65rem] text-[#e0e0e0] leading-normal uppercase font-bold">
                    {isPreparingInstall 
                      ? "Verifica e preparazione dei requisiti di installazione..." 
                      : "Installa FUND_CALCULATOR sul telefono per l'esperienza a tutto schermo"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPreparingInstall}
                    onClick={handleInstallClick}
                    style={{
                      background: isPreparingInstall ? '#1a1c1e' : '#0b3a23',
                      color: isPreparingInstall ? '#6b7280' : '#00ff66',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      opacity: isPreparingInstall ? 0.6 : 1,
                    }}
                    className="cursor-pointer border-none uppercase hover:bg-[#0f5a36] transition-colors active:scale-95 disabled:pointer-events-none"
                  >
                    {isPreparingInstall ? "ATTENDI..." : "INSTALLA"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseBanner}
                    style={{ color: '#4a4d52', fontSize: '0.85rem' }}
                    className="cursor-pointer border-none p-1 hover:text-white transition-colors"
                    title="Chiudi"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            onClick={() => setIsSettingsOpen(true)}
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
            onClick={() => setCurrentMode('plus')}
            style={{
              fontFamily: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              borderRadius: '20px',
              padding: '10px 0',
              backgroundColor: currentMode === 'plus' ? '#0f5a36' : '#0d4227',
              color: '#00ff66',
              boxShadow: currentMode === 'plus' ? '0 0 10px rgba(0, 255, 102, 0.2)' : 'none',
              transition: 'all 0.2s',
            }}
            className="flex-1 border-none cursor-pointer"
          >
            +FUND
          </button>

          {/* -FUND Button */}
          <button
            type="button"
            id="btnMinus"
            onClick={() => setCurrentMode('minus')}
            style={{
              fontFamily: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              borderRadius: '20px',
              padding: '10px 0',
              backgroundColor: currentMode === 'minus' ? '#581222' : '#3d0e19',
              color: '#ff3b5c',
              boxShadow: currentMode === 'minus' ? '0 0 10px rgba(255, 59, 92, 0.2)' : 'none',
              transition: 'all 0.2s',
            }}
            className="flex-1 border-none cursor-pointer"
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
            onClick={() => setIsResetOpen(true)}
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
