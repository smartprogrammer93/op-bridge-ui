import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, Address } from 'viem';
import { bridgeContracts } from '@/config/contracts';
import { L1_STANDARD_BRIDGE_ABI } from '@/config/abis';
import { DEPOSIT_GAS_LIMIT } from '@/config/constants';
import { l1Chain } from '@/config/chains';

export function useDepositETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (amount: string) => {
    writeContract({
      address: bridgeContracts.l1.l1StandardBridge,
      abi: L1_STANDARD_BRIDGE_ABI,
      functionName: 'bridgeETH',
      args: [DEPOSIT_GAS_LIMIT, '0x'],
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
      abi: L1_STANDARD_BRIDGE_ABI,
      functionName: 'bridgeERC20',
      args: [l1Token, l2Token, amount, DEPOSIT_GAS_LIMIT, '0x'],
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
