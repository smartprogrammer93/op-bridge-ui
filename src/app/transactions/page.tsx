'use client';

import { useAccount } from 'wagmi';
import { useTransactions } from '@/hooks/useTransactions';
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Info, Wallet } from 'lucide-react';
import { l1Chain } from '@/config/chains';
import { WithdrawalItem } from '@/components/bridge/WithdrawalItem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function TransactionsPage() {
  const { isConnected } = useAccount();
  const { deposits, withdrawals, isLoading, error } = useTransactions();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Transaction History</h1>
          <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">Connect your wallet to see your transaction history.</p>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-violet-200/80">
            <strong>Withdrawal Process:</strong> Initiate (L2) → Prove (~1h) → Wait 7 days → Finalize (L1)
          </div>
        </div>

        {/* Withdrawals */}
        <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <ArrowUpFromLine className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold text-white">Withdrawals</h2>
            <span className="text-sm text-gray-500">({withdrawals.length})</span>
          </div>
          <div className="p-4">
            {withdrawals.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No withdrawals found</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((tx) => (
                  <WithdrawalItem key={tx.hash} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deposits */}
        <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <ArrowDownToLine className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold text-white">Deposits</h2>
            <span className="text-sm text-gray-500">({deposits.length})</span>
          </div>
          <div className="p-4">
            {deposits.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No deposits found</p>
            ) : (
              <div className="space-y-3">
                {deposits.map((tx) => (
                  <div
                    key={tx.hash}
                    className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-white">{tx.amount} ETH</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Block {tx.blockNumber.toString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-full">
                        Confirmed
                      </span>
                      <a
                        href={`${l1Chain.blockExplorers?.default.url}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
