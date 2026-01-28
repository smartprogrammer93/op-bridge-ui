import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Hash } from 'viem';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { OPTIMISM_PORTAL_ABI } from '@/config/abis';
import { getWithdrawalFromTx, withRetry, WithdrawalTransaction } from '@/lib/withdrawal-utils';

export function useFinalizeWithdrawal() {
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Extract withdrawal data from L2 transaction - uses shared utility
  const getWithdrawalFromTxCallback = async (l2TxHash: Hash): Promise<WithdrawalTransaction | null> => {
    if (!l2Client) return null;
    const result = await getWithdrawalFromTx(l2Client, l2TxHash);
    return result?.withdrawal || null;
  };

  // Check if withdrawal is already finalized
  const isFinalized = async (withdrawalHash: `0x${string}`): Promise<boolean> => {
    if (!l1Client) return false;
    
    try {
      const result = await withRetry(() =>
        l1Client.readContract({
          address: bridgeContracts.l1.optimismPortal,
          abi: OPTIMISM_PORTAL_ABI,
          functionName: 'finalizedWithdrawals',
          args: [withdrawalHash],
        })
      );
      return result as boolean;
    } catch {
      return false;
    }
  };

  // Finalize the withdrawal
  const finalize = async (l2TxHash: Hash) => {
    const withdrawal = await getWithdrawalFromTxCallback(l2TxHash);
    
    if (!withdrawal) {
      throw new Error('Could not find withdrawal data in transaction');
    }
    
    // Check if already finalized
    const alreadyFinalized = await isFinalized(withdrawal.withdrawalHash);
    if (alreadyFinalized) {
      throw new Error('Withdrawal already finalized');
    }
    
    // Call finalizeWithdrawalTransaction
    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: OPTIMISM_PORTAL_ABI,
      functionName: 'finalizeWithdrawalTransaction',
      args: [{
        nonce: withdrawal.nonce,
        sender: withdrawal.sender,
        target: withdrawal.target,
        value: withdrawal.value,
        gasLimit: withdrawal.gasLimit,
        data: withdrawal.data,
      }],
      chainId: l1Chain.id,
    });
  };

  return {
    finalize,
    getWithdrawalFromTx: getWithdrawalFromTxCallback,
    isFinalized,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
