import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Hash, decodeEventLog, parseAbi } from 'viem';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';

// L2ToL1MessagePasser MessagePassed event
const messagePassedAbi = parseAbi([
  'event MessagePassed(uint256 indexed nonce, address indexed sender, address indexed target, uint256 value, uint256 gasLimit, bytes data, bytes32 withdrawalHash)'
]);

// OptimismPortal ABI for finalize
const optimismPortalAbi = parseAbi([
  'function finalizeWithdrawalTransaction((uint256 nonce, address sender, address target, uint256 value, uint256 gasLimit, bytes data) _tx) external',
  'function finalizedWithdrawals(bytes32) view returns (bool)',
]);

export interface WithdrawalTransaction {
  nonce: bigint;
  sender: `0x${string}`;
  target: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
  data: `0x${string}`;
  withdrawalHash: `0x${string}`;
}

export function useFinalizeWithdrawal() {
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Extract withdrawal data from L2 transaction
  const getWithdrawalFromTx = async (l2TxHash: Hash): Promise<WithdrawalTransaction | null> => {
    if (!l2Client) return null;
    
    try {
      const receipt = await l2Client.getTransactionReceipt({ hash: l2TxHash });
      
      // Find the MessagePassed event from L2ToL1MessagePasser
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === bridgeContracts.l2.l2ToL1MessagePasser.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: messagePassedAbi,
              data: log.data,
              topics: log.topics,
            });
            
            if (decoded.eventName === 'MessagePassed') {
              return {
                nonce: decoded.args.nonce,
                sender: decoded.args.sender,
                target: decoded.args.target,
                value: decoded.args.value,
                gasLimit: decoded.args.gasLimit,
                data: decoded.args.data as `0x${string}`,
                withdrawalHash: decoded.args.withdrawalHash,
              };
            }
          } catch {
            // Not the right event, continue
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('Failed to get withdrawal from tx:', err);
      return null;
    }
  };

  // Check if withdrawal is already finalized
  const isFinalized = async (withdrawalHash: `0x${string}`): Promise<boolean> => {
    if (!l1Client) return false;
    
    try {
      const result = await l1Client.readContract({
        address: bridgeContracts.l1.optimismPortal,
        abi: optimismPortalAbi,
        functionName: 'finalizedWithdrawals',
        args: [withdrawalHash],
      });
      return result as boolean;
    } catch {
      return false;
    }
  };

  // Finalize the withdrawal
  const finalize = async (l2TxHash: Hash) => {
    const withdrawal = await getWithdrawalFromTx(l2TxHash);
    
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
      abi: optimismPortalAbi,
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
    getWithdrawalFromTx,
    isFinalized,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
