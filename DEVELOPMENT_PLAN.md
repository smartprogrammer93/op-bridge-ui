# OP Stack Bridge UI - Development Plan

## Project Overview

Build a complete, self-hosted bridge UI for an OP Stack L2 blockchain that allows users to:
- Deposit assets from L1 (Ethereum) to L2
- Withdraw assets from L2 to L1
- Track pending deposits and withdrawals
- View transaction history

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 14 (App Router) | React framework with SSR |
| Styling | Tailwind CSS + shadcn/ui | UI components |
| Web3 | wagmi v2 + viem | Wallet connection & contract interactions |
| State | TanStack Query | Server state management |
| Wallet | RainbowKit / ConnectKit | Wallet connection UI |
| Icons | Lucide React | Icon library |
| Package Manager | pnpm | Fast, disk-efficient |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages:                                                      │
│  - / (Home/Dashboard)                                        │
│  - /deposit (L1 → L2)                                        │
│  - /withdraw (L2 → L1)                                       │
│  - /transactions (History)                                   │
├─────────────────────────────────────────────────────────────┤
│  Core Components:                                            │
│  - WalletProvider (wagmi + RainbowKit)                       │
│  - BridgeForm (amount, token selection)                      │
│  - TokenSelector (supported tokens list)                     │
│  - TransactionStatus (pending/confirmed)                     │
│  - WithdrawalProver (prove & finalize)                       │
├─────────────────────────────────────────────────────────────┤
│  Hooks:                                                      │
│  - useDeposit() - L1 → L2 deposits                          │
│  - useWithdraw() - L2 → L1 withdrawals                      │
│  - useProveWithdrawal() - Prove withdrawal on L1            │
│  - useFinalizeWithdrawal() - Finalize after challenge period│
│  - useTransactionHistory() - Fetch past transactions        │
│  - useTokenBalances() - Get token balances on both chains   │
├─────────────────────────────────────────────────────────────┤
│  Config:                                                     │
│  - chains.ts (L1 & L2 chain configs)                        │
│  - contracts.ts (bridge contract addresses)                 │
│  - tokens.ts (supported token list)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OP Stack Contracts                        │
├─────────────────────────────────────────────────────────────┤
│  L1 Contracts:                                               │
│  - OptimismPortal (deposits, prove/finalize withdrawals)    │
│  - L1StandardBridge (ERC20 deposits)                        │
│  - L1CrossDomainMessenger (message passing)                 │
├─────────────────────────────────────────────────────────────┤
│  L2 Contracts (Predeploys):                                  │
│  - L2StandardBridge (0x4200...0010)                         │
│  - L2CrossDomainMessenger (0x4200...0007)                   │
│  - L2ToL1MessagePasser (0x4200...0016)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Contract Addresses (Predeploys)

### L2 Predeploy Addresses (Standard for all OP Stack chains)

```typescript
export const L2_CONTRACTS = {
  L2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
  L2StandardBridge: '0x4200000000000000000000000000000000000010',
  L2ToL1MessagePasser: '0x4200000000000000000000000000000000000016',
  GasPriceOracle: '0x420000000000000000000000000000000000000F',
} as const;
```

### L1 Addresses (Chain-specific - must be configured)

```typescript
// These addresses are deployment-specific and must be obtained from your L1 deployment
export const L1_CONTRACTS = {
  OptimismPortal: '0x...', // From deployment output
  L1StandardBridge: '0x...', // From deployment output  
  L1CrossDomainMessenger: '0x...', // From deployment output
  SystemConfig: '0x...', // From deployment output
  DisputeGameFactory: '0x...', // From deployment output (for withdrawals)
} as const;
```

---

## Development Tasks

### Phase 1: Project Setup

#### Task 1.1: Initialize Next.js Project
```bash
# Commands to execute
pnpm create next-app@latest op-bridge-ui --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd op-bridge-ui
```

#### Task 1.2: Install Dependencies
```bash
pnpm add wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
pnpm add @eth-optimism/viem
pnpm add lucide-react class-variance-authority clsx tailwind-merge
pnpm add -D @types/node @types/react
```

#### Task 1.3: Install shadcn/ui
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label select dialog tabs toast alert badge
```

#### Task 1.4: Create Project Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── deposit/
│   │   └── page.tsx
│   ├── withdraw/
│   │   └── page.tsx
│   └── transactions/
│       └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── bridge/
│   │   ├── BridgeForm.tsx
│   │   ├── DepositForm.tsx
│   │   ├── WithdrawForm.tsx
│   │   ├── TokenSelector.tsx
│   │   ├── AmountInput.tsx
│   │   ├── TransactionStatus.tsx
│   │   └── WithdrawalActions.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   └── wallet/
│       └── ConnectButton.tsx
├── config/
│   ├── chains.ts
│   ├── contracts.ts
│   ├── tokens.ts
│   └── wagmi.ts
├── hooks/
│   ├── useDeposit.ts
│   ├── useWithdraw.ts
│   ├── useProveWithdrawal.ts
│   ├── useFinalizeWithdrawal.ts
│   ├── useTokenBalance.ts
│   ├── useTransactionHistory.ts
│   └── useBridgeStatus.ts
├── lib/
│   ├── utils.ts
│   ├── formatters.ts
│   └── constants.ts
├── providers/
│   └── Web3Provider.tsx
└── types/
    └── bridge.ts
```

---

### Phase 2: Configuration

#### Task 2.1: Create Chain Configuration (`src/config/chains.ts`)

```typescript
import { defineChain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// L1 Chain (use mainnet or sepolia based on environment)
export const l1Chain = sepolia; // Change to mainnet for production

// L2 Chain - Custom OP Stack chain
export const l2Chain = defineChain({
  id: YOUR_CHAIN_ID, // Replace with your L2 chain ID
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
```

#### Task 2.2: Create Contract Configuration (`src/config/contracts.ts`)

```typescript
import { Address } from 'viem';

export interface BridgeContracts {
  l1: {
    optimismPortal: Address;
    l1StandardBridge: Address;
    l1CrossDomainMessenger: Address;
    systemConfig: Address;
    disputeGameFactory: Address;
  };
  l2: {
    l2StandardBridge: Address;
    l2CrossDomainMessenger: Address;
    l2ToL1MessagePasser: Address;
  };
}

export const bridgeContracts: BridgeContracts = {
  l1: {
    // REPLACE THESE WITH YOUR DEPLOYMENT ADDRESSES
    optimismPortal: '0x...',
    l1StandardBridge: '0x...',
    l1CrossDomainMessenger: '0x...',
    systemConfig: '0x...',
    disputeGameFactory: '0x...',
  },
  l2: {
    // These are standard predeploys (same for all OP Stack chains)
    l2StandardBridge: '0x4200000000000000000000000000000000000010',
    l2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
    l2ToL1MessagePasser: '0x4200000000000000000000000000000000000016',
  },
};
```

#### Task 2.3: Create Token Configuration (`src/config/tokens.ts`)

```typescript
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
```

#### Task 2.4: Create Wagmi Configuration (`src/config/wagmi.ts`)

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { l1Chain, l2Chain } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'OP Bridge',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [l1Chain, l2Chain],
  ssr: true,
});
```

---

### Phase 3: Core Providers

#### Task 3.1: Create Web3 Provider (`src/providers/Web3Provider.tsx`)

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/config/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

### Phase 4: Bridge Hooks

#### Task 4.1: Create Deposit Hook (`src/hooks/useDeposit.ts`)

```typescript
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
```

#### Task 4.2: Create Withdraw Hook (`src/hooks/useWithdraw.ts`)

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, Address } from 'viem';
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
```

#### Task 4.3: Create Prove Withdrawal Hook (`src/hooks/useProveWithdrawal.ts`)

```typescript
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Address, Hash } from 'viem';
import { getWithdrawals, getProveWithdrawalArgs } from '@eth-optimism/viem';
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

export function useProveWithdrawal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const prove = async (withdrawalTxHash: Hash) => {
    if (!l1Client || !l2Client) throw new Error('Clients not ready');

    // Get withdrawal message from L2 transaction
    const receipt = await l2Client.getTransactionReceipt({ hash: withdrawalTxHash });
    const withdrawals = getWithdrawals(receipt);
    
    if (withdrawals.length === 0) {
      throw new Error('No withdrawals found in transaction');
    }

    // Build prove args
    const args = await getProveWithdrawalArgs(l1Client, l2Client, {
      withdrawal: withdrawals[0],
      l2OutputOracleAddress: bridgeContracts.l1.disputeGameFactory, // or L2OutputOracle
    });

    writeContract({
      address: bridgeContracts.l1.optimismPortal,
      abi: optimismPortalAbi,
      functionName: 'proveWithdrawalTransaction',
      args: [args.withdrawal, args.l2OutputIndex, args.outputRootProof, args.withdrawalProof],
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
```

#### Task 4.4: Create Finalize Withdrawal Hook (`src/hooks/useFinalizeWithdrawal.ts`)

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Hash } from 'viem';
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
```

---

### Phase 5: UI Components

#### Task 5.1: Create Layout Components

**Header (`src/components/layout/Header.tsx`):**
```typescript
'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Navigation } from './Navigation';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            🌉 Bridge
          </Link>
          <Navigation />
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
```

**Navigation (`src/components/layout/Navigation.tsx`):**
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/deposit', label: 'Deposit' },
  { href: '/withdraw', label: 'Withdraw' },
  { href: '/transactions', label: 'Transactions' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-white',
            pathname === item.href ? 'text-white' : 'text-gray-400'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

#### Task 5.2: Create Bridge Form Components

**AmountInput (`src/components/bridge/AmountInput.tsx`):**
```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  symbol: string;
}

export function AmountInput({ value, onChange, balance, symbol }: AmountInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Amount</span>
        {balance && (
          <span className="text-gray-400">
            Balance: {balance} {symbol}
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-20 text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {balance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(balance)}
              className="h-6 px-2 text-xs"
            >
              MAX
            </Button>
          )}
          <span className="text-gray-400">{symbol}</span>
        </div>
      </div>
    </div>
  );
}
```

**TokenSelector (`src/components/bridge/TokenSelector.tsx`):**
```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supportedTokens, Token } from '@/config/tokens';

interface TokenSelectorProps {
  value: string;
  onChange: (token: Token) => void;
}

export function TokenSelector({ value, onChange }: TokenSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(symbol) => {
        const token = supportedTokens.find((t) => t.symbol === symbol);
        if (token) onChange(token);
      }}
    >
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Token" />
      </SelectTrigger>
      <SelectContent>
        {supportedTokens.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol}>
            <div className="flex items-center gap-2">
              <span>{token.symbol}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**DepositForm (`src/components/bridge/DepositForm.tsx`):**
```typescript
'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AmountInput } from './AmountInput';
import { useDepositETH } from '@/hooks/useDeposit';
import { l1Chain, l2Chain } from '@/config/chains';
import { ArrowDown, Loader2 } from 'lucide-react';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const { address, isConnected } = useAccount();
  
  const { data: balance } = useBalance({
    address,
    chainId: l1Chain.id,
  });

  const { deposit, isPending, isConfirming, isSuccess, hash, error } = useDepositETH();

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await deposit(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Deposit to L2</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* From Chain */}
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
          <div className="text-sm text-gray-400">From: {l1Chain.name}</div>
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={balance ? formatEther(balance.value) : undefined}
            symbol="ETH"
          />
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="p-2 bg-gray-800 rounded-full">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* To Chain */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="text-sm text-gray-400">To: {l2Chain.name}</div>
          <div className="text-lg mt-2">{amount || '0'} ETH</div>
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-sm">
            ✅ Deposit submitted! Tx: {hash?.slice(0, 10)}...
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
            ❌ Error: {error.message}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleDeposit}
          disabled={!isConnected || !amount || isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isPending ? 'Confirm in Wallet...' : 'Confirming...'}
            </>
          ) : (
            'Deposit'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**WithdrawForm (`src/components/bridge/WithdrawForm.tsx`):**
```typescript
'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AmountInput } from './AmountInput';
import { useWithdrawETH } from '@/hooks/useWithdraw';
import { l1Chain, l2Chain } from '@/config/chains';
import { ArrowDown, Loader2, AlertTriangle } from 'lucide-react';

export function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const { address, isConnected } = useAccount();
  
  const { data: balance } = useBalance({
    address,
    chainId: l2Chain.id,
  });

  const { withdraw, isPending, isConfirming, isSuccess, hash, error } = useWithdrawETH();

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await withdraw(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Withdraw to L1</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <Alert variant="warning" className="bg-yellow-900/20 border-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Withdrawals require a 7-day challenge period before you can claim your funds on L1.
          </AlertDescription>
        </Alert>

        {/* From Chain */}
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
          <div className="text-sm text-gray-400">From: {l2Chain.name}</div>
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={balance ? formatEther(balance.value) : undefined}
            symbol="ETH"
          />
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="p-2 bg-gray-800 rounded-full">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* To Chain */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="text-sm text-gray-400">To: {l1Chain.name}</div>
          <div className="text-lg mt-2">{amount || '0'} ETH</div>
        </div>

        {/* Status Messages */}
        {isSuccess && (
          <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-sm">
            ✅ Withdrawal initiated! Tx: {hash?.slice(0, 10)}...
            <br />
            <span className="text-xs text-gray-400">
              Come back after the challenge period to prove and finalize.
            </span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
            ❌ Error: {error.message}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleWithdraw}
          disabled={!isConnected || !amount || isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isPending ? 'Confirm in Wallet...' : 'Confirming...'}
            </>
          ) : (
            'Withdraw'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 6: Pages

#### Task 6.1: Create Root Layout (`src/app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Web3Provider } from '@/providers/Web3Provider';
import { Header } from '@/components/layout/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OP Bridge',
  description: 'Bridge assets between L1 and L2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <Web3Provider>
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
```

#### Task 6.2: Create Home Page (`src/app/page.tsx`)

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">🌉 OP Bridge</h1>
        <p className="text-gray-400 max-w-md">
          Bridge your assets between Ethereum and L2 securely.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="hover:border-blue-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Deposit
            </CardTitle>
            <CardDescription>
              Move assets from Ethereum to L2
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/deposit">
              <Button className="w-full">Start Deposit</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Withdraw
            </CardTitle>
            <CardDescription>
              Move assets from L2 to Ethereum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/withdraw">
              <Button className="w-full">Start Withdrawal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Task 6.3: Create Deposit Page (`src/app/deposit/page.tsx`)

```typescript
import { DepositForm } from '@/components/bridge/DepositForm';

export default function DepositPage() {
  return (
    <div className="py-8">
      <DepositForm />
    </div>
  );
}
```

#### Task 6.4: Create Withdraw Page (`src/app/withdraw/page.tsx`)

```typescript
import { WithdrawForm } from '@/components/bridge/WithdrawForm';

export default function WithdrawPage() {
  return (
    <div className="py-8">
      <WithdrawForm />
    </div>
  );
}
```

#### Task 6.5: Create Transactions Page (`src/app/transactions/page.tsx`)

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// This is a placeholder - in production, fetch from indexer or local storage
export default function TransactionsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            No pending withdrawals. Withdrawals you initiate will appear here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Connect your wallet to see your transaction history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Phase 7: Environment & Deployment

#### Task 7.1: Create Environment Variables (`.env.local`)

```bash
# WalletConnect Project ID (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Chain Configuration
NEXT_PUBLIC_L1_CHAIN_ID=11155111
NEXT_PUBLIC_L2_CHAIN_ID=your_l2_chain_id
NEXT_PUBLIC_L2_RPC_URL=https://your-l2-rpc.example.com

# L1 Contract Addresses (from deployment)
NEXT_PUBLIC_OPTIMISM_PORTAL=0x...
NEXT_PUBLIC_L1_STANDARD_BRIDGE=0x...
NEXT_PUBLIC_L1_CROSS_DOMAIN_MESSENGER=0x...
NEXT_PUBLIC_SYSTEM_CONFIG=0x...
NEXT_PUBLIC_DISPUTE_GAME_FACTORY=0x...
```

#### Task 7.2: Create Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

#### Task 7.3: Update next.config.mjs for Standalone

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
```

---

## Deployment Checklist

1. [ ] Configure L1 contract addresses from your OP Stack deployment
2. [ ] Get WalletConnect Project ID from cloud.walletconnect.com
3. [ ] Set up L2 RPC endpoint
4. [ ] Configure chain IDs
5. [ ] Add supported tokens to token list
6. [ ] Test deposits on testnet
7. [ ] Test withdrawals on testnet (full 7-day cycle or use devnet)
8. [ ] Deploy to hosting (Vercel, AWS, etc.)
9. [ ] Configure custom domain
10. [ ] Set up monitoring

---

## Required External Configuration

Before the bridge UI can work, you need:

1. **L1 Contract Addresses** - From your `op-deployer` output:
   - OptimismPortal
   - L1StandardBridge
   - L1CrossDomainMessenger
   - SystemConfig
   - DisputeGameFactory

2. **L2 RPC URL** - Your L2 node's RPC endpoint

3. **L2 Chain ID** - Your L2's chain ID

4. **WalletConnect Project ID** - From https://cloud.walletconnect.com

5. **Token List** - Addresses of bridged tokens (if supporting ERC20s)

---

## Estimated Development Time

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1 | Project Setup | 1-2 hours |
| Phase 2 | Configuration | 1-2 hours |
| Phase 3 | Providers | 30 mins |
| Phase 4 | Hooks | 3-4 hours |
| Phase 5 | Components | 4-6 hours |
| Phase 6 | Pages | 2-3 hours |
| Phase 7 | Deployment | 1-2 hours |
| **Total** | | **13-20 hours** |

---

## Notes for Coding Agent

1. **Execute tasks in order** - Each phase depends on the previous
2. **Test after each phase** - Ensure the app compiles before moving on
3. **Use exact code provided** - The code is designed to work together
4. **Environment variables are critical** - The app won't work without proper configuration
5. **L2 predeploy addresses are constant** - Don't change them, they're the same for all OP Stack chains
6. **L1 addresses are deployment-specific** - Must be obtained from the actual deployment
