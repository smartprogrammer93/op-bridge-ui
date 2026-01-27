'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useAccount, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { BridgeTransaction } from '@/hooks/useTransactions';
import { useFinalizeWithdrawal } from '@/hooks/useFinalizeWithdrawal';
import { useProveWithdrawal } from '@/hooks/useProveWithdrawal';

interface WithdrawalItemProps {
  tx: BridgeTransaction;
}

type Status = 'loading' | 'waiting-for-output' | 'ready-to-prove' | 'proving' | 'proven' | 'ready-to-finalize' | 'finalizing' | 'finalized' | 'error';

const CHALLENGE_PERIOD = 7 * 24 * 60 * 60; // 7 days

// OptimismPortal2 (fault proofs) uses different signature
const optimismPortalAbi = [
  {
    name: 'provenWithdrawals',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_withdrawalHash', type: 'bytes32' },
      { name: '_proofSubmitter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }], // Returns disputeGameProxy
  },
  {
    name: 'finalizedWithdrawals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'numProofSubmitters',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_withdrawalHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// WithdrawalProven event for getting prove timestamp
const withdrawalProvenEvent = {
  type: 'event',
  name: 'WithdrawalProven',
  inputs: [
    { name: 'withdrawalHash', type: 'bytes32', indexed: true },
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
  ],
} as const;

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
          const finalized = await l1Client.readContract({
            address: bridgeContracts.l1.optimismPortal,
            abi: optimismPortalAbi,
            functionName: 'finalizedWithdrawals',
            args: [withdrawal.withdrawalHash],
          });
          
          if (finalized) {
            setStatus('finalized');
            return;
          }
        } catch {
          // Continue checking
        }
        
        // Check if proven (fault proof portal uses numProofSubmitters)
        try {
          const numSubmitters = await l1Client.readContract({
            address: bridgeContracts.l1.optimismPortal,
            abi: optimismPortalAbi,
            functionName: 'numProofSubmitters',
            args: [withdrawal.withdrawalHash],
          }) as bigint;
          
          if (numSubmitters > 0) {
            // Get the actual prove timestamp from WithdrawalProven event
            try {
              // Get current block to limit search range
              const currentBlock = await l1Client.getBlockNumber();
              // Search last ~50000 blocks (~1 week on Sepolia)
              const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;
              
              // Query without args filter, then filter manually (more reliable)
              const allLogs = await l1Client.getLogs({
                address: bridgeContracts.l1.optimismPortal,
                event: withdrawalProvenEvent,
                fromBlock,
                toBlock: 'latest',
              });
              
              // Find the log for our withdrawal hash
              const matchingLog = allLogs.find(log => 
                log.args.withdrawalHash?.toLowerCase() === withdrawal.withdrawalHash.toLowerCase()
              );
              
              if (matchingLog) {
                // Get the block timestamp
                const proveBlock = await l1Client.getBlock({ blockNumber: matchingLog.blockNumber });
                console.log('Found prove event at block', matchingLog.blockNumber, 'timestamp', proveBlock.timestamp);
                setProvenTimestamp(Number(proveBlock.timestamp));
                setStatus('proven');
                return;
              } else {
                console.log('No matching prove event found for', withdrawal.withdrawalHash, 'in', allLogs.length, 'logs');
              }
            } catch (e) {
              console.error('Failed to get prove event:', e);
            }
            
            // Fallback: withdrawal is proven but we couldn't find timestamp
            // Use current time (will show ~7 days)
            console.log('Using fallback timestamp for proven withdrawal');
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
      const endTime = provenTimestamp + CHALLENGE_PERIOD;
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
