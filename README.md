# OP Bridge UI

A modern web interface for bridging ETH between Ethereum L1 and OP Stack L2 chains. Built with Next.js, wagmi, and viem.

![OP Bridge UI](https://img.shields.io/badge/OP%20Stack-Bridge-red?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

## Features

- **Deposit ETH** - Bridge ETH from L1 (Ethereum) to L2 (OP Stack)
- **Withdraw ETH** - Bridge ETH from L2 back to L1
- **Transaction Tracking** - View pending deposits and withdrawals
- **Withdrawal Status** - Track the 3-step withdrawal process:
  1. Initiate on L2
  2. Prove on L1 (after ~1 hour)
  3. Finalize on L1 (after 7-day challenge period)
- **Fault Proof Support** - Compatible with OP Stack's fault proof system (DisputeGameFactory)

## Supported Networks

- **L1:** Ethereum Sepolia (Testnet)
- **L2:** OP Sepolia (Testnet)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/smartprogrammer93/op-bridge-ui.git
cd op-bridge-ui

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file (optional):

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get a free project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── deposit/           # Deposit page
│   ├── withdraw/          # Withdraw page
│   └── transactions/      # Transaction history
├── components/
│   ├── bridge/            # Bridge-specific components
│   │   ├── DepositForm    # L1 → L2 deposit form
│   │   ├── WithdrawForm   # L2 → L1 withdrawal form
│   │   └── WithdrawalItem # Withdrawal status & actions
│   ├── layout/            # Layout components
│   └── ui/                # Reusable UI components
├── config/
│   ├── chains.ts          # Chain configurations
│   ├── contracts.ts       # Bridge contract addresses
│   └── wagmi.ts           # Wagmi configuration
└── hooks/
    ├── useDeposit.ts      # Deposit logic
    ├── useProveWithdrawal.ts    # Prove withdrawal (fault proofs)
    ├── useFinalizeWithdrawal.ts # Finalize withdrawal
    └── useTransactions.ts       # Transaction history
```

## How Withdrawals Work

OP Stack withdrawals require a 3-step process:

1. **Initiate** (L2) - Start the withdrawal on L2
2. **Prove** (L1) - Submit a proof after the L2 output is proposed (~1 hour)
3. **Finalize** (L1) - Claim your ETH after the 7-day challenge period

This UI handles all three steps and shows real-time status for each withdrawal.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) with App Router
- **Wallet Connection:** [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh/)
- **Ethereum:** [viem](https://viem.sh/) with OP Stack extensions
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)

## Contract Addresses (OP Sepolia)

| Contract | L1 Address |
|----------|------------|
| OptimismPortal | `0x16Fc5058F25648194471939df75CF27A2fdC48BC` |
| L1StandardBridge | `0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1` |
| DisputeGameFactory | `0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1` |

## License

MIT

## Acknowledgments

- [Optimism](https://optimism.io/) for the OP Stack
- [Superchain Registry](https://github.com/ethereum-optimism/superchain-registry) for contract addresses
