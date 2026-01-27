import { defineChain } from 'viem';
import { sepolia } from 'viem/chains';

// L1 Chain - Sepolia Testnet
export const l1Chain = sepolia;

// L2 Chain - OP Sepolia
export const l2Chain = defineChain({
  id: 11155420,
  name: 'OP Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.optimism.io'],
    },
    public: {
      http: ['https://sepolia.optimism.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://sepolia-optimism.etherscan.io',
    },
  },
  contracts: {
    // OP Stack predeploys (same for all OP Stack chains)
    l2CrossDomainMessenger: {
      address: '0x4200000000000000000000000000000000000007',
    },
    l2StandardBridge: {
      address: '0x4200000000000000000000000000000000000010',
    },
    l2ToL1MessagePasser: {
      address: '0x4200000000000000000000000000000000000016',
    },
  },
  testnet: true,
});

export const chains = [l1Chain, l2Chain] as const;
