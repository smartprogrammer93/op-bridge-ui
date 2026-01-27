import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { bridgeContracts } from '@/config/contracts';
import { l1Chain } from '@/config/chains';

// OptimismPortal ABI (minimal for finalizeWithdrawalTransaction)
const optimismPortalAbi = [
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
] as const;

export function useFinalizeWithdrawal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const finalize = async (withdrawal: {
    nonce: bigint;
    sender: `0x${string}`;
    target: `0x${string}`;
    value: bigint;
    gasLimit: bigint;
    data: `0x${string}`;
  }) => {
    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: optimismPortalAbi,
      functionName: 'finalizeWithdrawalTransaction',
      args: [withdrawal],
      chainId: l1Chain.id,
    });
  };

  return {
    finalize,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
