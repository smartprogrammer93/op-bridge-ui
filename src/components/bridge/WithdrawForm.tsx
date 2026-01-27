'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AmountInput } from './AmountInput';
import { useWithdrawETH } from '@/hooks/useWithdraw';
import { l1Chain, l2Chain } from '@/config/chains';
import { ArrowDown, Loader2, AlertTriangle } from 'lucide-react';

export function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const { address, isConnected } = useAccount();
  
  const { data: balance } = useBalance({
    address,
    chainId: l2Chain.id,
  });

  const { withdraw, isPending, isConfirming, isSuccess, hash, error } = useWithdrawETH();

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await withdraw(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Withdraw to L1</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <Alert className="bg-yellow-900/20 border-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Withdrawals require a 7-day challenge period before you can claim your funds on L1.
          </AlertDescription>
        </Alert>

        {/* From Chain */}
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
          <div className="text-sm text-gray-400">From: {l2Chain.name}</div>
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
          <div className="text-sm text-gray-400">To: {l1Chain.name}</div>
          <div className="text-lg mt-2">{amount || '0'} ETH</div>
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-sm">
            ✅ Withdrawal initiated! Tx: {hash?.slice(0, 10)}...
            <br />
            <span className="text-xs text-gray-400">
              Come back after the challenge period to prove and finalize.
            </span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
            ❌ Error: {error.message}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleWithdraw}
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
            'Withdraw'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
