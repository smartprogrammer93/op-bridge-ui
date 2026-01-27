import { defineChain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// L1 Chain (use mainnet or sepolia based on environment)
export const l1Chain = sepolia; // Change to mainnet for production

// L2 Chain - Custom OP Stack chain
// TODO: Replace with your actual L2 chain configuration
export const l2Chain = defineChain({
  id: 42069, // Replace with your L2 chain ID
  name: 'Your L2 Chain',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://your-l2-rpc.example.com'],
    },
    public: {
      http: ['https://your-l2-rpc.example.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: 'https://your-explorer.example.com',
    },
  },
  contracts: {
    // OP Stack predeploys
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
});

export const chains = [l1Chain, l2Chain] as const;
