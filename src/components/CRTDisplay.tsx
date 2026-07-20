import { ReceiptEntry } from '../types';

interface CRTDisplayProps {
  currencySymbol: string;
  receipts: ReceiptEntry[];
}

export default function CRTDisplay({ currencySymbol, receipts }: CRTDisplayProps) {
  // Compute plus and minus totals
  const plusHistory = receipts
    .filter((r) => r.type === 'plus')
    .reduce((sum, r) => sum + r.amount, 0);

  const minusHistory = receipts
    .filter((r) => r.type === 'minus')
    .reduce((sum, r) => sum + r.amount, 0);

  const availableFund = plusHistory - minusHistory;

  // Formatting helpers - matching the screenshot's spacing and precision
  const formatValue = (val: number) => {
    return `${currencySymbol} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      className="relative overflow-hidden rounded-[12px] border border-[#102a1c] py-[10px] px-[14px]"
      style={{
        background: 'linear-gradient(180deg, #091710 0%, #050d09 100%)',
      }}
      id="crt-display-container"
    >
      {/* Interactive Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 3px',
        }}
      />

      <div className="relative z-20 flex justify-between items-center h-full min-h-[52px]">
        {/* Left Side: Available Funds */}
        <div className="flex flex-col justify-center select-none">
          <span
            className="text-[0.6rem] tracking-[0.05em] uppercase"
            style={{ color: '#1b5e3a', fontFamily: "'Share Tech Mono', monospace" }}
          >
            AVAILABLE FUND
          </span>
          <h1
            className="text-[1.5rem] font-bold tracking-tight"
            style={{
              color: '#00ff66',
              textShadow: '0 0 8px rgba(0, 255, 102, 0.4)',
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >
            {formatValue(availableFund)}
          </h1>
        </div>

        {/* Right Side: Plus/Minus Histories */}
        <div className="flex flex-col justify-between gap-[4px] text-right select-none">
          {/* Plus history */}
          <div className="text-right">
            <span
              className="text-[0.55rem] uppercase block leading-none"
              style={{ color: '#8a7300', fontFamily: "'Share Tech Mono', monospace" }}
            >
              +FUND HISTORY
            </span>
            <span
              className="text-[0.85rem]"
              style={{ color: '#ffd700', fontFamily: "'Share Tech Mono', monospace" }}
            >
              {formatValue(plusHistory)}
            </span>
          </div>

          {/* Minus history */}
          <div className="text-right">
            <span
              className="text-[0.55rem] uppercase block leading-none"
              style={{ color: '#7a1f2f', fontFamily: "'Share Tech Mono', monospace" }}
            >
              -FUND HISTORY
            </span>
            <span
              className="text-[0.85rem]"
              style={{ color: '#ff3b5c', fontFamily: "'Share Tech Mono', monospace" }}
            >
              {formatValue(minusHistory)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
