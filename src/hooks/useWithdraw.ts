import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { bridgeContracts } from '@/config/contracts';
import { l2Chain } from '@/config/chains';

// L2StandardBridge ABI (minimal)
const l2StandardBridgeAbi = [
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: '_l2Token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

const ETH_ADDRESS = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000';

export function useWithdrawETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = async (amount: string) => {
    writeContract({
      address: bridgeContracts.l2.l2StandardBridge,
      abi: l2StandardBridgeAbi,
      functionName: 'withdraw',
      args: [ETH_ADDRESS, parseEther(amount), 200000, '0x'],
      value: parseEther(amount),
      chainId: l2Chain.id,
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
