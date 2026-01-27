'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AmountInput } from './AmountInput';
import { useDepositETH } from '@/hooks/useDeposit';
import { l1Chain, l2Chain } from '@/config/chains';
import { ArrowDown, Loader2 } from 'lucide-react';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const { address, isConnected } = useAccount();
  
  const { data: balance } = useBalance({
    address,
    chainId: l1Chain.id,
  });

  const { deposit, isPending, isConfirming, isSuccess, hash, error } = useDepositETH();

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await deposit(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Deposit to L2</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* From Chain */}
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
          <div className="text-sm text-gray-400">From: {l1Chain.name}</div>
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={balance ? formatEther(balance.value) : undefined}
            symbol="ETH"
          />
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="p-2 bg-gray-800 rounded-full">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* To Chain */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="text-sm text-gray-400">To: {l2Chain.name}</div>
          <div className="text-lg mt-2">{amount || '0'} ETH</div>
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-sm">
            ✅ Deposit submitted! Tx: {hash?.slice(0, 10)}...
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
            ❌ Error: {error.message}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleDeposit}
          disabled={!isConnected || !amount || isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isPending ? 'Confirm in Wallet...' : 'Confirming...'}
            </>
          ) : (
            'Deposit'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
