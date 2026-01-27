import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { l1Chain, l2Chain } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'OP Bridge',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [l1Chain, l2Chain],
  transports: {
    [l1Chain.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [l2Chain.id]: http('https://sepolia.optimism.io'),
  },
  ssr: true,
});
