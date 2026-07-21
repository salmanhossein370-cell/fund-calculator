import React from 'react';
import { ShieldAlert, RefreshCw, Copy, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/haptic';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      triggerHaptic('reset');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    window.location.reload();
  };

  private handleCopy = () => {
    try {
      triggerHaptic('action');
    } catch (e) {}
    const { error, errorInfo } = this.state;
    const textToCopy = `Error: ${error?.message}\nStack: ${error?.stack}\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div 
          className="fixed inset-0 w-screen h-screen bg-[#090a0c] text-[#ff3b5c] flex flex-col items-center justify-center p-6 select-text overflow-y-auto"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
        >
          {/* Scanline CRT Effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(rgba(26, 10, 10, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
              backgroundSize: '100% 3px',
              opacity: 0.2,
              zIndex: 50
            }}
          />

          <div className="w-full max-w-[550px] bg-[#140b0d] border border-[#ff3b5c]/30 rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative z-10 shadow-[0_0_30px_rgba(255,59,92,0.1)]">
            
            {/* Header Area */}
            <div className="flex items-center gap-4 border-b border-[#ff3b5c]/20 pb-4">
              <div className="w-12 h-12 rounded-xl bg-[#ff3b5c]/5 border border-[#ff3b5c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,59,92,0.15)] flex-shrink-0">
                <ShieldAlert className="text-[#ff3b5c] w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold uppercase tracking-wider text-white">
                  SYSTEM CRASH DETECTED
                </h1>
                <p className="text-[0.65rem] text-[#888] tracking-[1.5px] uppercase mt-1">
                  unhandled react exception caught
                </p>
              </div>
            </div>

            {/* Terminal Details Panel */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[0.6rem] text-slate-500 uppercase tracking-wider block">Error Message</span>
                <div className="bg-[#0c0506] border border-[#ff3b5c]/10 rounded-lg p-3 text-xs text-[#fca5a5] font-mono whitespace-pre-wrap break-all leading-normal max-h-[120px] overflow-y-auto">
                  {this.state.error?.name}: {this.state.error?.message}
                </div>
              </div>

              {this.state.error?.stack && (
                <div className="space-y-1">
                  <span className="text-[0.6rem] text-slate-500 uppercase tracking-wider block">Diagnostics Stack Trace</span>
                  <div className="bg-[#0c0506] border border-[#ff3b5c]/10 rounded-lg p-3 text-[0.65rem] text-slate-400 font-mono whitespace-pre overflow-x-auto max-h-[180px] leading-relaxed select-all">
                    {this.state.error.stack}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-[#ff3b5c]/10 pt-4">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 bg-[#ff3b5c] hover:bg-[#e12a49] text-white font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,59,92,0.15)]"
              >
                <RefreshCw size={13} />
                FORZA RIAVVIO
              </button>
              <button
                onClick={this.handleCopy}
                className="py-2.5 px-4 bg-[#140b0d] border border-[#ff3b5c]/30 hover:border-[#ff3b5c] text-white font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all"
                title="Copia Errore"
              >
                {this.state.copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                {this.state.copied ? 'COPIATO' : 'COPIA'}
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
