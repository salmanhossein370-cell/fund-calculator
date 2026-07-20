import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'RESET ENTIRE SYSTEM?',
  message = 'THIS ACTION WILL PERMANENTLY ERASE AVAILABLE FUNDS, TRANSACTION HISTORIES, AND RECEIPT ENTRIES.',
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            id="confirm-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[345px] overflow-hidden rounded-[20px] border border-[#ff0055]/30 bg-[#121315] p-5 text-center z-10 shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
            id="confirm-modal-box"
          >
            {/* Retro warning scanner bar */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#ff0055] animate-pulse" />

            <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff0055]/10 text-[#ff0055]">
              <AlertTriangle size={24} className="drop-shadow-[0_0_8px_rgba(255,0,85,0.4)]" />
            </div>

            <h3 className="mb-2 font-mono text-sm font-black tracking-widest text-[#ff0055] glow-red-sm">
              RESET SYSTEM?
            </h3>

            <p className="mb-5 font-mono text-[9px] leading-relaxed text-[#555a60] uppercase">
              {message}
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                id="btn-confirm-cancel"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-[#232429]/40 bg-[#1a1b1e] py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#555a60] hover:text-white transition-all cursor-pointer"
              >
                CANCEL
              </button>
              
              <button
                type="button"
                id="btn-confirm-execute"
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-[#ff0055] py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_12px_rgba(255,0,85,0.3)] hover:bg-[#ff0044] transition-all cursor-pointer"
              >
                RESET
              </button>
            </div>

            {/* Subtle retro footer marker */}
            <div className="mt-6 flex items-center justify-center gap-1.5 font-mono text-[9px] text-gray-600">
              <ShieldAlert size={10} />
              <span>SYSTEM SECURE OVERRIDE v2.4</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
