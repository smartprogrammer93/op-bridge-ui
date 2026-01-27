'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supportedTokens, Token } from '@/config/tokens';

interface TokenSelectorProps {
  value: string;
  onChange: (token: Token) => void;
}

export function TokenSelector({ value, onChange }: TokenSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(symbol) => {
        const token = supportedTokens.find((t) => t.symbol === symbol);
        if (token) onChange(token);
      }}
    >
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Token" />
      </SelectTrigger>
      <SelectContent>
        {supportedTokens.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol}>
            <div className="flex items-center gap-2">
              <span>{token.symbol}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
