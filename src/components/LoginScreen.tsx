import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, Shield, Database, AlertCircle, Check } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { triggerHaptic } from '../utils/haptic';

interface LoginScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Database custom configuration popup inside login for developer accessibility
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('supabase_temp_url') || '');
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('supabase_temp_key') || '');
  const isConfigured = isSupabaseConfigured();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('action');

    if (!isConfigured) {
      setErrorMsg('Database Supabase non configurato. Clicca sull\'icona del database in basso per configurarlo.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const client = getSupabaseClient();

    try {
      if (activeTab === 'login') {
        const { error, data } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setSuccessMsg('Accesso eseguito con successo!');
        if (data.user) {
          setTimeout(() => {
            onAuthSuccess(data.user);
          }, 1000);
        }
      } else {
        const { error, data } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setSuccessMsg('Registrazione completata! Controlla la tua email per confermare.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    triggerHaptic('action');
    if (!isConfigured) {
      setErrorMsg('Database Supabase non configurato.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const client = getSupabaseClient();

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Errore con Google OAuth");
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    triggerHaptic('action');
    if (customUrl.trim() && customKey.trim()) {
      localStorage.setItem('supabase_temp_url', customUrl.trim());
      localStorage.setItem('supabase_temp_key', customKey.trim());
      setSuccessMsg('Configurazione database salvata con successo!');
      setErrorMsg(null);
      setShowConfig(false);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      setErrorMsg('URL e Anon Key sono entrambi richiesti.');
    }
  };

  const handleClearConfig = () => {
    triggerHaptic('reset');
    localStorage.removeItem('supabase_temp_url');
    localStorage.removeItem('supabase_temp_key');
    setCustomUrl('');
    setCustomKey('');
    setSuccessMsg('Configurazione ripristinata.');
    setShowConfig(false);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-[#090a0c] text-[#e0e0e0] flex flex-col items-center justify-center p-6 select-none overflow-y-auto"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {/* Decorative Matrix Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%)',
          backgroundSize: '100% 3px',
          opacity: 0.15
        }}
      />

      <div className="w-full max-w-[360px] flex flex-col items-center gap-8 relative z-10">
        
        {/* Simple elegant native-looking logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00ff88]/5 border border-[#00ff88]/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,136,0.1)]">
            <Shield className="text-[#00ff88] w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-[3px] text-white uppercase">
            FUND_CALCULATOR
          </h1>
          <p className="text-[0.65rem] text-[#4a4d52] tracking-[2px] mt-1 uppercase">
            SECURED NATIVE ENDPOINT
          </p>
        </div>

        {/* Tab switcher: clean terminal block */}
        <div className="w-full flex bg-[#111214] p-1 border border-[#1f2226] rounded-xl">
          <button
            onClick={() => {
              triggerHaptic('action');
              setActiveTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-[#1a1d24] text-[#00ff88] border border-[#00ff88]/20 shadow-[0_0_8px_rgba(0,255,136,0.05)]'
                : 'text-[#4a4d52] hover:text-[#888]'
            }`}
          >
            ACCEDI
          </button>
          <button
            onClick={() => {
              triggerHaptic('action');
              setActiveTab('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-[#1a1d24] text-[#00ff88] border border-[#00ff88]/20 shadow-[0_0_8px_rgba(0,255,136,0.05)]'
                : 'text-[#4a4d52] hover:text-[#888]'
            }`}
          >
            REGISTRATI
          </button>
        </div>

        {/* Form area */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-4">
          
          {/* Feedback message display */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#1a0a0d] border border-[#ff3b5c]/30 text-[#ff3b5c] text-[0.7rem] p-3 rounded-lg flex items-start gap-2.5"
              >
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span className="leading-normal">{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#091710] border border-[#00ff88]/30 text-[#00ff66] text-[0.7rem] p-3 rounded-lg flex items-start gap-2.5"
              >
                <Check size={14} className="mt-0.5 flex-shrink-0" />
                <span className="leading-normal">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[0.6rem] text-[#4a4d52] uppercase tracking-wider block">Indirizzo Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-2.5 text-[#4a4d52]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utente@esempio.com"
                className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#00ff88]/40 focus:outline-none rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-[#333]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.6rem] text-[#4a4d52] uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-2.5 text-[#4a4d52]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#111214] border border-[#1f2226] focus:border-[#00ff88]/40 focus:outline-none rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-[#333]"
              />
            </div>
          </div>

          {/* Action button: highly visible tactile call to action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00ff88] hover:bg-[#00dd75] text-[#050d09] font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,136,0.15)] disabled:opacity-50"
          >
            {activeTab === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
            {loading ? 'ELABORAZIONE...' : activeTab === 'login' ? 'ACCEDI ORA' : 'REGISTRATI ORA'}
          </button>

          {/* Separation line */}
          <div className="relative my-4 flex py-1 items-center justify-center">
            <div className="w-1/3 border-t border-[#1f2226]"></div>
            <span className="mx-3 text-[0.55rem] text-[#4a4d52] uppercase tracking-widest font-mono">OPPURE CONTINUA CON</span>
            <div className="w-1/3 border-t border-[#1f2226]"></div>
          </div>

          {/* Google Sign-in button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-[#111214] border border-[#1f2226] hover:bg-[#1a1c20] text-white font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all hover:border-[#4285F4]/30"
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
            ACCEDI CON GOOGLE
          </button>
        </form>

        {/* Database Config gear button at bottom */}
        <div className="flex flex-col items-center justify-center pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('action');
              setShowConfig(!showConfig);
            }}
            className="flex items-center gap-1.5 text-[#4a4d52] hover:text-[#00ff88] text-[0.6rem] uppercase tracking-widest font-mono cursor-pointer transition-colors"
          >
            <Database size={11} />
            database connection settings
          </button>
        </div>

        {/* Database custom config panel block inside Login screen */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full bg-[#111214] border border-[#1f2226] p-4 rounded-xl space-y-3.5 text-left"
            >
              <div className="text-[0.65rem] text-slate-500 uppercase tracking-widest leading-relaxed">
                💡 <span className="text-white font-bold">DATABASE TERMINAL</span>: Inserisci i parametri Supabase del tuo progetto per salvare le note in cloud privato.
              </div>

              <div className="space-y-1">
                <span className="text-[0.55rem] text-[#ffd700] uppercase tracking-wider block">Supabase Project URL</span>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full bg-[#090a0c] border border-[#1f2226] focus:border-[#ffd700]/40 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[0.55rem] text-[#ffd700] uppercase tracking-wider block">Supabase Anon Key</span>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-[#090a0c] border border-[#1f2226] focus:border-[#ffd700]/40 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex-1 py-1.5 bg-[#ffd700] hover:bg-[#ffb700] text-[#0c0d0e] font-bold text-[0.65rem] uppercase rounded-lg cursor-pointer transition-all"
                >
                  SALVA
                </button>
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="py-1.5 px-3 bg-[#1a0a0d] border border-[#ff3b5c]/30 hover:border-[#ff3b5c] text-[#ff3b5c] font-bold text-[0.65rem] uppercase rounded-lg cursor-pointer transition-all"
                >
                  RESET
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
