# OP Stack Bridge UI

A web interface for bridging ETH between Ethereum L1 and OP Stack L2 chains.

## Tech Stack

- **Next.js 16** + React 19 (App Router)
- **RainbowKit + wagmi** for wallet connection
- **viem** with OP Stack extensions
- **Tailwind CSS 4** + shadcn/ui components

## Key Features

- **Deposit** ETH from L1 (Sepolia) → L2 (OP Sepolia)
- **Withdraw** ETH from L2 → L1 (3-step process with fault proofs)
- **Track** transaction history in real-time

## Project Structure

```
src/
├── app/           # Next.js pages (deposit, withdraw, transactions)
├── components/    # UI & bridge components
├── config/        # Chain, contract, wagmi configuration
├── hooks/         # Bridge logic (useDeposit, useWithdraw, useProve...)
├── lib/           # Utilities
└── providers/     # Web3Provider wrapper
```

## Commands

```bash
pnpm install     # Install dependencies
pnpm dev         # Run dev server (localhost:3000)
pnpm build       # Production build
pnpm start       # Start production server
```

## Networks

- **L1**: Sepolia testnet
- **L2**: OP Sepolia testnet

## Key Files

- `src/config/contracts.ts` - Bridge contract addresses
- `src/config/chains.ts` - Chain definitions
- `src/hooks/useDeposit.ts` - L1→L2 deposit logic
- `src/hooks/useProveWithdrawal.ts` - Fault proof withdrawal proving
- `src/hooks/useFinalizeWithdrawal.ts` - Withdrawal finalization
- `src/components/bridge/WithdrawalItem.tsx` - Withdrawal status & actions

## Withdrawal Flow (Fault Proofs)

1. **Initiate** on L2 - User starts withdrawal
2. **Wait ~1hr** - DisputeGameFactory creates game covering the L2 block
3. **Prove** on L1 - Submit proof with dispute game index
4. **Wait 7 days** - Challenge period
5. **Finalize** on L1 - Claim ETH
