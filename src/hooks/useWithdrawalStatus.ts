import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback } from 'react';
import { Hash, TransactionReceipt } from 'viem';
import { getWithdrawals } from 'viem/op-stack';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';

export type WithdrawalStatus = 
  | 'waiting-for-proof' 
  | 'ready-to-prove' 
  | 'waiting-for-finalization'
  | 'ready-to-finalize' 
  | 'finalized'
  | 'unknown';

// OptimismPortal ABI for prove and finalize
const optimismPortalAbi = [
  {
    name: 'proveWithdrawalTransaction',
    type: 'function',
    inputs: [
      {
        name: '_tx',
        type: 'tuple',
        components: [
          { name: 'nonce', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'target', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gasLimit', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
      { name: '_l2OutputIndex', type: 'uint256' },
      {
        name: '_outputRootProof',
        type: 'tuple',
        components: [
          { name: 'version', type: 'bytes32' },
          { name: 'stateRoot', type: 'bytes32' },
          { name: 'messagePasserStorageRoot', type: 'bytes32' },
          { name: 'latestBlockhash', type: 'bytes32' },
        ],
      },
      { name: '_withdrawalProof', type: 'bytes[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'finalizeWithdrawalTransaction',
    type: 'function',
    inputs: [
      {
        name: '_tx',
        type: 'tuple',
        components: [
          { name: 'nonce', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'target', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gasLimit', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'provenWithdrawals',
    type: 'function',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'outputRoot', type: 'bytes32' },
      { name: 'timestamp', type: 'uint128' },
      { name: 'l2OutputIndex', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'finalizedWithdrawals',
    type: 'function',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

export function useWithdrawalStatus(l2TxHash?: Hash) {
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  
  const [status, setStatus] = useState<WithdrawalStatus>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawal, setWithdrawal] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!l2TxHash || !l1Client || !l2Client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the L2 transaction receipt
      const receipt = await l2Client.getTransactionReceipt({ hash: l2TxHash });
      
      // Extract withdrawal message from receipt
      const [withdrawalMsg] = getWithdrawals(receipt);
      if (!withdrawalMsg) {
        setStatus('unknown');
        return;
      }
      
      setWithdrawal(withdrawalMsg);
      
      // Check if already finalized
      // This is a simplified check - in production you'd compute the withdrawal hash
      // and check against the OptimismPortal contract
      
      // For now, set to waiting-for-proof as default for recent withdrawals
      setStatus('waiting-for-proof');
      
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to check withdrawal status:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  }, [l2TxHash, l1Client, l2Client]);

  return {
    status,
    isLoading,
    withdrawal,
    error,
    checkStatus,
  };
}

export function useProveWithdrawal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const prove = async (withdrawalTx: any, l2OutputIndex: bigint, outputRootProof: any, withdrawalProof: `0x${string}`[]) => {
    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: optimismPortalAbi,
      functionName: 'proveWithdrawalTransaction',
      args: [withdrawalTx, l2OutputIndex, outputRootProof, withdrawalProof],
      chainId: l1Chain.id,
    });
  };

  return { prove, hash, isPending, isConfirming, isSuccess, error };
}

export function useFinalizeWithdrawal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const finalize = async (withdrawalTx: any) => {
    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: optimismPortalAbi,
      functionName: 'finalizeWithdrawalTransaction',
      args: [withdrawalTx],
      chainId: l1Chain.id,
    });
  };

  return { finalize, hash, isPending, isConfirming, isSuccess, error };
}
