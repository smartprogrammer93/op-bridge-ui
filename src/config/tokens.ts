import { Address } from 'viem';

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  l1Address: Address | null; // null for native ETH
  l2Address: Address | null; // null for native ETH
}

export const supportedTokens: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    l1Address: null,
    l2Address: null,
  },
  // Add ERC20 tokens here
  // {
  //   symbol: 'USDC',
  //   name: 'USD Coin',
  //   decimals: 6,
  //   logoURI: '/tokens/usdc.svg',
  //   l1Address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //   l2Address: '0x...', // L2 bridged USDC address
  // },
];
