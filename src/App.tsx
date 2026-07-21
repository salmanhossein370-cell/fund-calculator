import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Delete, RefreshCw, Power, BookOpen, Cloud, CloudOff, Database, AlertCircle } from 'lucide-react';

import { ReceiptEntry } from './types';
import { extractShahriyarValue, hasShahriyarValue } from './utils/parser';
import CRTDisplay from './components/CRTDisplay';
import ReceiptList from './components/ReceiptList';
import SettingsModal from './components/SettingsModal';
import ConfirmModal from './components/ConfirmModal';
import AutomaticNotebook from './components/AutomaticNotebook';
import AuthModal from './components/AuthModal';
import LoginScreen from './components/LoginScreen';
import { triggerHaptic } from './utils/haptic';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  // --- States ---
  const [receipts, setReceipts] = useState<ReceiptEntry[]>(() => {
    const saved = localStorage.getItem('fund_calculator_receipts');
    const all = saved ? JSON.parse(saved) : [];
    return all.filter((r: any) => r.note && !r.note.startsWith('[Notebook] '));
  });

  const [notebookEntries, setNotebookEntries] = useState<ReceiptEntry[]>(() => {
    const saved = localStorage.getItem('fund_calculator_notebook_entries');
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

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);

  // Supabase Auth and Sync Status
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // References
  const noteInputRef = useRef<HTMLInputElement>(null);
  const prevUserRef = useRef<any>(null);

  // --- Effects & Supabase Sync ---
  const syncReceipts = async (currentUser = user) => {
    if (!currentUser || !isSupabaseConfigured()) return;
    setSyncing(true);
    setSyncError(null);
    const client = getSupabaseClient();
    try {
      const { data: remoteData, error } = await client
        .from('receipts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching receipts from Supabase:', error);
        setSyncError(`Avviso Cloud: ${error.message} (Codice: ${error.code || 'RLS'})`);
        return;
      }

      const remoteAll: ReceiptEntry[] = (remoteData || []).map((r: any) => ({
        id: r.id,
        type: r.type as 'plus' | 'minus',
        amount: parseFloat(r.amount) || 0,
        note: r.note || '',
        time: r.time,
        currencySymbol: r.currency_symbol || currencySymbol,
      }));

      // Split remote into calculator receipts vs notebook entries
      const remoteNotebook = remoteAll
        .filter((r) => r.note && r.note.startsWith('[Notebook] '))
        .map((r) => ({ ...r, note: r.note.substring('[Notebook] '.length) }));

      const remoteReceipts = remoteAll.filter((r) => !r.note || !r.note.startsWith('[Notebook] '));

      // Merge local unsynced entries if any
      const localReceipts = [...receipts];
      const mergedReceipts = [...remoteReceipts];
      const toUploadReceipts = localReceipts.filter((l) => !remoteReceipts.some((r) => r.id === l.id));

      if (toUploadReceipts.length > 0) {
        const insertPayload = toUploadReceipts.map((l) => ({
          id: l.id,
          user_id: currentUser.id,
          type: l.type,
          amount: l.amount,
          note: l.note,
          time: l.time,
          currency_symbol: l.currencySymbol,
        }));

        const { error: insertError } = await client.from('receipts').insert(insertPayload);
        if (insertError) {
          console.error('Error uploading local receipts:', insertError);
          setSyncError(`Errore salvataggio Cloud: ${insertError.message}`);
        } else {
          mergedReceipts.push(...toUploadReceipts);
        }
      }
      setReceipts(mergedReceipts);

      // Merge local notebook entries if any
      const localNotebook = [...notebookEntries];
      const mergedNotebook = [...remoteNotebook];
      const toUploadNotebook = localNotebook.filter((l) => !remoteNotebook.some((r) => r.id === l.id));

      if (toUploadNotebook.length > 0) {
        const insertPayload = toUploadNotebook.map((l) => ({
          id: l.id,
          user_id: currentUser.id,
          type: l.type,
          amount: l.amount,
          note: `[Notebook] ${l.note}`,
          time: l.time,
          currency_symbol: l.currencySymbol,
        }));

        const { error: insertError } = await client.from('receipts').insert(insertPayload);
        if (insertError) {
          console.error('Error uploading local notebook:', insertError);
          setSyncError(`Errore salvataggio Taccuino Cloud: ${insertError.message}`);
        } else {
          mergedNotebook.push(...toUploadNotebook);
        }
      }
      setNotebookEntries(mergedNotebook);

    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncError(`Errore di connessione Cloud: ${err.message || 'Rete non disponibile'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Realtime subscription setup
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    const client = getSupabaseClient();
    const channel = client
      .channel('public_receipts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          syncReceipts(user);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user]);

  // Auth session listener
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync receipts whenever user changes, and purge local state on explicit logout
  useEffect(() => {
    if (user) {
      syncReceipts(user);
    } else if (prevUserRef.current !== null) {
      // Clear all local states on explicit logout for absolute user data privacy
      setReceipts([]);
      setNotebookEntries([]);
      localStorage.removeItem('fund_calculator_receipts');
      localStorage.removeItem('fund_calculator_notebook_entries');
    }
    prevUserRef.current = user;
  }, [user]);

  // Save receipts to LocalStorage ONLY when NOT authenticated
  useEffect(() => {
    if (!user) {
      localStorage.setItem('fund_calculator_receipts', JSON.stringify(receipts));
    }
  }, [receipts, user]);

  // Save notebook entries to LocalStorage ONLY when NOT authenticated
  useEffect(() => {
    if (!user) {
      localStorage.setItem('fund_calculator_notebook_entries', JSON.stringify(notebookEntries));
    }
  }, [notebookEntries, user]);

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
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: currentMode,
      amount: parsed,
      note: noteText.trim(),
      time: formattedTime,
      currencySymbol: currencySymbol,
    };

    setReceipts((prev) => [...prev, newEntry]);

    // Real-time Supabase save
    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .insert({
          id: newEntry.id,
          user_id: user.id,
          type: newEntry.type,
          amount: newEntry.amount,
          note: newEntry.note,
          time: newEntry.time,
          currency_symbol: newEntry.currencySymbol,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Supabase insert error:', error);
            setSyncError(`Errore salvataggio Cloud: ${error.message}`);
          }
        });
    }
    
    // Clear display and note text
    setTypedAmount('');
    setNoteText('');
  };

  const handleRemoveEntry = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));

    // Real-time Supabase delete
    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase delete error:', error);
            setSyncError(`Errore eliminazione Cloud: ${error.message}`);
          }
        });
    }
  };

  const handleUpdateReceipt = (id: string, note: string) => {
    const hasValue = hasShahriyarValue(note);
    const amount = hasValue ? extractShahriyarValue(note) : 0;

    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, note, amount } : r))
    );

    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .update({ note, amount })
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase update error:', error);
            setSyncError(`Errore aggiornamento Cloud: ${error.message}`);
          }
        });
    }
  };

  const handleAddReceipt = (type: 'plus' | 'minus') => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry: ReceiptEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      amount: 0,
      note: '',
      time: formattedTime,
      currencySymbol,
    };

    setReceipts((prev) => [...prev, newEntry]);

    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .insert({
          id: newEntry.id,
          user_id: user.id,
          type: newEntry.type,
          amount: newEntry.amount,
          note: newEntry.note,
          time: newEntry.time,
          currency_symbol: newEntry.currencySymbol,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Supabase insert error:', error);
            setSyncError(`Errore creazione Cloud: ${error.message}`);
          }
        });
    }
  };

  // --- Notebook Specific Isolated Handlers ---
  const handleRemoveNotebook = (id: string) => {
    setNotebookEntries((prev) => prev.filter((r) => r.id !== id));

    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase notebook delete error:', error);
            setSyncError(`Errore eliminazione Taccuino: ${error.message}`);
          }
        });
    }
  };

  const handleUpdateNotebook = (id: string, note: string) => {
    const hasValue = hasShahriyarValue(note);
    const amount = hasValue ? extractShahriyarValue(note) : 0;

    setNotebookEntries((prev) =>
      prev.map((r) => (r.id === id ? { ...r, note, amount } : r))
    );

    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .update({ note: `[Notebook] ${note}`, amount })
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase notebook update error:', error);
            setSyncError(`Errore aggiornamento Taccuino: ${error.message}`);
          }
        });
    }
  };

  const handleAddNotebook = (type: 'plus' | 'minus') => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry: ReceiptEntry = {
      id: `notebook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      amount: 0,
      note: '',
      time: formattedTime,
      currencySymbol,
    };

    setNotebookEntries((prev) => [...prev, newEntry]);

    if (user && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .insert({
          id: newEntry.id,
          user_id: user.id,
          type: newEntry.type,
          amount: newEntry.amount,
          note: `[Notebook] ${newEntry.note}`,
          time: newEntry.time,
          currency_symbol: newEntry.currencySymbol,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Supabase notebook insert error:', error);
            setSyncError(`Errore creazione Taccuino: ${error.message}`);
          }
        });
    }
  };

  const handleResetSystem = () => {
    const idsToDelete = receipts.map((r) => r.id);

    setReceipts([]);
    setTypedAmount('');
    setNoteText('');
    setIsResetOpen(false);

    // Real-time Supabase reset (only delete non-notebook entries!)
    if (user && isSupabaseConfigured() && idsToDelete.length > 0) {
      const client = getSupabaseClient();
      client
        .from('receipts')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase reset error:', error);
            setSyncError(`Errore reset Cloud: ${error.message}`);
          }
        });
    }
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

  if (!user) {
    return <LoginScreen onAuthSuccess={setUser} />;
  }

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
            className="select-none"
            id="pwa-install-banner"
          >
            <div className="w-full max-w-[800px] mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
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
                    flexShrink: 0,
                  }}
                />
                <p className="text-[0.7rem] sm:text-[0.75rem] text-[#e0e0e0] font-bold uppercase tracking-tight truncate">
                  Installa FUND_CALCULATOR per l'esperienza a tutto schermo
                </p>
              </div>
              <div className="flex items-center gap-3.5 flex-shrink-0">
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
          <div className="flex items-center gap-2">
            {/* Notebook Automatico Trigger - Beautiful Terminal/Glow Style */}
            <button
              type="button"
              id="btn-notebook-trigger"
              onPointerDown={() => triggerHaptic('action')}
              onClick={() => setIsNotebookOpen(true)}
              style={{
                border: '1px solid rgba(0, 255, 136, 0.25)',
                borderRadius: '10px',
                padding: '6px 8px',
                background: 'rgba(0, 255, 136, 0.05)',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.05)',
              }}
              className="cursor-pointer text-[#00ff88] hover:text-[#00ff66] hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10 transition-all flex items-center justify-center gap-1 relative"
              title="Apri Notebook Automatico"
            >
              <BookOpen size={17} className="animate-pulse" />
              <span className="text-[0.65rem] font-bold font-mono tracking-wider hidden sm:inline">NOTEBOOK</span>
              {notebookEntries.some(r => r.note && r.note.toLowerCase().includes('(shahriyar')) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff88] rounded-full animate-ping shadow-[0_0_8px_#00ff88]" />
              )}
            </button>

            {/* Cloud Sync Auth Trigger */}
            <button
              type="button"
              id="btn-auth-trigger"
              onPointerDown={() => triggerHaptic('action')}
              onClick={() => setIsAuthOpen(true)}
              className={`cursor-pointer transition-colors p-1.5 flex items-center justify-center relative ${
                user ? 'text-[#00ff88] drop-shadow-[0_0_4px_rgba(0,255,136,0.4)]' : 'text-[#4a4d52] hover:text-white'
              }`}
              title={user ? `Sincronizzato come ${user.email}` : 'Accedi o configura Cloud Sync'}
            >
              {user ? <Cloud size={16} /> : <CloudOff size={16} />}
            </button>

            {/* Settings Trigger */}
            <button
              type="button"
              id="btn-settings-trigger"
              onPointerDown={() => triggerHaptic('action')}
              onClick={() => {
                setIsSettingsOpen(true);
              }}
              className="cursor-pointer text-[#4a4d52] hover:text-white transition-colors p-1.5 flex items-center justify-center text-[1.1rem]"
              title="Open Settings"
            >
              ⚙
            </button>
          </div>
        </header>

        {/* CLOUD SYNC ERROR / PERMISSION ALERT BANNER */}
        <AnimatePresence>
          {syncError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="my-1 p-2 bg-[#281010] border border-[#ff3366]/40 rounded-xl flex items-center justify-between text-[0.65rem] text-[#ff6688] font-mono select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <AlertCircle size={14} className="flex-shrink-0 text-[#ff3366]" />
                <span className="truncate">{syncError}</span>
              </div>
              <button
                onClick={() => setSyncError(null)}
                className="text-xs text-slate-400 hover:text-white px-1.5 cursor-pointer"
                title="Chiudi avviso"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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

      {/* --- Notebook Automatico Panel --- */}
      <AutomaticNotebook
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        receipts={notebookEntries}
        currencySymbol={currencySymbol}
        onUpdateReceipt={handleUpdateNotebook}
        onAddReceipt={handleAddNotebook}
        onRemoveReceipt={handleRemoveNotebook}
      />

      {/* --- Auth & Cloud Sync Modal --- */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthChange={(u) => setUser(u)}
        onSyncRequest={() => syncReceipts(user)}
        syncing={syncing}
      />
    </div>
  );
}
