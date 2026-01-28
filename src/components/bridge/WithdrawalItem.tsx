'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useAccount, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { OPTIMISM_PORTAL_ABI, WITHDRAWAL_PROVEN_EVENT } from '@/config/abis';
import { CHALLENGE_PERIOD_SECONDS, PROVE_EVENT_SEARCH_BLOCKS } from '@/config/constants';
import { BridgeTransaction } from '@/hooks/useTransactions';
import { useFinalizeWithdrawal } from '@/hooks/useFinalizeWithdrawal';
import { useProveWithdrawal } from '@/hooks/useProveWithdrawal';
import { withRetry, toBigIntSafe } from '@/lib/withdrawal-utils';

interface WithdrawalItemProps {
  tx: BridgeTransaction;
}

type Status = 'loading' | 'waiting-for-output' | 'ready-to-prove' | 'proving' | 'proven' | 'ready-to-finalize' | 'finalizing' | 'finalized' | 'error';

export function WithdrawalItem({ tx }: WithdrawalItemProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [provenTimestamp, setProvenTimestamp] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const { chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const isOnL1 = chainId === l1Chain.id;
  
  const { 
    prove, 
    getWithdrawalFromTx, 
    canProve,
    isPending: isProvePending, 
    isConfirming: isProveConfirming, 
    isSuccess: isProveSuccess,
    error: proveError 
  } = useProveWithdrawal();
  
  const { 
    finalize, 
    isPending: isFinalizePending, 
    isConfirming: isFinalizeConfirming, 
    isSuccess: isFinalizeSuccess,
    error: finalizeError 
  } = useFinalizeWithdrawal();

  // Check status
  useEffect(() => {
    const checkStatus = async () => {
      if (!l1Client) return;
      
      try {
        const result = await getWithdrawalFromTx(tx.hash as `0x${string}`);
        if (!result) {
          setStatus('error');
          setErrorMsg('Could not find withdrawal data');
          return;
        }
        
        const { withdrawal, blockNumber } = result;
        
        // Check if finalized
        try {
          const finalized = await withRetry(() =>
            l1Client.readContract({
              address: bridgeContracts.l1.optimismPortal,
              abi: OPTIMISM_PORTAL_ABI,
              functionName: 'finalizedWithdrawals',
              args: [withdrawal.withdrawalHash],
            })
          );
          
          if (finalized) {
            setStatus('finalized');
            return;
          }
        } catch {
          // Continue checking
        }
        
        // Check if proven (fault proof portal uses numProofSubmitters)
        try {
          const numSubmitters = await withRetry(() =>
            l1Client.readContract({
              address: bridgeContracts.l1.optimismPortal,
              abi: OPTIMISM_PORTAL_ABI,
              functionName: 'numProofSubmitters',
              args: [withdrawal.withdrawalHash],
            })
          );
          
          if (toBigIntSafe(numSubmitters) > 0n) {
            // Get the actual prove timestamp from WithdrawalProven event
            // Use indexed topic filter for efficiency (Issue #7 fix)
            try {
              const currentBlock = await l1Client.getBlockNumber();
              const fromBlock = currentBlock > BigInt(PROVE_EVENT_SEARCH_BLOCKS) 
                ? currentBlock - BigInt(PROVE_EVENT_SEARCH_BLOCKS) 
                : 0n;
              
              // Query with indexed withdrawalHash filter for efficiency
              const logs = await withRetry(() =>
                l1Client.getLogs({
                  address: bridgeContracts.l1.optimismPortal,
                  event: WITHDRAWAL_PROVEN_EVENT,
                  args: {
                    withdrawalHash: withdrawal.withdrawalHash,
                  },
                  fromBlock,
                  toBlock: 'latest',
                })
              );
              
              if (logs.length > 0) {
                const proveBlock = await l1Client.getBlock({ blockNumber: logs[0].blockNumber });
                setProvenTimestamp(Number(proveBlock.timestamp));
                setStatus('proven');
                return;
              }
            } catch {
              // Fallback if event query fails
            }
            
            // Fallback: withdrawal is proven but we couldn't find timestamp
            setProvenTimestamp(Math.floor(Date.now() / 1000));
            setStatus('proven');
            return;
          }
        } catch {
          // numProofSubmitters might not exist, continue
        }
        
        // Not proven yet - check if L2 output actually exists on L1
        const { ready } = await canProve(blockNumber);
        if (ready) {
          setStatus('ready-to-prove');
        } else {
          setStatus('waiting-for-output');
        }
      } catch (err) {
        console.error('Status check error:', err);
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    
    checkStatus();
  }, [tx.hash, l1Client, getWithdrawalFromTx, canProve]);

  // Update status after prove success (only if we don't already have a timestamp)
  useEffect(() => {
    if (isProveSuccess && !provenTimestamp) {
      setProvenTimestamp(Math.floor(Date.now() / 1000));
      setStatus('proven');
    }
  }, [isProveSuccess, provenTimestamp]);

  // Update status after finalize success
  useEffect(() => {
    if (isFinalizeSuccess) {
      setStatus('finalized');
    }
  }, [isFinalizeSuccess]);

  // Update time remaining
  useEffect(() => {
    if (status !== 'proven' || !provenTimestamp) return;
    
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const endTime = provenTimestamp + CHALLENGE_PERIOD_SECONDS;
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining('Ready!');
        setStatus('ready-to-finalize');
      } else {
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        setTimeRemaining(`${days}d ${hours}h ${mins}m`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [status, provenTimestamp]);

  const handleProve = async () => {
    try {
      setErrorMsg('');
      await prove(tx.hash as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Prove failed');
    }
  };

  const handleFinalize = async () => {
    try {
      setErrorMsg('');
      await finalize(tx.hash as `0x${string}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Finalize failed');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'loading':
        return <span className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking...
        </span>;
      case 'waiting-for-output':
        return <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded flex items-center gap-1">
          <Clock className="h-3 w-3" /> Waiting ~1h for L2 output
        </span>;
      case 'ready-to-prove':
        return <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
          Ready to prove
        </span>;
      case 'proving':
        return <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Proving...
        </span>;
      case 'proven':
        return <span className="text-xs px-2 py-1 bg-orange-900/50 text-orange-400 rounded flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeRemaining || 'Calculating...'}
        </span>;
      case 'ready-to-finalize':
        return <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
          Ready to finalize
        </span>;
      case 'finalizing':
        return <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Finalizing...
        </span>;
      case 'finalized':
        return <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Finalized
        </span>;
      default:
        return <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Error
        </span>;
    }
  };

  const isPending = isProvePending || isFinalizePending;
  const isConfirming = isProveConfirming || isFinalizeConfirming;
  const error = proveError || finalizeError;

  return (
    <div className="p-4 bg-[#1a1a24] rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-white">{tx.amount} ETH</div>
          <div className="text-xs text-gray-500 mt-1">
            Block {tx.blockNumber.toString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          
          {(status === 'ready-to-prove' || status === 'ready-to-finalize') && (
            !isOnL1 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => switchChain({ chainId: l1Chain.id })}
                disabled={isSwitching}
              >
                {isSwitching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Switch to L1'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant={status === 'ready-to-finalize' ? 'default' : 'outline'}
                onClick={status === 'ready-to-prove' ? handleProve : handleFinalize}
                disabled={isPending || isConfirming}
              >
                {isPending || isConfirming ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {isPending ? 'Confirm...' : 'Processing...'}</>
                ) : (
                  status === 'ready-to-prove' ? 'Prove' : 'Finalize'
                )}
              </Button>
            )
          )}
          
          <a
            href={`${l2Chain.blockExplorers?.default.url}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      
      {(error || errorMsg) && (
        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
          {error?.message || errorMsg}
        </div>
      )}
    </div>
  );
}
