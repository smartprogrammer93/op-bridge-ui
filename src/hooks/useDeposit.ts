import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, Address } from 'viem';
import { bridgeContracts } from '@/config/contracts';
import { l1Chain } from '@/config/chains';

// L1StandardBridge ABI (minimal)
const l1StandardBridgeAbi = [
  {
    name: 'depositETH',
    type: 'function',
    inputs: [
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'depositERC20',
    type: 'function',
    inputs: [
      { name: '_l1Token', type: 'address' },
      { name: '_l2Token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export function useDepositETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (amount: string) => {
    writeContract({
      address: bridgeContracts.l1.l1StandardBridge,
      abi: l1StandardBridgeAbi,
      functionName: 'depositETH',
      args: [200000, '0x'], // minGasLimit, extraData
      value: parseEther(amount),
      chainId: l1Chain.id,
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useDepositERC20() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (
    l1Token: Address,
    l2Token: Address,
    amount: bigint
  ) => {
    writeContract({
      address: bridgeContracts.l1.l1StandardBridge,
      abi: l1StandardBridgeAbi,
      functionName: 'depositERC20',
      args: [l1Token, l2Token, amount, 200000, '0x'],
      chainId: l1Chain.id,
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
