'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  symbol: string;
}

export function AmountInput({ value, onChange, balance, symbol }: AmountInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Amount</span>
        {balance && (
          <span className="text-gray-400">
            Balance: {balance} {symbol}
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-20 text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {balance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(balance)}
              className="h-6 px-2 text-xs"
            >
              MAX
            </Button>
          )}
          <span className="text-gray-400">{symbol}</span>
        </div>
      </div>
    </div>
  );
}
