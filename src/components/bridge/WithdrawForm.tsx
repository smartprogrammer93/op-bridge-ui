'use client';

import { useState } from 'react';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { useWithdrawETH } from '@/hooks/useWithdraw';
import { l1Chain, l2Chain } from '@/config/chains';
import { ArrowDown, Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  
  const isOnL2 = chainId === l2Chain.id;
  
  const { data: balance } = useBalance({
    address,
    chainId: l2Chain.id,
  });

  const { withdraw, isPending, isConfirming, isSuccess, hash, error } = useWithdrawETH();

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await withdraw(amount);
  };

  const handleMax = () => {
    if (balance) {
      const maxAmount = parseFloat(formatEther(balance.value)) - 0.001;
      if (maxAmount > 0) {
        setAmount(maxAmount.toFixed(6));
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Main Card */}
      <div className="relative bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Withdraw to L1</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/80">
            Withdrawals require a 7-day challenge period before you can claim your funds on L1.
          </p>
        </div>

        {/* Chain Selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-[#1a1a24] rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">From</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">OP</span>
              </div>
              <span className="font-medium text-white">{l2Chain.name}</span>
            </div>
          </div>
          
          <div className="p-2 rounded-full bg-[#1a1a24]">
            <ArrowDown className="w-4 h-4 text-violet-400" />
          </div>
          
          <div className="flex-1 bg-[#1a1a24] rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">To</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ξ</span>
              </div>
              <span className="font-medium text-white">{l1Chain.name}</span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="bg-[#1a1a24] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">You send</span>
            {balance && (
              <span className="text-sm text-gray-500">
                Balance: {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-light text-white outline-none"
            />
            <div className="flex items-center gap-2">
              {balance && (
                <button
                  onClick={handleMax}
                  className="px-2 py-1 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 rounded-md transition-colors"
                >
                  Max
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Ξ</span>
                </div>
                <span className="font-medium text-white">ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* You Receive */}
        <div className="bg-[#1a1a24] rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-500 mb-2">You receive</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-light text-white">{amount || '0'}</span>
            <span className="text-gray-400">ETH on {l1Chain.name}</span>
          </div>
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Withdrawal initiated!</span>
            </div>
            <p className="text-sm text-green-400/70 mt-1">
              Tx: {hash?.slice(0, 10)}...{hash?.slice(-8)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Check the History tab to track and finalize your withdrawal.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        )}

        {/* Action Button */}
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="w-full py-4 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : !isOnL2 ? (
          <Button
            onClick={() => switchChain({ chainId: l2Chain.id })}
            disabled={isSwitching}
            className="w-full py-4 h-auto bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl"
          >
            {isSwitching ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Switching...</>
            ) : (
              `Switch to ${l2Chain.name}`
            )}
          </Button>
        ) : (
          <Button
            onClick={handleWithdraw}
            disabled={!amount || parseFloat(amount) <= 0 || isPending || isConfirming}
            className="w-full py-4 h-auto bg-violet-500 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium rounded-xl transition-all"
          >
            {isPending || isConfirming ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {isPending ? 'Confirm in Wallet...' : 'Processing...'}</>
            ) : !amount || parseFloat(amount) <= 0 ? (
              'Enter amount'
            ) : (
              'Withdraw'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
