import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowUpRight, ArrowDownLeft, X, Copy, Check, Trash2, Plus, Terminal, Play } from 'lucide-react';
import { ReceiptEntry } from '../types';
import { extractShahriyarValue, hasShahriyarValue } from '../utils/parser';
import { triggerHaptic } from '../utils/haptic';

interface AutomaticNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: ReceiptEntry[];
  currencySymbol: string;
  onUpdateReceipt: (id: string, note: string) => void;
  onAddReceipt: (type: 'plus' | 'minus') => void;
  onRemoveReceipt: (id: string) => void;
}

export default function AutomaticNotebook({
  isOpen,
  onClose,
  receipts,
  currencySymbol,
  onUpdateReceipt,
  onAddReceipt,
  onRemoveReceipt,
}: AutomaticNotebookProps) {
  const [activeTab, setActiveTab] = useState<'take' | 'give'>('take');
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Filter entries
  const giveEntries = receipts.filter((r) => r.type === 'minus');
  const takeEntries = receipts.filter((r) => r.type === 'plus');

  // We keep calculated totals in local state to update when clicking "CALCULATE"
  const [calculatedTotals, setCalculatedTotals] = useState({
    inflow: 0,
    outflow: 0,
    balance: 0,
  });

  // Calculate function
  const runCalculation = (showEffects = true) => {
    if (showEffects) {
      triggerHaptic('action');
      setIsCompiling(true);
    }

    const outflow = giveEntries.reduce((sum, r) => sum + extractShahriyarValue(r.note), 0);
    const inflow = takeEntries.reduce((sum, r) => sum + extractShahriyarValue(r.note), 0);
    const balance = inflow - outflow;

    if (showEffects) {
      setTimeout(() => {
        setCalculatedTotals({ inflow, outflow, balance });
        setIsCompiling(false);
      }, 450); // Cool brief delay for the calculation effect
    } else {
      setCalculatedTotals({ inflow, outflow, balance });
    }
  };

  // Pre-populate empty line if empty on load to guarantee persistent/editable rows
  useEffect(() => {
    if (isOpen) {
      const hasGive = receipts.some((r) => r.type === 'minus');
      const hasTake = receipts.some((r) => r.type === 'plus');
      
      setTimeout(() => {
        if (!hasTake) {
          onAddReceipt('plus');
        }
        if (!hasGive) {
          onAddReceipt('minus');
        }
      }, 50);
    }
  }, [isOpen]);

  // Run calculation initially when the modal is opened
  useEffect(() => {
    if (isOpen) {
      runCalculation(false);
    }
  }, [isOpen, receipts.length]); // Recalculate silently when count changes or on open

  const formatValue = (val: number) => {
    return `${currencySymbol} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleCopySummary = () => {
    triggerHaptic('action');
    let text = `--- NOTEBOOK AUTOMATICO (STILE CODE EDITOR) ---\n\n`;
    text += `🟢 TOTAL INFLOW (TAKE): ${formatValue(calculatedTotals.inflow)}\n`;
    text += `🔴 TOTAL OUTFLOW (GIVE): ${formatValue(calculatedTotals.outflow)}\n`;
    text += `⚡ NET BALANCE: ${formatValue(calculatedTotals.balance)}\n\n`;

    text += `👉 I HAVE TO GIVE (-FUND):\n`;
    giveEntries.forEach((e) => {
      const val = extractShahriyarValue(e.note);
      text += `   ${e.note || '(riga vuota)'} ${val > 0 ? `-> ${currencySymbol} ${val}` : ''}\n`;
    });

    text += `\n👉 I HAVE TO TAKE (+FUND):\n`;
    takeEntries.forEach((e) => {
      const val = extractShahriyarValue(e.note);
      text += `   ${e.note || '(riga vuota)'} ${val > 0 ? `-> ${currencySymbol} ${val}` : ''}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  const activeEntries = activeTab === 'take' ? takeEntries : giveEntries;

  // Keydown handler to simulate high-fidelity IDE behavior
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    entries: ReceiptEntry[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerHaptic('key');
      if (index === entries.length - 1) {
        // Last row, append a new row
        onAddReceipt(activeTab === 'take' ? 'plus' : 'minus');
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('.code-editor-input');
          if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
          }
        }, 50);
      } else {
        // Jump to next row
        const inputs = document.querySelectorAll<HTMLInputElement>('.code-editor-input');
        if (inputs[index + 1]) {
          inputs[index + 1].focus();
        }
      }
    } else if (e.key === 'Backspace' && entries[index].note === '') {
      // If line is empty and backspace pressed, remove it and focus previous line
      e.preventDefault();
      triggerHaptic('reset');
      onRemoveReceipt(entries[index].id);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.code-editor-input');
        if (inputs[index - 1]) {
          inputs[index - 1].focus();
        } else if (inputs[0]) {
          inputs[0].focus();
        }
      }, 50);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="notebook-editor-fullscreen-overlay"
        className="fixed inset-0 bg-[#090a0c] z-50 flex flex-col overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ type: 'spring', duration: 0.35 }}
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
          className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto bg-[#0d0e11] border-x border-[#1a1d24] overflow-hidden"
        >
          {/* Header Bar */}
          <header className="flex items-center justify-between border-b border-[#1a1d24] px-5 py-4 bg-[#090a0c] relative select-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88]">
                <Terminal size={16} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-white text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                  SHAHRIYAR_NOTEBOOK.py <span className="text-[0.6rem] bg-emerald-500/10 text-[#00ff88] border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wide">v2.0</span>
                </h2>
                <p className="text-[0.65rem] text-[#4a4d52] tracking-wider uppercase mt-0.5">
                  Real-time Syntax Parser & Supabase Synchronization
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('action');
                onClose();
              }}
              className="p-1.5 border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title="Close Editor"
            >
              <X size={16} />
            </button>
          </header>

          {/* Code Tabs Selector */}
          <div className="flex bg-[#090a0c] border-b border-[#1a1d24] p-1 gap-1 select-none">
            <button
              onClick={() => {
                triggerHaptic('action');
                setActiveTab('take');
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'take'
                  ? 'bg-[#14171d] text-[#00ff66] border border-[#00ff66]/30 shadow-[0_0_12px_rgba(0,255,102,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#14171d]/40'
              }`}
            >
              <ArrowUpRight size={14} />
              def take_entries() <span className="text-[0.65rem] opacity-60 font-normal">({takeEntries.length} lines)</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('action');
                setActiveTab('give');
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'give'
                  ? 'bg-[#14171d] text-[#ff3b5c] border border-[#ff3b5c]/30 shadow-[0_0_12px_rgba(255,59,92,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#14171d]/40'
              }`}
            >
              <ArrowDownLeft size={14} />
              def give_entries() <span className="text-[0.65rem] opacity-60 font-normal">({giveEntries.length} lines)</span>
            </button>
          </div>

          {/* MAIN IDE WORKSPACE */}
          <div className="flex-1 overflow-y-auto bg-[#090a0c] relative flex flex-col min-h-0 select-text">
            {/* Syntax highlighting background line numbers pane */}
            <div className="flex flex-1 min-h-full">
              
              {/* Line Numbers Sidebar */}
              <div className="w-12 bg-[#090a0c] border-r border-[#1a1d24] py-4 select-none flex flex-col text-right pr-3 gap-1.5 text-xs text-slate-600 font-mono">
                {activeEntries.map((_, i) => (
                  <div key={i} className="h-9 flex items-center justify-end font-bold text-[0.7rem]">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                ))}
                {/* Visual extra row indicator */}
                <div className="h-9 flex items-center justify-end font-normal text-slate-800 text-[0.7rem] italic">
                  *
                </div>
              </div>

              {/* Code Inputs Editor Stream with Horizontal Scroll on Mobile */}
              <div 
                id="code-editor-stream-container"
                className="flex-1 py-4 flex flex-col gap-1.5 overflow-x-auto select-text scroll-smooth"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Dynamically Styled Scrollbar style tag for ultimate visual precision and high visibility */}
                <style dangerouslySetInnerHTML={{ __html: `
                  #code-editor-stream-container::-webkit-scrollbar {
                    height: 6px;
                    background-color: transparent;
                  }
                  #code-editor-stream-container::-webkit-scrollbar-track {
                    background: rgba(26, 29, 36, 0.1);
                  }
                  #code-editor-stream-container::-webkit-scrollbar-thumb {
                    background: ${activeTab === 'take' ? 'rgba(0, 255, 102, 0.25)' : 'rgba(255, 59, 92, 0.25)'};
                    border-radius: 4px;
                    border: 1px solid rgba(26, 29, 36, 0.2);
                  }
                  #code-editor-stream-container::-webkit-scrollbar-thumb:hover {
                    background: ${activeTab === 'take' ? 'rgba(0, 255, 102, 0.45)' : 'rgba(255, 59, 92, 0.45)'};
                  }
                `}} />

                <div className="min-w-[720px] sm:min-w-0 pr-6 pl-3 flex flex-col gap-1.5 flex-1">
                  {activeEntries.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-[#4a4d52] font-mono uppercase tracking-wider leading-relaxed">
                      <Terminal className="w-8 h-8 text-[#1a1d24] mb-3 animate-pulse" />
                      # No active threads found.<br/>
                      # Tap "+ ADD NEW LINE" below or start writing.
                    </div>
                  ) : (
                    activeEntries.map((e, idx) => {
                      const parsedVal = extractShahriyarValue(e.note);
                      const hasShahriyar = hasShahriyarValue(e.note);

                      return (
                        <div
                          key={e.id}
                          className="h-9 flex items-center gap-3 w-full group rounded hover:bg-[#121419]/40 transition-colors px-1"
                        >
                          {/* Editor Line Input */}
                          <div className="flex-1 min-w-0 flex items-center relative">
                            <input
                              type="text"
                              value={e.note}
                              onChange={(evt) => onUpdateReceipt(e.id, evt.target.value)}
                              onKeyDown={(evt) => handleKeyDown(evt, idx, activeEntries)}
                              placeholder='# write notes here... e.g. "shahidul (shahriyar 50)"'
                              className="code-editor-input w-full bg-transparent border-none text-[#d4d4d4] text-xs font-mono focus:outline-none focus:ring-0 py-1 h-full tracking-wide whitespace-nowrap"
                            />

                            {/* Quick Syntax helper indicator */}
                            {e.note && !hasShahriyar && (
                              <span className="absolute right-2 text-[0.55rem] text-[#4a4d52] uppercase pointer-events-none select-none">
                                No shahriyar tag
                              </span>
                            )}
                          </div>

                          {/* Extracted Syntax badge */}
                          <div className="flex items-center gap-2.5 flex-shrink-0 select-none">
                            {hasShahriyar && (
                              <span
                                style={{
                                  textShadow: activeTab === 'give' ? '0 0 4px rgba(255,59,92,0.4)' : '0 0 4px rgba(0,255,102,0.4)'
                                }}
                                className={`text-[0.65rem] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border ${
                                  activeTab === 'give'
                                    ? 'bg-[#211114] text-[#ff3b5c] border-[#ff3b5c]/30'
                                    : 'bg-[#0f1d13] text-[#00ff66] border-[#00ff66]/30'
                                }`}
                              >
                                SH: {currencySymbol}{parsedVal.toFixed(2)}
                              </span>
                            )}

                            {/* Delete compiler line */}
                            <button
                              onClick={() => {
                                triggerHaptic('reset');
                                onRemoveReceipt(e.id);
                              }}
                              className="p-1 text-[#4a4d52] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                              title="Delete Line"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* APPEND LINE BUTTON IN EDITOR STREAM */}
                  <button
                    onClick={() => {
                      triggerHaptic('action');
                      onAddReceipt(activeTab === 'take' ? 'plus' : 'minus');
                      setTimeout(() => {
                        const inputs = document.querySelectorAll<HTMLInputElement>('.code-editor-input');
                        if (inputs.length > 0) {
                          inputs[inputs.length - 1].focus();
                        }
                      }, 50);
                    }}
                    className="h-9 flex items-center gap-2 text-slate-500 hover:text-[#00ff88] text-xs font-mono select-none text-left cursor-pointer transition-colors w-max hover:underline mt-2 pl-1"
                  >
                    <Plus size={12} />
                    <span>+ ADD NEW LINE (Enter)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* LOWER DIAGNOSTICS & TOTALS CALCULATE PANEL */}
          <div className="border-t border-[#1a1d24] bg-[#090a0c] p-4 flex flex-col gap-4 relative z-10">
            
            {/* CALCULATE COMPILER BUTTON */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[0.65rem] text-slate-500 uppercase tracking-widest font-mono">
                ⚡ Compile and run calculations for all notebook tabs
              </div>
              
              <button
                onClick={() => runCalculation(true)}
                disabled={isCompiling}
                className="py-3 px-8 bg-[#00ff88] hover:bg-[#00dd75] disabled:bg-[#00ff88]/20 disabled:text-[#00ff88]/40 text-[#050d09] text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors select-none"
              >
                {isCompiling ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#050d09] rounded-full animate-ping" />
                    COMPILING SHAHRIYAR...
                  </span>
                ) : (
                  <>
                    <Play size={12} className="fill-current" />
                    RUN CALCULATE
                  </>
                )}
              </button>
            </div>

            {/* DIAGNOSTIC RESULTS MONITOR OUT */}
            <div className="bg-[#040507] border border-[#1a1d24] p-3.5 rounded-xl grid grid-cols-3 gap-4 font-mono relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.01] to-transparent pointer-events-none" />
              
              <div className="flex flex-col">
                <span className="text-[0.55rem] text-slate-600 uppercase tracking-wider block">
                  🟢 TOTAL_INFLOW (TAKE)
                </span>
                <span className="text-sm font-bold text-emerald-500 mt-1">
                  {formatValue(calculatedTotals.inflow)}
                </span>
              </div>

              <div className="flex flex-col border-x border-[#1a1d24] px-4">
                <span className="text-[0.55rem] text-slate-600 uppercase tracking-wider block">
                  🔴 TOTAL_OUTFLOW (GIVE)
                </span>
                <span className="text-sm font-bold text-rose-500 mt-1">
                  {formatValue(calculatedTotals.outflow)}
                </span>
              </div>

              <div className="flex flex-col pl-2">
                <span className="text-[0.55rem] text-slate-600 uppercase tracking-wider block">
                  ⚡ NET_BALANCE
                </span>
                <span
                  className="text-sm font-bold mt-1"
                  style={{ color: calculatedTotals.balance >= 0 ? '#00ff88' : '#ff3b5c' }}
                >
                  {formatValue(calculatedTotals.balance)}
                </span>
              </div>
            </div>

            {/* LOWER ACTIONS BUTTONS BAR */}
            <div className="flex items-center justify-between gap-4 mt-1 select-none">
              <span className="text-[0.6rem] text-slate-600 uppercase tracking-widest hidden md:inline">
                STATUS: SYNCHRONIZED TO CLOUD DATABASE
              </span>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleCopySummary}
                  className="flex-1 md:flex-none py-2 px-4 bg-[#111317] hover:bg-[#1a1d24] border border-[#1a1d24] text-[#b0b0b0] text-[0.7rem] font-bold uppercase rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copied ? <Check size={12} className="text-[#00ff66]" /> : <Copy size={12} />}
                  {copied ? 'COPIED!' : 'COPY SUMMARY'}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('action');
                    onClose();
                  }}
                  className="flex-1 md:flex-none py-2 px-5 bg-emerald-500/10 border border-[#00ff88]/30 hover:bg-emerald-500/20 text-[#00ff88] text-[0.7rem] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  SAVE & EXIT
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
