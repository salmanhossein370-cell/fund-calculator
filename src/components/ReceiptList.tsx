import React, { useEffect, useRef } from 'react';
import { ReceiptEntry } from '../types';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptic';

interface ReceiptListProps {
  receipts: ReceiptEntry[];
  onRemoveEntry?: (id: string) => void;
}

export default function ReceiptList({ receipts, onRemoveEntry }: ReceiptListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Automatically scroll to top when new items are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      lastScrollTopRef.current = 0;
    }
  }, [receipts]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const delta = Math.abs(currentScrollTop - lastScrollTopRef.current);
    if (delta > 22) {
      triggerHaptic('scroll'); // Extremely short mechanical click for scroll ticks
      lastScrollTopRef.current = currentScrollTop;
    }
  };

  const sortedReceipts = [...receipts].reverse();

  return (
    <div className="flex flex-col flex-1 min-h-0" id="receipt-widget-container">
      {/* Dashed Separator Header */}
      <div
        className="text-center select-none"
        style={{
          fontSize: '0.6rem',
          color: '#2a2c30',
          marginBottom: '4px',
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: '0.2em',
        }}
      >
        ................ RECEIPT ................
      </div>

      {/* Main Container */}
      <div
        style={{
          background: '#111214',
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: '1px solid #222428',
        }}
        className="flex-1 min-h-0 overflow-hidden"
        id="receipt-list-inner"
      >
        {/* Scroll indicator triangles on the right edge matching the prototype */}
        <div className="absolute top-2 right-2 text-[7px] text-[#2a2c30] font-bold select-none pointer-events-none">
          ▲
        </div>
        <div className="absolute bottom-2 right-2 text-[7px] text-[#2a2c30] font-bold select-none pointer-events-none">
          ▼
        </div>

        {receipts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center select-none" id="receipt-empty-state">
            <span
              style={{
                fontSize: '0.75rem',
                color: '#2a2c30',
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              NO ENTRIES YET
            </span>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="terminal-scroll flex-1 min-h-0 overflow-y-auto pr-3.5 flex flex-col gap-[6px]"
            id="receipt-scroll-area"
          >
            {sortedReceipts.map((entry) => {
              const isPlus = entry.type === 'plus';
              return (
                <div
                  key={entry.id}
                  id={`receipt-entry-${entry.id}`}
                  className="group flex flex-col"
                >
                  <div
                    className="flex justify-between items-center"
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: "'Share Tech Mono', monospace",
                      color: isPlus ? '#00ff66' : '#ff3b5c',
                    }}
                  >
                    <span>
                      {isPlus ? '+ Add to Fund' : '- Spend from Fund'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>
                        {entry.currencySymbol}
                        {entry.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span style={{ color: '#4a4d52', fontSize: '0.65rem', marginLeft: '6px' }}>
                        {entry.time}
                      </span>

                      {onRemoveEntry && (
                        <button
                          type="button"
                          id={`btn-delete-entry-${entry.id}`}
                          onPointerDown={() => triggerHaptic('reset')}
                          onClick={() => {
                            onRemoveEntry(entry.id);
                          }}
                          title="Delete entry"
                          className="opacity-0 group-hover:opacity-100 text-[#4a4d52] hover:text-[#ff3b5c] transition-all duration-150 p-0.5 rounded cursor-pointer ml-1"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </span>
                  </div>

                  {/* Optional Note Row */}
                  {entry.note && (
                    <div
                      style={{
                        color: '#4a4d52',
                        fontSize: '0.65rem',
                        fontFamily: "'Share Tech Mono', monospace",
                        fontStyle: 'italic',
                        paddingLeft: '10px',
                        marginTop: '2px',
                      }}
                      className="break-all"
                    >
                      // {entry.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
