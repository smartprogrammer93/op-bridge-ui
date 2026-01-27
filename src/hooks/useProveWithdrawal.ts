import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Hash } from 'viem';
import { bridgeContracts } from '@/config/contracts';
import { l1Chain, l2Chain } from '@/config/chains';

// OptimismPortal ABI (minimal for proveWithdrawalTransaction)
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
] as const;

export interface WithdrawalMessage {
  nonce: bigint;
  sender: `0x${string}`;
  target: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
  data: `0x${string}`;
}

export function useProveWithdrawal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Note: This is a simplified version. In production, you'd need to:
  // 1. Fetch the withdrawal message from the L2 transaction
  // 2. Wait for the L2 output to be posted to L1
  // 3. Build the proof using the OP SDK
  const prove = async (
    withdrawal: WithdrawalMessage,
    l2OutputIndex: bigint,
    outputRootProof: {
      version: `0x${string}`;
      stateRoot: `0x${string}`;
      messagePasserStorageRoot: `0x${string}`;
      latestBlockhash: `0x${string}`;
    },
    withdrawalProof: `0x${string}`[]
  ) => {
    if (!l1Client || !l2Client) throw new Error('Clients not ready');

    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: optimismPortalAbi,
      functionName: 'proveWithdrawalTransaction',
      args: [withdrawal, l2OutputIndex, outputRootProof, withdrawalProof],
      chainId: l1Chain.id,
    });
  };

  return {
    prove,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
