import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Lock, LogIn, UserPlus, LogOut, Check, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { triggerHaptic } from '../utils/haptic';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange: (user: any) => void;
  onSyncRequest: () => void;
  syncing: boolean;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthChange,
  onSyncRequest,
  syncing,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'config'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom Supabase Keys (fallback)
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('supabase_temp_url') || '');
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('supabase_temp_key') || '');
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    // Get current session
    const client = getSupabaseClient();
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      onAuthChange(session?.user ?? null);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      onAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('action');
    if (!isConfigured) {
      setErrorMsg('Supabase non configurato. Configura i parametri nel tab "DB CONFIG".');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const client = getSupabaseClient();

    try {
      if (activeTab === 'login') {
        const { error, data } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Accesso effettuato con successo!');
        setTimeout(() => onClose(), 1500);
      } else {
        const { error, data } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setSuccessMsg('Registrazione avvenuta! Controlla la mail per confermare (se richiesto).');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    triggerHaptic('action');
    if (!isConfigured) {
      setErrorMsg('Supabase non configurato. Configura i parametri nel tab "DB CONFIG".');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    
    const client = getSupabaseClient();

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href, // Redirect back to the exact app url
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Errore durante l'accesso con Google");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    triggerHaptic('reset');
    setLoading(true);
    const client = getSupabaseClient();
    try {
      await client.auth.signOut();
      setSuccessMsg('Disconnesso correttamente.');
      setUser(null);
      onAuthChange(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    triggerHaptic('action');
    if (customUrl.trim() && customKey.trim()) {
      localStorage.setItem('supabase_temp_url', customUrl.trim());
      localStorage.setItem('supabase_temp_key', customKey.trim());
      setIsConfigured(true);
      setSuccessMsg('Configurazione database salvata con successo!');
      setErrorMsg(null);
      setActiveTab('login');
      // Force reload of page or client connection trigger
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setErrorMsg('Entrambi i campi URL e Anon Key sono richiesti.');
    }
  };

  const handleClearConfig = () => {
    triggerHaptic('reset');
    localStorage.removeItem('supabase_temp_url');
    localStorage.removeItem('supabase_temp_key');
    setCustomUrl('');
    setCustomKey('');
    setIsConfigured(isSupabaseConfigured());
    setSuccessMsg('Configurazione ripristinata ai valori predefiniti.');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#000000]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#0c0d0e',
            border: '1px solid #1f2226',
            width: '100%',
            maxWidth: '380px',
            borderRadius: '20px',
            fontFamily: "'Share Tech Mono', monospace",
          }}
          className="flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1f2226] p-4">
            <div className="flex items-center gap-2">
              <Shield className="text-[#00ff88] w-5 h-5" />
              <span className="text-white text-sm font-bold tracking-widest uppercase">
                CLOUD SYNC & AUTH
              </span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('action');
                onClose();
              }}
              className="text-[#888] hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              ✕
            </button>
          </div>

          {/* User state summary if logged in */}
          {user && (
            <div className="p-4 bg-[#091710] border-b border-[#00ff88]/20 flex flex-col gap-2 relative">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%)',
                  backgroundSize: '100% 3px',
                }}
              />
              <div className="relative z-10 flex flex-col gap-1 text-center">
                <span className="text-[0.6rem] text-[#1b5e3a] uppercase tracking-wider">UTENTE CONNESSO</span>
                <span className="text-sm text-white font-bold truncate">{user.email}</span>
                <span className="text-[0.55rem] text-[#00ff66]/70 mt-1 uppercase">Sincronizzazione in tempo reale attiva</span>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onSyncRequest}
                    disabled={syncing}
                    className="flex-1 py-1.5 bg-[#050d09] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff66] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'SINCRONIZZAZIONE...' : 'SINCRONIZZA ORA'}
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="py-1.5 px-3 bg-[#1a0a0d] border border-[#ff3b5c]/30 hover:border-[#ff3b5c] text-[#ff3b5c] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <LogOut size={12} />
                    ESCI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Selection (only if not logged in) */}
          {!user && (
            <div className="flex bg-[#111214] p-1 border-b border-[#1f2226]">
              <button
                onClick={() => {
                  triggerHaptic('action');
                  setActiveTab('login');
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#17181b] text-[#00ff88] border border-[#00ff88]/20'
                    : 'text-[#4a4d52] hover:text-[#888]'
                }`}
              >
                ACCEDI
              </button>
              <button
                onClick={() => {
                  triggerHaptic('action');
                  setActiveTab('register');
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-[#17181b] text-[#00ff88] border border-[#00ff88]/20'
                    : 'text-[#4a4d52] hover:text-[#888]'
                }`}
              >
                REGISTRATI
              </button>
              <button
                onClick={() => {
                  triggerHaptic('action');
                  setActiveTab('config');
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'config'
                    ? 'bg-[#17181b] text-[#ffd700] border border-[#ffd700]/20'
                    : 'text-[#4a4d52] hover:text-[#888]'
                }`}
              >
                <Database size={10} />
                DB CONFIG
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          <div className="px-4 pt-4">
            {errorMsg && (
              <div className="bg-[#1a0a0d] border border-[#ff3b5c]/30 text-[#ff3b5c] text-xs p-3 rounded-lg flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-[#091710] border border-[#00ff88]/30 text-[#00ff66] text-xs p-3 rounded-lg flex items-start gap-2">
                <Check size={14} className="mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{successMsg}</span>
              </div>
            )}
          </div>

          {/* Main forms container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!user && activeTab !== 'config' && (
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[0.65rem] text-[#4a4d52] uppercase tracking-wider block">Indirizzo Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-2.5 text-[#4a4d52]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="utente@esempio.com"
                      className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#00ff88]/40 focus:outline-none rounded-lg py-2 pl-9 pr-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] text-[#4a4d52] uppercase tracking-wider block">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-2.5 text-[#4a4d52]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#00ff88]/40 focus:outline-none rounded-lg py-2 pl-9 pr-3 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#00ff88] hover:bg-[#00e676] text-[#0c0d0e] font-bold text-xs uppercase rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(0,255,136,0.2)] disabled:opacity-50"
                >
                  {activeTab === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                  {loading ? 'ELABORAZIONE...' : activeTab === 'login' ? 'ACCEDI ORA' : 'REGISTRATI'}
                </button>

                <div className="relative my-4 flex py-1 items-center">
                  <div className="flex-grow border-t border-[#1f2226]"></div>
                  <span className="flex-shrink mx-3 text-[0.6rem] text-[#4a4d52] uppercase">Oppure continua con</span>
                  <div className="flex-grow border-t border-[#1f2226]"></div>
                </div>

                {/* Google Sign-in button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2 bg-[#111214] border border-[#2d3139] hover:bg-[#1a1c20] text-white font-bold text-xs uppercase rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google OAuth
                </button>
              </form>
            )}

            {!user && activeTab === 'config' && (
              <div className="space-y-4">
                <div className="bg-[#17181b] border border-[#ffd700]/20 p-3 rounded-lg text-xs leading-relaxed text-[#8a8d93]">
                  💡 <span className="text-white">Terminale di Connessione</span>: Se desideri sincronizzare i dati sul tuo database personale Supabase, inserisci le credenziali qui sotto. Di default, userà quelle di sistema se presenti.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] text-[#ffd700] uppercase tracking-wider block">Supabase Project URL</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#ffd700]/40 focus:outline-none rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] text-[#ffd700] uppercase tracking-wider block">Supabase Anon Key</label>
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#ffd700]/40 focus:outline-none rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="flex-1 py-2 bg-[#ffd700] hover:bg-[#ffb700] text-[#0c0d0e] font-bold text-xs uppercase rounded-lg cursor-pointer transition-all"
                  >
                    SALVA CONFIG
                  </button>
                  <button
                    type="button"
                    onClick={handleClearConfig}
                    className="py-2 px-3 bg-[#1a0a0d] border border-[#ff3b5c]/30 hover:border-[#ff3b5c] text-[#ff3b5c] font-bold text-xs uppercase rounded-lg cursor-pointer transition-all"
                  >
                    RESET PREDEFINITI
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table Schema Instruction Help */}
          <div className="p-4 bg-[#111214] border-t border-[#1f2226] text-[0.55rem] text-[#4a4d52] select-text">
            <span className="font-bold text-[#e0e0e0] block uppercase mb-1">SQL TABLE CREATION SCHEMA:</span>
            <pre className="overflow-x-auto p-1 bg-black/40 rounded border border-[#1f2226] text-left leading-normal font-mono select-all">
{`create table receipts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  amount numeric not null,
  note text,
  time text not null,
  currency_symbol text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`}
            </pre>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
