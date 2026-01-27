import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { l1Chain, l2Chain } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'OP Bridge',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [l1Chain, l2Chain],
  ssr: true,
});
